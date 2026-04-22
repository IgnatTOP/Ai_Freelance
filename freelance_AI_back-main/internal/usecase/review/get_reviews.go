package review

import (
	"context"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
)

// ListReviewsUseCase handles listing reviews for a user.
type ListReviewsUseCase struct {
	reviewRepo repository.ReviewRepository
}

// NewListReviewsUseCase creates a new ListReviewsUseCase.
func NewListReviewsUseCase(reviewRepo repository.ReviewRepository) *ListReviewsUseCase {
	return &ListReviewsUseCase{reviewRepo: reviewRepo}
}

// Run executes the use case.
func (uc *ListReviewsUseCase) Run(ctx context.Context, userID uuid.UUID, limit, offset int) ([]entity.Review, float64, int, error) {
	reviews, err := uc.reviewRepo.ListByReviewedID(ctx, userID, limit, offset)
	if err != nil {
		return nil, 0, 0, err
	}

	avgRating, count, err := uc.reviewRepo.GetAverageRating(ctx, userID)
	if err != nil {
		// Log error? Return 0 stats?
		// Continue with reviews but 0 stats
	}

	return reviews, avgRating, count, nil
}
