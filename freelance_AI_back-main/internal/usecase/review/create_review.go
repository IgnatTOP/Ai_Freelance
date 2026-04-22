package review

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
)

// CreateReviewInput defines input for creating a review.
type CreateReviewInput struct {
	OrderID    uuid.UUID
	ReviewerID uuid.UUID
	ReviewedID uuid.UUID
	Rating     int
	Comment    *string
}

// CreateReviewUseCase handles review creation.
type CreateReviewUseCase struct {
	reviewRepo repository.ReviewRepository
	// orderRepo  repository.OrderRepository // Needed to validate order?
}

// NewCreateReviewUseCase creates a new CreateReviewUseCase.
func NewCreateReviewUseCase(reviewRepo repository.ReviewRepository) *CreateReviewUseCase {
	return &CreateReviewUseCase{reviewRepo: reviewRepo}
}

// Run executes the use case.
func (uc *CreateReviewUseCase) Run(ctx context.Context, input CreateReviewInput) (*entity.Review, error) {
	// 1. Validate input
	if input.Rating < 1 || input.Rating > 5 {
		return nil, fmt.Errorf("rating must be between 1 and 5")
	}

	// 2. Check if review already exists for this order by this reviewer?
	// The repo method GetByOrderID returns *a* review.
	// If it returns one, we should check if it's the same reviewer.
	existing, err := uc.reviewRepo.GetByOrderID(ctx, input.OrderID)
	if err == nil && existing != nil {
		// If existing review found, check if it's duplicate.
		// A user can only review an order once?
		// Usually yes.
		if existing.ReviewerID == input.ReviewerID {
			return nil, fmt.Errorf("review already exists for this order")
		}
	}

	// 3. Create review entity
	review := &entity.Review{
		ID:         uuid.New(),
		OrderID:    input.OrderID,
		ReviewerID: input.ReviewerID,
		ReviewedID: input.ReviewedID,
		Rating:     input.Rating,
		Comment:    input.Comment,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	// 4. Save
	if err := uc.reviewRepo.Create(ctx, review); err != nil {
		return nil, err
	}

	return review, nil
}
