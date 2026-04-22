package portfolio

import (
	"context"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
	"github.com/ignatzorin/freelance-backend/internal/pkg/apperror"
)

// UpdatePortfolioItemInput defines input for updating a portfolio item.
type UpdatePortfolioItemInput struct {
	ID           uuid.UUID
	UserID       uuid.UUID // For simple ownership check if repo supports it or we fetch first.
	Title        string
	Description  *string
	CoverMediaID *uuid.UUID
	AITags       []string
	ExternalLink *string
	MediaIDs     []uuid.UUID
}

// UpdatePortfolioItemUseCase handles portfolio item update.
type UpdatePortfolioItemUseCase struct {
	portfolioRepo repository.PortfolioRepository
}

// NewUpdatePortfolioItemUseCase creates a new UpdatePortfolioItemUseCase.
func NewUpdatePortfolioItemUseCase(portfolioRepo repository.PortfolioRepository) *UpdatePortfolioItemUseCase {
	return &UpdatePortfolioItemUseCase{portfolioRepo: portfolioRepo}
}

// Run executes the use case.
func (uc *UpdatePortfolioItemUseCase) Run(ctx context.Context, input UpdatePortfolioItemInput) (*entity.PortfolioItem, error) {
	existing, err := uc.portfolioRepo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, err
	}

	if existing.UserID != input.UserID {
		return nil, apperror.ErrForbidden
	}

	existing.Title = input.Title
	existing.Description = input.Description
	existing.CoverMediaID = input.CoverMediaID
	existing.AITags = input.AITags
	existing.ExternalLink = input.ExternalLink
	existing.MediaIDs = input.MediaIDs

	if err := uc.portfolioRepo.Update(ctx, existing); err != nil {
		return nil, err
	}

	return existing, nil
}
