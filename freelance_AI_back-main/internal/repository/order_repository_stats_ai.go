package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/ignatzorin/freelance-backend/internal/models"
)

func (r *OrderRepository) GetUserOrderStats(ctx context.Context, userID uuid.UUID) (map[string]int, error) {
	query := `
		SELECT 
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE status = 'published') as open,
			COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
			COUNT(*) FILTER (WHERE status = 'completed') as completed,
			COALESCE(SUM(proposal_count), 0) as total_proposals
		FROM orders
		LEFT JOIN (
			SELECT order_id, COUNT(*) as proposal_count
			FROM proposals
			GROUP BY order_id
		) p ON orders.id = p.order_id
		WHERE orders.client_id = $1
	`

	var result struct {
		Total          int `db:"total"`
		Open           int `db:"open"`
		InProgress     int `db:"in_progress"`
		Completed      int `db:"completed"`
		TotalProposals int `db:"total_proposals"`
	}

	if err := r.db.GetContext(ctx, &result, query, userID); err != nil {
		return nil, fmt.Errorf("order repository: get user order stats %w", err)
	}

	return map[string]int{
		"total":           result.Total,
		"open":            result.Open,
		"in_progress":     result.InProgress,
		"completed":       result.Completed,
		"total_proposals": result.TotalProposals,
	}, nil
}

// GetUserProposalStats возвращает статистику предложений пользователя.
func (r *OrderRepository) GetUserProposalStats(ctx context.Context, userID uuid.UUID) (map[string]int, error) {
	query := `
		SELECT 
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE status = 'pending') as pending,
			COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
			COUNT(*) FILTER (WHERE status = 'rejected') as rejected
		FROM proposals
		WHERE freelancer_id = $1
	`

	var result struct {
		Total    int `db:"total"`
		Pending  int `db:"pending"`
		Accepted int `db:"accepted"`
		Rejected int `db:"rejected"`
	}

	if err := r.db.GetContext(ctx, &result, query, userID); err != nil {
		return nil, fmt.Errorf("order repository: get user proposal stats %w", err)
	}

	return map[string]int{
		"total":    result.Total,
		"pending":  result.Pending,
		"accepted": result.Accepted,
		"rejected": result.Rejected,
	}, nil
}

// CountPublishedOrders возвращает количество опубликованных заказов.
func (r *OrderRepository) CountPublishedOrders(ctx context.Context) (int, error) {
	var count int
	if err := r.db.GetContext(ctx, &count, `SELECT COUNT(*) FROM orders WHERE status = 'published'`); err != nil {
		return 0, fmt.Errorf("order repository: count published orders %w", err)
	}
	return count, nil
}

// CountCompletedOrders возвращает количество завершенных заказов.
func (r *OrderRepository) CountCompletedOrders(ctx context.Context) (int, error) {
	var count int
	if err := r.db.GetContext(ctx, &count, `SELECT COUNT(*) FROM orders WHERE status = 'completed'`); err != nil {
		return 0, fmt.Errorf("order repository: count completed orders %w", err)
	}
	return count, nil
}

// SumCompletedOrderVolume возвращает суммарный оборот по завершенным заказам.
func (r *OrderRepository) SumCompletedOrderVolume(ctx context.Context) (float64, error) {
	var volume float64
	if err := r.db.GetContext(ctx, &volume, `
		SELECT COALESCE(SUM(COALESCE(final_amount, budget_max, budget_min)), 0)
		FROM orders
		WHERE status = 'completed'
	`); err != nil {
		return 0, fmt.Errorf("order repository: sum completed order volume %w", err)
	}
	return volume, nil
}

// GetMarketplaceAverageRating возвращает средний рейтинг по всем отзывам на платформе.
func (r *OrderRepository) GetMarketplaceAverageRating(ctx context.Context) (float64, error) {
	var avg float64
	if err := r.db.GetContext(ctx, &avg, `SELECT COALESCE(AVG(rating), 0) FROM reviews`); err != nil {
		return 0, fmt.Errorf("order repository: get marketplace average rating %w", err)
	}
	return avg, nil
}

// ListMyProposals возвращает все предложения текущего пользователя.
func (r *OrderRepository) ListMyProposals(ctx context.Context, userID uuid.UUID) ([]models.Proposal, error) {
	query := `
		SELECT id, order_id, freelancer_id, cover_letter,
		       COALESCE(proposed_budget, proposed_amount) AS proposed_amount,
		       COALESCE(proposed_budget, proposed_amount) AS proposed_budget, estimated_days,
		       status, ai_feedback, ai_analysis_for_client, ai_analysis_for_client_at,
		       created_at, updated_at
		FROM proposals
		WHERE freelancer_id = $1
		ORDER BY created_at DESC
	`

	var proposals []models.Proposal
	if err := r.db.SelectContext(ctx, &proposals, query, userID); err != nil {
		return nil, fmt.Errorf("order repository: list my proposals %w", err)
	}

	return proposals, nil
}

// GetMyProposalForOrder возвращает предложение пользователя для конкретного заказа.
func (r *OrderRepository) GetMyProposalForOrder(ctx context.Context, orderID, freelancerID uuid.UUID) (*models.Proposal, error) {
	var proposal models.Proposal
	query := `
		SELECT id, order_id, freelancer_id, cover_letter,
		       COALESCE(proposed_budget, proposed_amount) AS proposed_amount,
		       COALESCE(proposed_budget, proposed_amount) AS proposed_budget, estimated_days,
		       status, ai_feedback, ai_analysis_for_client, ai_analysis_for_client_at,
		       created_at, updated_at
		FROM proposals
		WHERE order_id = $1 AND freelancer_id = $2
		ORDER BY created_at DESC
		LIMIT 1
	`

	if err := r.db.GetContext(ctx, &proposal, query, orderID, freelancerID); err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrProposalNotFound
		}
		return nil, fmt.Errorf("order repository: get my proposal for order %w", err)
	}

	return &proposal, nil
}

// ListRequirements возвращает требования к заказу.
func (r *OrderRepository) ListRequirements(ctx context.Context, orderID uuid.UUID) ([]models.OrderRequirement, error) {
	query := `
		SELECT id, order_id, skill, level
		FROM order_requirements
		WHERE order_id = $1
		ORDER BY skill
	`

	var requirements []models.OrderRequirement
	if err := r.db.SelectContext(ctx, &requirements, query, orderID); err != nil {
		return nil, fmt.Errorf("order repository: list requirements %w", err)
	}

	return requirements, nil
}

// ListMyOrders возвращает все заказы текущего пользователя (как заказчика и как исполнителя).
func (r *OrderRepository) ListMyOrders(ctx context.Context, userID uuid.UUID) ([]models.Order, []models.Order, error) {
	// Заказы как заказчик с подсчетом предложений
	clientQuery := `
		SELECT o.*,
			COALESCE(proposal_counts.count, 0) as proposals_count
		FROM orders o
		LEFT JOIN (
			SELECT order_id, COUNT(*) as count
			FROM proposals
			GROUP BY order_id
		) proposal_counts ON o.id = proposal_counts.order_id
		WHERE o.client_id = $1
		ORDER BY o.created_at DESC
	`
	type OrderWithCount struct {
		models.Order
		ProposalsCount *int `db:"proposals_count"`
	}
	var clientOrdersWithCount []OrderWithCount
	if err := r.db.SelectContext(ctx, &clientOrdersWithCount, clientQuery, userID); err != nil {
		return nil, nil, fmt.Errorf("order repository: list client orders %w", err)
	}
	clientOrders := make([]models.Order, len(clientOrdersWithCount))
	for i, oc := range clientOrdersWithCount {
		clientOrders[i] = oc.Order
		clientOrders[i].ProposalsCount = oc.ProposalsCount
	}

	// Заказы как исполнитель (где есть принятый отклик или заказ в работе)
	freelancerQuery := `
		SELECT DISTINCT o.*,
			COALESCE(proposal_counts.count, 0) as proposals_count
		FROM orders o
		INNER JOIN proposals p ON o.id = p.order_id
		LEFT JOIN (
			SELECT order_id, COUNT(*) as count
			FROM proposals
			GROUP BY order_id
		) proposal_counts ON o.id = proposal_counts.order_id
		WHERE p.freelancer_id = $1 AND (p.status = 'accepted' OR o.status = 'in_progress')
		ORDER BY o.created_at DESC
	`
	var freelancerOrdersWithCount []OrderWithCount
	if err := r.db.SelectContext(ctx, &freelancerOrdersWithCount, freelancerQuery, userID); err != nil {
		return nil, nil, fmt.Errorf("order repository: list freelancer orders %w", err)
	}
	freelancerOrders := make([]models.Order, len(freelancerOrdersWithCount))
	for i, oc := range freelancerOrdersWithCount {
		freelancerOrders[i] = oc.Order
		freelancerOrders[i].ProposalsCount = oc.ProposalsCount
	}

	return clientOrders, freelancerOrders, nil
}

// Delete удаляет заказ по идентификатору.
func (r *OrderRepository) Delete(ctx context.Context, id uuid.UUID, clientID uuid.UUID) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM orders WHERE id = $1 AND client_id = $2`, id, clientID)
	if err != nil {
		return fmt.Errorf("order repository: delete %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("order repository: delete rows affected %w", err)
	}

	if rowsAffected == 0 {
		return ErrOrderNotFound
	}

	return nil
}

// UpdateAISummary обновляет только AI summary заказа.
func (r *OrderRepository) UpdateAISummary(ctx context.Context, orderID uuid.UUID, clientID uuid.UUID, summary string) error {
	query := `
		UPDATE orders 
		SET ai_summary = $1, updated_at = NOW() 
		WHERE id = $2 AND client_id = $3
	`
	result, err := r.db.ExecContext(ctx, query, summary, orderID, clientID)
	if err != nil {
		return fmt.Errorf("order repository: update ai summary %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("order repository: update ai summary rows affected %w", err)
	}

	if rowsAffected == 0 {
		return ErrOrderNotFound
	}

	return nil
}

// UpdateProposalAIFeedback обновляет AI feedback для отклика.
func (r *OrderRepository) UpdateProposalAIFeedback(ctx context.Context, proposalID uuid.UUID, feedback string) error {
	query := `
		UPDATE proposals 
		SET ai_feedback = $1,
		    ai_analysis_for_client = $1,
		    ai_analysis_for_client_at = NOW(),
		    updated_at = NOW() 
		WHERE id = $2
	`
	_, err := r.db.ExecContext(ctx, query, feedback, proposalID)
	if err != nil {
		return fmt.Errorf("order repository: update proposal ai feedback %w", err)
	}
	return nil
}

// UpdateBestRecommendation обновляет рекомендацию лучшего исполнителя для заказа.
func (r *OrderRepository) UpdateBestRecommendation(ctx context.Context, orderID uuid.UUID, proposalID *uuid.UUID, justification string) error {
	query := `
		UPDATE orders 
		SET best_recommendation_proposal_id = $1,
		    best_recommendation_justification = $2,
		    ai_analysis_updated_at = NOW(),
		    updated_at = NOW() 
		WHERE id = $3
	`
	_, err := r.db.ExecContext(ctx, query, proposalID, justification, orderID)
	if err != nil {
		return fmt.Errorf("order repository: update best recommendation %w", err)
	}
	return nil
}

// MarkAIAnalysisUpdated обновляет timestamp последнего AI анализа откликов.
func (r *OrderRepository) MarkAIAnalysisUpdated(ctx context.Context, orderID uuid.UUID) error {
	query := `
		UPDATE orders
		SET ai_analysis_updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.db.ExecContext(ctx, query, orderID)
	if err != nil {
		return fmt.Errorf("order repository: mark ai analysis updated %w", err)
	}
	return nil
}

// GetProposalsLastUpdateTime возвращает время последнего обновления откликов для заказа.
func (r *OrderRepository) GetProposalsLastUpdateTime(ctx context.Context, orderID uuid.UUID) (*time.Time, error) {
	var lastUpdate time.Time
	query := `
		SELECT COALESCE(MAX(updated_at), MAX(created_at)) 
		FROM proposals 
		WHERE order_id = $1
	`
	err := r.db.GetContext(ctx, &lastUpdate, query, orderID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("order repository: get proposals last update time %w", err)
	}
	return &lastUpdate, nil
}

// GetAverageResponseTimeHours возвращает среднее время ответа в часах для пользователя.
// Для клиентов: среднее время от создания предложения до его принятия.
// Для фрилансеров: среднее время от создания предложения до его принятия.
func (r *OrderRepository) GetAverageResponseTimeHours(ctx context.Context, userID uuid.UUID) (float64, error) {
	var avgHours float64
	query := `
		SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (p.updated_at - p.created_at)) / 3600), 0) as avg_hours
		FROM proposals p
		INNER JOIN orders o ON p.order_id = o.id
		WHERE p.status = 'accepted' 
		AND (o.client_id = $1 OR p.freelancer_id = $1)
		AND p.updated_at > p.created_at
	`
	err := r.db.GetContext(ctx, &avgHours, query, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0.0, nil
		}
		return 0.0, fmt.Errorf("order repository: get average response time %w", err)
	}
	return avgHours, nil
}

// AddMessageAttachments добавляет вложения к сообщению.
