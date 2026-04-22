package portfolio

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
)

// CreatePortfolioItemInput defines input for creating a portfolio item.
type CreatePortfolioItemInput struct {
	UserID       uuid.UUID
	Title        string
	Description  *string
	CoverMediaID *uuid.UUID
	AITags       []string
	ExternalLink *string
	MediaIDs     []uuid.UUID
}

// CreatePortfolioItemUseCase handles portfolio item creation.
type CreatePortfolioItemUseCase struct {
	portfolioRepo repository.PortfolioRepository
}

// NewCreatePortfolioItemUseCase creates a new CreatePortfolioItemUseCase.
func NewCreatePortfolioItemUseCase(portfolioRepo repository.PortfolioRepository) *CreatePortfolioItemUseCase {
	return &CreatePortfolioItemUseCase{portfolioRepo: portfolioRepo}
}

// Run executes the use case.
func (uc *CreatePortfolioItemUseCase) Run(ctx context.Context, input CreatePortfolioItemInput) (*entity.PortfolioItem, error) {
	item := &entity.PortfolioItem{
		ID:           uuid.New(),
		UserID:       input.UserID,
		Title:        input.Title,
		Description:  input.Description,
		CoverMediaID: input.CoverMediaID,
		AITags:       input.AITags,
		ExternalLink: input.ExternalLink,
		MediaIDs:     input.MediaIDs,
		CreatedAt:    time.Now(),
	}

	if err := uc.portfolioRepo.Create(ctx, item); err != nil {
		return nil, err
	}

	return item, nil
}
