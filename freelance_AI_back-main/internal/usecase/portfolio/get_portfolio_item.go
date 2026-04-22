package portfolio

import (
	"context"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
)

// GetPortfolioItemUseCase handles retrieving a portfolio item.
type GetPortfolioItemUseCase struct {
	portfolioRepo repository.PortfolioRepository
}

// NewGetPortfolioItemUseCase creates a new GetPortfolioItemUseCase.
func NewGetPortfolioItemUseCase(portfolioRepo repository.PortfolioRepository) *GetPortfolioItemUseCase {
	return &GetPortfolioItemUseCase{portfolioRepo: portfolioRepo}
}

// Run executes the use case.
func (uc *GetPortfolioItemUseCase) Run(ctx context.Context, id uuid.UUID) (*entity.PortfolioItem, error) {
	return uc.portfolioRepo.GetByID(ctx, id)
}
