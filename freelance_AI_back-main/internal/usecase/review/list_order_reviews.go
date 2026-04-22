package review

import (
	"context"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
)

// ListOrderReviewsUseCase handles listing reviews for an order.
type ListOrderReviewsUseCase struct {
	reviewRepo repository.ReviewRepository
}

// NewListOrderReviewsUseCase creates a new ListOrderReviewsUseCase.
func NewListOrderReviewsUseCase(reviewRepo repository.ReviewRepository) *ListOrderReviewsUseCase {
	return &ListOrderReviewsUseCase{reviewRepo: reviewRepo}
}

// Run executes the use case.
func (uc *ListOrderReviewsUseCase) Run(ctx context.Context, orderID uuid.UUID) ([]entity.Review, error) {
	return uc.reviewRepo.ListByOrderID(ctx, orderID)
}
