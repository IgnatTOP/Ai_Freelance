package persistence

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/pkg/apperror"
	"github.com/jmoiron/sqlx"
)

// ReviewRepositoryAdapter implements ReviewRepository interface.
type ReviewRepositoryAdapter struct {
	db *sqlx.DB
}

type reviewRow struct {
	ID         uuid.UUID `db:"id"`
	OrderID    uuid.UUID `db:"order_id"`
	ReviewerID uuid.UUID `db:"reviewer_id"`
	ReviewedID uuid.UUID `db:"reviewed_id"`
	Rating     int       `db:"rating"`
	Comment    *string   `db:"comment"`
	CreatedAt  time.Time `db:"created_at"`
	UpdatedAt  time.Time `db:"updated_at"`
}

func (r reviewRow) toEntity() entity.Review {
	return entity.Review{
		ID:         r.ID,
		OrderID:    r.OrderID,
		ReviewerID: r.ReviewerID,
		ReviewedID: r.ReviewedID,
		Rating:     r.Rating,
		Comment:    r.Comment,
		CreatedAt:  r.CreatedAt,
		UpdatedAt:  r.UpdatedAt,
	}
}

// NewReviewRepositoryAdapter creates a new review repository adapter.
func NewReviewRepositoryAdapter(db *sqlx.DB) *ReviewRepositoryAdapter {
	return &ReviewRepositoryAdapter{db: db}
}

// Create creates a new review.
func (r *ReviewRepositoryAdapter) Create(ctx context.Context, review *entity.Review) error {
	query := `
		INSERT INTO reviews (id, order_id, reviewer_id, reviewed_id, rating, comment, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.db.ExecContext(ctx, query,
		review.ID,
		review.OrderID,
		review.ReviewerID,
		review.ReviewedID,
		review.Rating,
		review.Comment,
		review.CreatedAt,
		review.UpdatedAt,
	)
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to create review")
	}
	return nil
}

// GetByID retrieves a review by ID.
func (r *ReviewRepositoryAdapter) GetByID(ctx context.Context, id uuid.UUID) (*entity.Review, error) {
	var row reviewRow
	query := `SELECT id, order_id, reviewer_id, reviewed_id, rating, comment, created_at, updated_at FROM reviews WHERE id = $1`
	if err := r.db.GetContext(ctx, &row, query, id); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("review not found")
		}
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to get review")
	}
	review := row.toEntity()
	return &review, nil
}

// GetByOrderID retrieves a review by Order ID.
func (r *ReviewRepositoryAdapter) GetByOrderID(ctx context.Context, orderID uuid.UUID) (*entity.Review, error) {
	var row reviewRow
	query := `SELECT id, order_id, reviewer_id, reviewed_id, rating, comment, created_at, updated_at FROM reviews WHERE order_id = $1`
	if err := r.db.GetContext(ctx, &row, query, orderID); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("review not found for order")
		}
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to get review by order")
	}
	review := row.toEntity()
	return &review, nil
}

// ListByReviewedID retrieves reviews for a user.
func (r *ReviewRepositoryAdapter) ListByReviewedID(ctx context.Context, reviewedID uuid.UUID, limit, offset int) ([]entity.Review, error) {
	var rows []reviewRow
	query := `
		SELECT id, order_id, reviewer_id, reviewed_id, rating, comment, created_at, updated_at
		FROM reviews
		WHERE reviewed_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	if err := r.db.SelectContext(ctx, &rows, query, reviewedID, limit, offset); err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to list reviews")
	}

	reviews := make([]entity.Review, 0, len(rows))
	for _, row := range rows {
		reviews = append(reviews, row.toEntity())
	}

	return reviews, nil
}

// ListByOrderID retrieves all reviews for an order.
func (r *ReviewRepositoryAdapter) ListByOrderID(ctx context.Context, orderID uuid.UUID) ([]entity.Review, error) {
	var rows []reviewRow
	query := `
		SELECT id, order_id, reviewer_id, reviewed_id, rating, comment, created_at, updated_at
		FROM reviews
		WHERE order_id = $1
		ORDER BY created_at DESC
	`
	if err := r.db.SelectContext(ctx, &rows, query, orderID); err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to list reviews by order")
	}

	reviews := make([]entity.Review, 0, len(rows))
	for _, row := range rows {
		reviews = append(reviews, row.toEntity())
	}

	return reviews, nil
}

// GetAverageRating calculates average rating for a user.
func (r *ReviewRepositoryAdapter) GetAverageRating(ctx context.Context, userID uuid.UUID) (float64, int, error) {
	var stats struct {
		Result float64 `db:"avg_rating"`
		Count  int     `db:"count"`
	}
	// COALESCE to handle NULL if no reviews
	query := `
		SELECT COALESCE(AVG(rating), 0) as avg_rating, COUNT(*) as count
		FROM reviews
		WHERE reviewed_id = $1
	`
	if err := r.db.GetContext(ctx, &stats, query, userID); err != nil {
		return 0, 0, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to get average rating")
	}
	return stats.Result, stats.Count, nil
}
