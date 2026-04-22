package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"

	"github.com/ignatzorin/freelance-backend/internal/models"
)

// OrderRepository отвечает за работу с заказами и откликами.
type OrderRepository struct {
	db *sqlx.DB
}

// Ошибки уровня репозитория.
var (
	ErrOrderNotFound        = errors.New("order not found")
	ErrProposalNotFound     = errors.New("proposal not found")
	ErrConversationNotFound = errors.New("conversation not found")
)

// NewOrderRepository создаёт новый экземпляр.
func NewOrderRepository(db *sqlx.DB) *OrderRepository {
	return &OrderRepository{db: db}
}

// GetByID возвращает заказ по идентификатору.
func (r *OrderRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Order, error) {
	var order models.Order
	query := `
		SELECT id, client_id, freelancer_id, category_id, title, description, budget_min, budget_max, final_amount, status, deadline_at, ai_summary,
		       best_recommendation_proposal_id, best_recommendation_justification, ai_analysis_updated_at,
		       created_at, updated_at
		FROM orders
		WHERE id = $1
	`
	if err := r.db.GetContext(ctx, &order, query, id); err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrOrderNotFound
		}
		return nil, fmt.Errorf("order repository: get by id %w", err)
	}
	return &order, nil
}

// GetByIDWithDetails возвращает заказ со всеми связанными данными (требования и вложения) одним запросом.
// Оптимизированная версия для избежания N+1 проблем.
func (r *OrderRepository) GetByIDWithDetails(ctx context.Context, id uuid.UUID) (*models.Order, []models.OrderRequirement, []models.OrderAttachment, error) {
	var order models.Order
	orderQuery := `
		SELECT id, client_id, freelancer_id, category_id, title, description, budget_min, budget_max, final_amount, status, deadline_at, ai_summary,
		       best_recommendation_proposal_id, best_recommendation_justification, ai_analysis_updated_at,
		       created_at, updated_at
		FROM orders
		WHERE id = $1
	`
	if err := r.db.GetContext(ctx, &order, orderQuery, id); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil, nil, ErrOrderNotFound
		}
		return nil, nil, nil, fmt.Errorf("order repository: get by id %w", err)
	}

	// Загружаем требования и вложения параллельно (или последовательно, но одним запросом каждый)
	var requirements []models.OrderRequirement
	reqQuery := `SELECT id, order_id, skill, level FROM order_requirements WHERE order_id = $1 ORDER BY skill`
	if err := r.db.SelectContext(ctx, &requirements, reqQuery, id); err != nil {
		return nil, nil, nil, fmt.Errorf("order repository: get requirements %w", err)
	}

	// Загружаем вложения с JOIN для получения информации о медиа
	var attachments []models.OrderAttachment
	query := `
		SELECT
			oa.id,
			oa.order_id,
			oa.media_id,
			oa.created_at,
			mf.id,
			mf.user_id,
			mf.file_path,
			mf.file_type,
			mf.file_size,
			mf.is_public,
			mf.created_at
		FROM order_attachments oa
		JOIN media_files mf ON mf.id = oa.media_id
		WHERE oa.order_id = $1
		ORDER BY oa.created_at
	`

	rows, err := r.db.QueryxContext(ctx, query, id)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("order repository: get attachments %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var attachment models.OrderAttachment
		var media models.MediaFile
		var mediaUserID *uuid.UUID

		if err := rows.Scan(
			&attachment.ID,
			&attachment.OrderID,
			&attachment.MediaID,
			&attachment.CreatedAt,
			&media.ID,
			&mediaUserID,
			&media.FilePath,
			&media.FileType,
			&media.FileSize,
			&media.IsPublic,
			&media.CreatedAt,
		); err != nil {
			return nil, nil, nil, fmt.Errorf("order repository: scan attachment %w", err)
		}

		media.UserID = mediaUserID
		attachment.Media = &media
		attachments = append(attachments, attachment)
	}

	return &order, requirements, attachments, nil
}

// Create сохраняет заказ и связанные требования/вложения в одной транзакции.
func (r *OrderRepository) Create(ctx context.Context, order *models.Order, requirements []models.OrderRequirement, attachmentIDs []uuid.UUID) error {
	tx, err := r.db.BeginTxx(ctx, &sql.TxOptions{})
	if err != nil {
		return fmt.Errorf("order repository: begin tx %w", err)
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	query := `
		INSERT INTO orders (client_id, category_id, title, description, budget_min, budget_max, status, deadline_at, ai_summary)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at
	`

	if err = tx.QueryRowxContext(
		ctx,
		query,
		order.ClientID,
		order.CategoryID,
		order.Title,
		order.Description,
		order.BudgetMin,
		order.BudgetMax,
		order.Status,
		order.DeadlineAt,
		order.AISummary,
	).Scan(&order.ID, &order.CreatedAt, &order.UpdatedAt); err != nil {
		return fmt.Errorf("order repository: insert order %w", err)
	}

	if len(requirements) > 0 {
		// Batch INSERT для requirements (устранение N+1)
		reqQuery := `INSERT INTO order_requirements (order_id, skill, level) VALUES `
		reqValues := make([]interface{}, 0, len(requirements)*3)

		for i, req := range requirements {
			if i > 0 {
				reqQuery += ", "
			}
			reqQuery += fmt.Sprintf("($%d, $%d, $%d)", i*3+1, i*3+2, i*3+3)
			reqValues = append(reqValues, order.ID, req.Skill, req.Level)
		}

		if _, err = tx.ExecContext(ctx, reqQuery, reqValues...); err != nil {
			return fmt.Errorf("order repository: batch insert requirements %w", err)
		}
	}

	if len(attachmentIDs) > 0 {
		// Batch INSERT для attachments (устранение N+1)
		attQuery := `INSERT INTO order_attachments (order_id, media_id) VALUES `
		attValues := make([]interface{}, 0, len(attachmentIDs)*2)

		for i, mediaID := range attachmentIDs {
			if i > 0 {
				attQuery += ", "
			}
			attQuery += fmt.Sprintf("($%d, $%d)", i*2+1, i*2+2)
			attValues = append(attValues, order.ID, mediaID)
		}
		attQuery += " ON CONFLICT DO NOTHING"

		if _, err = tx.ExecContext(ctx, attQuery, attValues...); err != nil {
			return fmt.Errorf("order repository: batch insert attachments %w", err)
		}
	}

	if err = tx.Commit(); err != nil {
		return fmt.Errorf("order repository: commit %w", err)
	}

	return nil
}

// Update изменяет заказ и его требования/вложения.
func (r *OrderRepository) Update(ctx context.Context, order *models.Order, requirements []models.OrderRequirement, attachmentIDs []uuid.UUID) error {
	tx, err := r.db.BeginTxx(ctx, &sql.TxOptions{})
	if err != nil {
		return fmt.Errorf("order repository: begin tx %w", err)
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	query := `
		UPDATE orders
		SET category_id = $1,
		    title = $2,
		    description = $3,
		    budget_min = $4,
		    budget_max = $5,
		    status = $6::order_status,
		    deadline_at = $7,
		    ai_summary = $8,
		    freelancer_id = $9,
		    updated_at = NOW()
		WHERE id = $10 AND client_id = $11
		RETURNING updated_at
	`

	var updatedAt time.Time
	err = tx.QueryRowxContext(
		ctx,
		query,
		order.CategoryID,
		order.Title,
		order.Description,
		order.BudgetMin,
		order.BudgetMax,
		order.Status,
		order.DeadlineAt,
		order.AISummary,
		order.FreelancerID,
		order.ID,
		order.ClientID,
	).Scan(&updatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrOrderNotFound
		}
		return fmt.Errorf("order repository: update order %w", err)
	}
	order.UpdatedAt = updatedAt

	if _, err = tx.ExecContext(ctx, `DELETE FROM order_requirements WHERE order_id = $1`, order.ID); err != nil {
		return fmt.Errorf("order repository: clear requirements %w", err)
	}

	if len(requirements) > 0 {
		// Batch INSERT для requirements (устранение N+1)
		reqQuery := `INSERT INTO order_requirements (order_id, skill, level) VALUES `
		reqValues := make([]interface{}, 0, len(requirements)*3)

		for i, req := range requirements {
			if i > 0 {
				reqQuery += ", "
			}
			reqQuery += fmt.Sprintf("($%d, $%d, $%d)", i*3+1, i*3+2, i*3+3)
			reqValues = append(reqValues, order.ID, req.Skill, req.Level)
		}

		if _, err = tx.ExecContext(ctx, reqQuery, reqValues...); err != nil {
			return fmt.Errorf("order repository: batch insert requirements %w", err)
		}
	}

	if _, err = tx.ExecContext(ctx, `DELETE FROM order_attachments WHERE order_id = $1`, order.ID); err != nil {
		return fmt.Errorf("order repository: clear attachments %w", err)
	}

	if len(attachmentIDs) > 0 {
		// Batch INSERT для attachments (устранение N+1)
		attQuery := `INSERT INTO order_attachments (order_id, media_id) VALUES `
		attValues := make([]interface{}, 0, len(attachmentIDs)*2)

		for i, mediaID := range attachmentIDs {
			if i > 0 {
				attQuery += ", "
			}
			attQuery += fmt.Sprintf("($%d, $%d)", i*2+1, i*2+2)
			attValues = append(attValues, order.ID, mediaID)
		}
		attQuery += " ON CONFLICT DO NOTHING"

		if _, err = tx.ExecContext(ctx, attQuery, attValues...); err != nil {
			return fmt.Errorf("order repository: batch insert attachments %w", err)
		}
	}

	if err = tx.Commit(); err != nil {
		return fmt.Errorf("order repository: commit %w", err)
	}

	return nil
}

// ListFilterParams содержит параметры фильтрации и поиска заказов.
type ListFilterParams struct {
	Status       string
	Search       string
	Skills       []string
	BudgetMin    *float64
	BudgetMax    *float64
	MinProposals *int
	MaxProposals *int
	SortBy       string // "date", "budget", "proposals"
	SortOrder    string // "asc", "desc"
	Limit        int
	Offset       int
}

// ListResult содержит список заказов и метаданные пагинации.
type ListResult struct {
	Orders  []models.Order
	Total   int
	Limit   int
	Offset  int
	HasMore bool
}

// List возвращает список заказов с пагинацией, фильтрацией и поиском.
func (r *OrderRepository) List(ctx context.Context, params ListFilterParams) (*ListResult, error) {
	// Базовый запрос для подсчёта общего количества
	countQuery := `
		SELECT COUNT(DISTINCT o.id)
		FROM orders o
		LEFT JOIN order_requirements or_req ON o.id = or_req.order_id
		WHERE 1=1
	`

	// Запрос для получения данных с подсчетом предложений
	query := `
		SELECT DISTINCT o.*,
			COALESCE(proposal_counts.count, 0) as proposals_count
		FROM orders o
		LEFT JOIN order_requirements or_req ON o.id = or_req.order_id
		LEFT JOIN (
			SELECT order_id, COUNT(*) as count
			FROM proposals
			GROUP BY order_id
		) proposal_counts ON o.id = proposal_counts.order_id
		WHERE 1=1
	`
	args := []interface{}{}
	argIndex := 1

	// Применяем фильтры к обоим запросам
	// Фильтр: показываем только заказы, где исполнитель еще не определен
	// (не in_progress, не completed, и нет accepted proposals)
	excludeClause := `
		AND o.status NOT IN ('in_progress', 'completed')
		AND NOT EXISTS (
			SELECT 1 FROM proposals p 
			WHERE p.order_id = o.id AND p.status = 'accepted'
		)
	`
	query += excludeClause
	countQuery += excludeClause

	// Фильтр по статусу
	if params.Status != "" {
		clause := fmt.Sprintf(" AND o.status = $%d::order_status", argIndex)
		query += clause
		countQuery += clause
		args = append(args, params.Status)
		argIndex++
	}

	// Поиск по тексту
	if params.Search != "" {
		clause := fmt.Sprintf(" AND (o.title ILIKE $%d OR o.description ILIKE $%d)", argIndex, argIndex)
		query += clause
		countQuery += clause
		args = append(args, "%"+params.Search+"%")
		argIndex++
	}

	// Фильтр по навыкам
	if len(params.Skills) > 0 {
		clause := fmt.Sprintf(" AND or_req.skill = ANY($%d)", argIndex)
		query += clause
		countQuery += clause
		args = append(args, pq.Array(params.Skills))
		argIndex++
	}

	// Фильтр по бюджету
	if params.BudgetMin != nil {
		clause := fmt.Sprintf(" AND (o.budget_max IS NULL OR o.budget_max >= $%d)", argIndex)
		query += clause
		countQuery += clause
		args = append(args, *params.BudgetMin)
		argIndex++
	}
	if params.BudgetMax != nil {
		clause := fmt.Sprintf(" AND (o.budget_min IS NULL OR o.budget_min <= $%d)", argIndex)
		query += clause
		countQuery += clause
		args = append(args, *params.BudgetMax)
		argIndex++
	}
	if params.MinProposals != nil {
		clause := fmt.Sprintf(` AND COALESCE((
			SELECT COUNT(*) FROM proposals p WHERE p.order_id = o.id
		), 0) >= $%d`, argIndex)
		query += clause
		countQuery += clause
		args = append(args, *params.MinProposals)
		argIndex++
	}
	if params.MaxProposals != nil {
		clause := fmt.Sprintf(` AND COALESCE((
			SELECT COUNT(*) FROM proposals p WHERE p.order_id = o.id
		), 0) <= $%d`, argIndex)
		query += clause
		countQuery += clause
		args = append(args, *params.MaxProposals)
		argIndex++
	}

	// Сортировка
	sortBy := params.SortBy
	if sortBy == "" {
		sortBy = "date"
	}
	sortOrder := params.SortOrder
	if sortOrder == "" {
		sortOrder = "desc"
	}

	switch sortBy {
	case "budget":
		query += fmt.Sprintf(" ORDER BY COALESCE(o.budget_min, o.budget_max, 0) %s", sortOrder)
	case "proposals", "proposals_count":
		query += `
			ORDER BY (
				SELECT COUNT(*) FROM proposals p WHERE p.order_id = o.id
			) ` + sortOrder
	default: // "date"
		query += fmt.Sprintf(" ORDER BY o.created_at %s", sortOrder)
	}

	// Подсчитываем общее количество
	var total int
	if err := r.db.GetContext(ctx, &total, countQuery, args...); err != nil {
		return nil, fmt.Errorf("order repository: count %w", err)
	}

	// Пагинация
	limit := params.Limit
	if limit <= 0 {
		limit = 20
	}
	offset := params.Offset
	if offset < 0 {
		offset = 0
	}

	query += fmt.Sprintf(" LIMIT $%d", argIndex)
	args = append(args, limit)
	argIndex++
	query += fmt.Sprintf(" OFFSET $%d", argIndex)
	args = append(args, offset)
	argIndex++

	// Используем структуру для маппинга с proposals_count
	type OrderWithCount struct {
		models.Order
		ProposalsCount *int `db:"proposals_count"`
	}

	var ordersWithCount []OrderWithCount
	if err := r.db.SelectContext(ctx, &ordersWithCount, query, args...); err != nil {
		return nil, fmt.Errorf("order repository: list %w", err)
	}

	// Преобразуем обратно в models.Order
	orders := make([]models.Order, len(ordersWithCount))
	for i, oc := range ordersWithCount {
		orders[i] = oc.Order
		orders[i].ProposalsCount = oc.ProposalsCount
	}

	hasMore := offset+limit < total

	return &ListResult{
		Orders:  orders,
		Total:   total,
		Limit:   limit,
		Offset:  offset,
		HasMore: hasMore,
	}, nil
}

// CreateProposal добавляет отклик и возвращает его идентификатор.
func (r *OrderRepository) ListAttachments(ctx context.Context, orderID uuid.UUID) ([]models.OrderAttachment, error) {
	query := `
		SELECT
			oa.id,
			oa.order_id,
			oa.media_id,
			oa.created_at,
			mf.id,
			mf.user_id,
			mf.file_path,
			mf.file_type,
			mf.file_size,
			mf.is_public,
			mf.created_at
		FROM order_attachments oa
		JOIN media_files mf ON mf.id = oa.media_id
		WHERE oa.order_id = $1
		ORDER BY oa.created_at
	`

	rows, err := r.db.QueryxContext(ctx, query, orderID)
	if err != nil {
		return nil, fmt.Errorf("order repository: list attachments %w", err)
	}
	defer rows.Close()

	var attachments []models.OrderAttachment

	for rows.Next() {
		var attachment models.OrderAttachment
		var media models.MediaFile
		var mediaUserID *uuid.UUID

		if err := rows.Scan(
			&attachment.ID,
			&attachment.OrderID,
			&attachment.MediaID,
			&attachment.CreatedAt,
			&media.ID,
			&mediaUserID,
			&media.FilePath,
			&media.FileType,
			&media.FileSize,
			&media.IsPublic,
			&media.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("order repository: scan attachment %w", err)
		}

		media.UserID = mediaUserID
		attachment.Media = &media
		attachments = append(attachments, attachment)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("order repository: attachments rows %w", err)
	}

	return attachments, nil
}

// GetUserOrderStats возвращает статистику заказов пользователя.
