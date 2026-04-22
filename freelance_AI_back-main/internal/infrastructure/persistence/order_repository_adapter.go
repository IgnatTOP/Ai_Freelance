package persistence

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
	"github.com/ignatzorin/freelance-backend/internal/domain/valueobject"
	"github.com/ignatzorin/freelance-backend/internal/pkg/apperror"
	oldRepo "github.com/ignatzorin/freelance-backend/internal/repository"
	"github.com/jmoiron/sqlx"
)

type OrderRepositoryAdapter struct {
	db      *sqlx.DB
	oldRepo *oldRepo.OrderRepository
}

func NewOrderRepositoryAdapter(db *sqlx.DB) *OrderRepositoryAdapter {
	return &OrderRepositoryAdapter{
		db:      db,
		oldRepo: oldRepo.NewOrderRepository(db),
	}
}

func (r *OrderRepositoryAdapter) Create(ctx context.Context, order *entity.Order) error {
	query := `
		INSERT INTO orders (id, client_id, category_id, title, description, budget_min, budget_max, status, deadline_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`

	_, err := r.db.ExecContext(ctx, query,
		order.ID,
		order.ClientID,
		order.CategoryID,
		order.Title,
		order.Description,
		order.Budget.Min.Amount,
		order.Budget.Max.Amount,
		string(order.Status),
		order.DeadlineAt,
		order.CreatedAt,
		order.UpdatedAt,
	)
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "не удалось создать заказ")
	}

	for _, req := range order.Requirements {
		if err := r.CreateRequirement(ctx, &req); err != nil {
			return err
		}
	}

	for _, att := range order.Attachments {
		if err := r.CreateAttachment(ctx, &att); err != nil {
			return err
		}
	}

	return nil
}

func (r *OrderRepositoryAdapter) Update(ctx context.Context, order *entity.Order) error {
	query := `
		UPDATE orders 
		SET category_id = $2, title = $3, description = $4, budget_min = $5, budget_max = $6, 
		    status = $7, deadline_at = $8, ai_summary = $9, 
		    best_recommendation_proposal_id = $10, best_recommendation_justification = $11,
		    ai_analysis_updated_at = $12, freelancer_id = $13, updated_at = $14
		WHERE id = $1
	`

	_, err := r.db.ExecContext(ctx, query,
		order.ID,
		order.CategoryID,
		order.Title,
		order.Description,
		order.Budget.Min.Amount,
		order.Budget.Max.Amount,
		string(order.Status),
		order.DeadlineAt,
		order.AISummary,
		order.BestRecommendationProposalID,
		order.BestRecommendationJustification,
		order.AIAnalysisUpdatedAt,
		order.FreelancerID,
		order.UpdatedAt,
	)
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "не удалось обновить заказ")
	}

	return nil
}

func (r *OrderRepositoryAdapter) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM orders WHERE id = $1`
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "не удалось удалить заказ")
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "не удалось проверить результат удаления")
	}

	if rows == 0 {
		return apperror.ErrOrderNotFound
	}

	return nil
}

func (r *OrderRepositoryAdapter) FindByID(ctx context.Context, id uuid.UUID) (*entity.Order, error) {
	var order entity.Order
	var budgetMin, budgetMax float64
	var status string
	var categorySlug, categoryName sql.NullString
	var categoryIcon sql.NullString

	query := `
		SELECT o.id, o.client_id, o.freelancer_id, o.category_id,
		       c.slug, c.name, c.icon,
		       o.title, o.description, o.budget_min, o.budget_max, o.status, o.deadline_at, 
		       o.ai_summary, o.best_recommendation_proposal_id, o.best_recommendation_justification, 
		       o.ai_analysis_updated_at, o.created_at, o.updated_at
		FROM orders o
		LEFT JOIN categories c ON c.id = o.category_id
		WHERE o.id = $1
	`

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&order.ID,
		&order.ClientID,
		&order.FreelancerID,
		&order.CategoryID,
		&categorySlug,
		&categoryName,
		&categoryIcon,
		&order.Title,
		&order.Description,
		&budgetMin,
		&budgetMax,
		&status,
		&order.DeadlineAt,
		&order.AISummary,
		&order.BestRecommendationProposalID,
		&order.BestRecommendationJustification,
		&order.AIAnalysisUpdatedAt,
		&order.CreatedAt,
		&order.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, apperror.ErrOrderNotFound
	}
	if err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "не удалось получить заказ")
	}

	budget, _ := valueobject.NewBudget(budgetMin, budgetMax)
	order.Budget = budget

	orderStatus, _ := valueobject.NewOrderStatus(status)
	order.Status = orderStatus

	if order.CategoryID != nil && categorySlug.Valid && categoryName.Valid {
		var iconPtr *string
		if categoryIcon.Valid {
			icon := categoryIcon.String
			iconPtr = &icon
		}
		order.Category = &entity.CategoryRef{
			ID:   *order.CategoryID,
			Slug: categorySlug.String,
			Name: categoryName.String,
			Icon: iconPtr,
		}
	}

	return &order, nil
}

func (r *OrderRepositoryAdapter) FindByIDWithDetails(ctx context.Context, id uuid.UUID) (*entity.Order, error) {
	order, err := r.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	requirements, err := r.FindRequirements(ctx, id)
	if err != nil {
		return nil, err
	}
	order.Requirements = requirements

	attachments, err := r.FindAttachments(ctx, id)
	if err != nil {
		return nil, err
	}
	order.Attachments = attachments

	return order, nil
}

func (r *OrderRepositoryAdapter) FindByClientID(ctx context.Context, clientID uuid.UUID) ([]*entity.Order, error) {
	query := `
		SELECT o.id, o.client_id, o.freelancer_id, o.category_id,
		       c.slug, c.name, c.icon,
		       o.title, o.description, o.budget_min, o.budget_max, o.status, o.deadline_at, 
		       o.ai_summary, o.best_recommendation_proposal_id, o.best_recommendation_justification, 
		       o.ai_analysis_updated_at, o.created_at, o.updated_at,
		       COALESCE(pc.proposals_count, 0) AS proposals_count
		FROM orders o
		LEFT JOIN categories c ON c.id = o.category_id
		LEFT JOIN (
			SELECT order_id, COUNT(*)::int AS proposals_count
			FROM proposals
			GROUP BY order_id
		) pc ON pc.order_id = o.id
		WHERE o.client_id = $1
		ORDER BY o.created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, clientID)
	if err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "не удалось получить заказы")
	}
	defer rows.Close()

	var orders []*entity.Order
	for rows.Next() {
		var order entity.Order
		var budgetMin, budgetMax float64
		var status string
		var categorySlug, categoryName sql.NullString
		var categoryIcon sql.NullString
		var proposalsCount sql.NullInt64

		err := rows.Scan(
			&order.ID,
			&order.ClientID,
			&order.FreelancerID,
			&order.CategoryID,
			&categorySlug,
			&categoryName,
			&categoryIcon,
			&order.Title,
			&order.Description,
			&budgetMin,
			&budgetMax,
			&status,
			&order.DeadlineAt,
			&order.AISummary,
			&order.BestRecommendationProposalID,
			&order.BestRecommendationJustification,
			&order.AIAnalysisUpdatedAt,
			&order.CreatedAt,
			&order.UpdatedAt,
			&proposalsCount,
		)
		if err != nil {
			return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "не удалось прочитать заказ")
		}

		budget, _ := valueobject.NewBudget(budgetMin, budgetMax)
		order.Budget = budget

		orderStatus, _ := valueobject.NewOrderStatus(status)
		order.Status = orderStatus

		if order.CategoryID != nil && categorySlug.Valid && categoryName.Valid {
			var iconPtr *string
			if categoryIcon.Valid {
				icon := categoryIcon.String
				iconPtr = &icon
			}
			order.Category = &entity.CategoryRef{
				ID:   *order.CategoryID,
				Slug: categorySlug.String,
				Name: categoryName.String,
				Icon: iconPtr,
			}
		}
		if proposalsCount.Valid {
			count := int(proposalsCount.Int64)
			order.ProposalsCount = &count
		}

		orders = append(orders, &order)
	}

	return orders, nil
}

func (r *OrderRepositoryAdapter) List(ctx context.Context, filter repository.OrderFilter) ([]*entity.Order, int, error) {
	baseQuery := `
		FROM orders o
		LEFT JOIN categories c ON c.id = o.category_id
		LEFT JOIN (
			SELECT order_id, COUNT(*)::int AS proposals_count
			FROM proposals
			GROUP BY order_id
		) pc ON pc.order_id = o.id
		WHERE 1=1
	`
	args := []interface{}{}
	argNum := 1

	// Public marketplace should show only open jobs by default.
	if filter.Status == "" {
		baseQuery += `
			AND o.status = 'published'
			AND o.freelancer_id IS NULL
			AND NOT EXISTS (
				SELECT 1
				FROM proposals ap
				WHERE ap.order_id = o.id AND ap.status = 'accepted'
			)
		`
	}

	if filter.Status != "" {
		baseQuery += fmt.Sprintf(" AND o.status = $%d", argNum)
		args = append(args, filter.Status)
		argNum++
	}

	if filter.Search != "" {
		baseQuery += fmt.Sprintf(" AND (o.title ILIKE $%d OR o.description ILIKE $%d)", argNum, argNum)
		args = append(args, "%"+filter.Search+"%")
		argNum++
	}
	if len(filter.Skills) > 0 {
		skillPlaceholders := make([]string, 0, len(filter.Skills))
		for _, skill := range filter.Skills {
			if skill == "" {
				continue
			}
			skillPlaceholders = append(skillPlaceholders, fmt.Sprintf("LOWER($%d)", argNum))
			args = append(args, skill)
			argNum++
		}
		if len(skillPlaceholders) > 0 {
			baseQuery += " AND EXISTS (" +
				"SELECT 1 FROM order_requirements fs " +
				"WHERE fs.order_id = o.id " +
				"AND LOWER(fs.skill) IN (" + strings.Join(skillPlaceholders, ",") + ")" +
				")"
		}
	}

	if filter.BudgetMin != nil {
		baseQuery += fmt.Sprintf(" AND o.budget_max >= $%d", argNum)
		args = append(args, *filter.BudgetMin)
		argNum++
	}

	if filter.BudgetMax != nil {
		baseQuery += fmt.Sprintf(" AND o.budget_min <= $%d", argNum)
		args = append(args, *filter.BudgetMax)
		argNum++
	}

	if filter.CategoryID != nil {
		baseQuery += fmt.Sprintf(" AND o.category_id = $%d", argNum)
		args = append(args, *filter.CategoryID)
		argNum++
	}
	if filter.MinProposals != nil {
		baseQuery += fmt.Sprintf(" AND COALESCE(pc.proposals_count, 0) >= $%d", argNum)
		args = append(args, *filter.MinProposals)
		argNum++
	}
	if filter.MaxProposals != nil {
		baseQuery += fmt.Sprintf(" AND COALESCE(pc.proposals_count, 0) <= $%d", argNum)
		args = append(args, *filter.MaxProposals)
		argNum++
	}

	var total int
	countQuery := "SELECT COUNT(*) " + baseQuery
	if err := r.db.GetContext(ctx, &total, countQuery, args...); err != nil {
		return nil, 0, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "не удалось посчитать заказы")
	}

	sortBy := "o.created_at"
	if filter.SortBy != "" {
		switch filter.SortBy {
		case "created_at":
			sortBy = "o.created_at"
		case "budget_min":
			sortBy = "o.budget_min"
		case "budget_max":
			sortBy = "o.budget_max"
		case "proposals_count", "proposals":
			sortBy = "COALESCE(pc.proposals_count, 0)"
		}
	}
	sortOrder := "DESC"
	if filter.SortOrder == "asc" {
		sortOrder = "ASC"
	}

	selectQuery := fmt.Sprintf(`SELECT o.id, o.client_id, o.freelancer_id, o.title, o.description, o.budget_min, o.budget_max, o.status, o.deadline_at,
		o.category_id, c.slug, c.name, c.icon,
		o.ai_summary, o.best_recommendation_proposal_id, o.best_recommendation_justification, 
		o.ai_analysis_updated_at, o.created_at, o.updated_at, COALESCE(pc.proposals_count, 0) AS proposals_count
		%s ORDER BY %s %s LIMIT $%d OFFSET $%d`,
		baseQuery, sortBy, sortOrder, argNum, argNum+1)
	args = append(args, filter.Limit, filter.Offset)

	rows, err := r.db.QueryContext(ctx, selectQuery, args...)
	if err != nil {
		return nil, 0, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "не удалось получить заказы")
	}
	defer rows.Close()

	var orders []*entity.Order
	for rows.Next() {
		var order entity.Order
		var budgetMin, budgetMax float64
		var status string
		var categorySlug, categoryName sql.NullString
		var categoryIcon sql.NullString
		var proposalsCount int

		err := rows.Scan(
			&order.ID, &order.ClientID, &order.FreelancerID, &order.Title, &order.Description,
			&budgetMin, &budgetMax, &status, &order.DeadlineAt,
			&order.CategoryID, &categorySlug, &categoryName, &categoryIcon,
			&order.AISummary, &order.BestRecommendationProposalID, &order.BestRecommendationJustification,
			&order.AIAnalysisUpdatedAt, &order.CreatedAt, &order.UpdatedAt, &proposalsCount,
		)
		if err != nil {
			return nil, 0, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "не удалось прочитать заказ")
		}

		budget, _ := valueobject.NewBudget(budgetMin, budgetMax)
		order.Budget = budget
		orderStatus, _ := valueobject.NewOrderStatus(status)
		order.Status = orderStatus
		order.ProposalsCount = &proposalsCount

		if order.CategoryID != nil && categorySlug.Valid && categoryName.Valid {
			var iconPtr *string
			if categoryIcon.Valid {
				icon := categoryIcon.String
				iconPtr = &icon
			}
			order.Category = &entity.CategoryRef{
				ID:   *order.CategoryID,
				Slug: categorySlug.String,
				Name: categoryName.String,
				Icon: iconPtr,
			}
		}

		orders = append(orders, &order)
	}

	return orders, total, nil
}

func (r *OrderRepositoryAdapter) CreateRequirement(ctx context.Context, req *entity.OrderRequirement) error {
	query := `INSERT INTO order_requirements (id, order_id, skill, level) VALUES ($1, $2, $3, $4)`
	_, err := r.db.ExecContext(ctx, query, req.ID, req.OrderID, req.Skill, req.Level)
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "не удалось создать требование")
	}
	return nil
}

func (r *OrderRepositoryAdapter) UpdateRequirements(ctx context.Context, orderID uuid.UUID, requirements []entity.OrderRequirement) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "не удалось начать транзакцию")
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `DELETE FROM order_requirements WHERE order_id = $1`, orderID); err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "не удалось удалить старые требования")
	}

	for _, req := range requirements {
		if _, err := tx.ExecContext(ctx, `INSERT INTO order_requirements (id, order_id, skill, level) VALUES ($1, $2, $3, $4)`,
			req.ID, orderID, req.Skill, req.Level); err != nil {
			return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "не удалось создать требование")
		}
	}

	return tx.Commit()
}

func (r *OrderRepositoryAdapter) FindRequirements(ctx context.Context, orderID uuid.UUID) ([]entity.OrderRequirement, error) {
	query := `SELECT id, order_id, skill, level FROM order_requirements WHERE order_id = $1 ORDER BY skill`

	type requirementRow struct {
		ID      uuid.UUID `db:"id"`
		OrderID uuid.UUID `db:"order_id"`
		Skill   string    `db:"skill"`
		Level   string    `db:"level"`
	}

	var rows []requirementRow
	err := r.db.SelectContext(ctx, &rows, query, orderID)
	if err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "не удалось получить требования")
	}

	requirements := make([]entity.OrderRequirement, 0, len(rows))
	for _, row := range rows {
		requirements = append(requirements, entity.OrderRequirement{
			ID:      row.ID,
			OrderID: row.OrderID,
			Skill:   row.Skill,
			Level:   row.Level,
		})
	}

	return requirements, nil
}

func (r *OrderRepositoryAdapter) CreateAttachment(ctx context.Context, att *entity.OrderAttachment) error {
	query := `INSERT INTO order_attachments (id, order_id, media_id, created_at) VALUES ($1, $2, $3, $4)`
	_, err := r.db.ExecContext(ctx, query, att.ID, att.OrderID, att.MediaID, att.CreatedAt)
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "не удалось создать вложение")
	}
	return nil
}

func (r *OrderRepositoryAdapter) UpdateAttachments(ctx context.Context, orderID uuid.UUID, attachments []entity.OrderAttachment) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "не удалось начать транзакцию")
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `DELETE FROM order_attachments WHERE order_id = $1`, orderID); err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "не удалось удалить старые вложения")
	}

	for _, att := range attachments {
		if _, err := tx.ExecContext(ctx, `INSERT INTO order_attachments (id, order_id, media_id, created_at) VALUES ($1, $2, $3, $4)`,
			att.ID, att.OrderID, att.MediaID, att.CreatedAt); err != nil {
			return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "не удалось создать вложение")
		}
	}

	return tx.Commit()
}

func (r *OrderRepositoryAdapter) FindAttachments(ctx context.Context, orderID uuid.UUID) ([]entity.OrderAttachment, error) {
	query := `SELECT id, order_id, media_id, created_at FROM order_attachments WHERE order_id = $1 ORDER BY created_at`

	type attachmentRow struct {
		ID        uuid.UUID `db:"id"`
		OrderID   uuid.UUID `db:"order_id"`
		MediaID   uuid.UUID `db:"media_id"`
		CreatedAt time.Time `db:"created_at"`
	}

	var rows []attachmentRow
	err := r.db.SelectContext(ctx, &rows, query, orderID)
	if err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "не удалось получить вложения")
	}

	attachments := make([]entity.OrderAttachment, 0, len(rows))
	for _, row := range rows {
		attachments = append(attachments, entity.OrderAttachment{
			ID:        row.ID,
			OrderID:   row.OrderID,
			MediaID:   row.MediaID,
			CreatedAt: row.CreatedAt,
		})
	}

	return attachments, nil
}
