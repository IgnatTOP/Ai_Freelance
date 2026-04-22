package portfolio

import (
	"context"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
)

// ListPortfolioItemsUseCase handles listing portfolio items.
type ListPortfolioItemsUseCase struct {
	portfolioRepo repository.PortfolioRepository
}

// NewListPortfolioItemsUseCase creates a new ListPortfolioItemsUseCase.
func NewListPortfolioItemsUseCase(portfolioRepo repository.PortfolioRepository) *ListPortfolioItemsUseCase {
	return &ListPortfolioItemsUseCase{portfolioRepo: portfolioRepo}
}

// Run executes the use case.
func (uc *ListPortfolioItemsUseCase) Run(ctx context.Context, userID uuid.UUID, limit, offset int) ([]entity.PortfolioItem, error) {
	return uc.portfolioRepo.ListByUserID(ctx, userID, limit, offset)
}
