package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
)

// PortfolioRepository defines the interface for portfolio persistence.
type PortfolioRepository interface {
	Create(ctx context.Context, item *entity.PortfolioItem) error
	Update(ctx context.Context, item *entity.PortfolioItem) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.PortfolioItem, error)
	ListByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]entity.PortfolioItem, error)
}
