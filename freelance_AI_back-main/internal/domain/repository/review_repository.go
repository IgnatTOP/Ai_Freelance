package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
)

// ReviewRepository defines the interface for review persistence.
type ReviewRepository interface {
	Create(ctx context.Context, review *entity.Review) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Review, error)
	GetByOrderID(ctx context.Context, orderID uuid.UUID) (*entity.Review, error)
	ListByReviewedID(ctx context.Context, reviewedID uuid.UUID, limit, offset int) ([]entity.Review, error)
	ListByOrderID(ctx context.Context, orderID uuid.UUID) ([]entity.Review, error)
	GetAverageRating(ctx context.Context, userID uuid.UUID) (float64, int, error) // rating, count, error
}
