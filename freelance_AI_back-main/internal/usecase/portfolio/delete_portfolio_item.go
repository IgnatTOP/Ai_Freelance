package portfolio

import (
	"context"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
	"github.com/ignatzorin/freelance-backend/internal/pkg/apperror"
)

// DeletePortfolioItemUseCase handles deleting a portfolio item.
type DeletePortfolioItemUseCase struct {
	portfolioRepo repository.PortfolioRepository
}

// NewDeletePortfolioItemUseCase creates a new DeletePortfolioItemUseCase.
func NewDeletePortfolioItemUseCase(portfolioRepo repository.PortfolioRepository) *DeletePortfolioItemUseCase {
	return &DeletePortfolioItemUseCase{portfolioRepo: portfolioRepo}
}

// Run executes the use case.
func (uc *DeletePortfolioItemUseCase) Run(ctx context.Context, userID, id uuid.UUID) error {
	item, err := uc.portfolioRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if item.UserID != userID {
		return apperror.ErrForbidden
	}
	return uc.portfolioRepo.Delete(ctx, id)
}
