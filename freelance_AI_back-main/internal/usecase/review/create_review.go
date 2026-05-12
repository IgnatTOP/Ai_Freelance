package review

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
	"github.com/ignatzorin/freelance-backend/internal/domain/valueobject"
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
	orderRepo  repository.OrderRepository
}

// NewCreateReviewUseCase creates a new CreateReviewUseCase.
func NewCreateReviewUseCase(reviewRepo repository.ReviewRepository, orderRepo repository.OrderRepository) *CreateReviewUseCase {
	return &CreateReviewUseCase{reviewRepo: reviewRepo, orderRepo: orderRepo}
}

// Run executes the use case.
func (uc *CreateReviewUseCase) Run(ctx context.Context, input CreateReviewInput) (*entity.Review, error) {
	// 1. Validate input
	if input.Rating < 1 || input.Rating > 5 {
		return nil, fmt.Errorf("rating must be between 1 and 5")
	}

	order, err := uc.orderRepo.FindByID(ctx, input.OrderID)
	if err != nil {
		return nil, fmt.Errorf("order not found: %w", err)
	}
	if order.Status != valueobject.OrderStatusCompleted {
		return nil, fmt.Errorf("reviews are only allowed for completed orders")
	}
	if order.ClientID != input.ReviewerID && (order.FreelancerID == nil || *order.FreelancerID != input.ReviewerID) {
		return nil, fmt.Errorf("user is not a participant in this order")
	}
	var expectedReviewed uuid.UUID
	if order.ClientID == input.ReviewerID {
		if order.FreelancerID == nil {
			return nil, fmt.Errorf("order has no assigned freelancer")
		}
		expectedReviewed = *order.FreelancerID
	} else {
		expectedReviewed = order.ClientID
	}
	if input.ReviewedID != expectedReviewed {
		return nil, fmt.Errorf("reviewed_id must be the other party in the order")
	}

	existingReviews, err := uc.reviewRepo.ListByOrderID(ctx, input.OrderID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing reviews: %w", err)
	}
	for _, r := range existingReviews {
		if r.ReviewerID == input.ReviewerID {
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
