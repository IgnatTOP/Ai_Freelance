package review

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
)

// CanLeaveReviewUseCase checks if a user can leave a review for an order.
type CanLeaveReviewUseCase struct {
	reviewRepo repository.ReviewRepository
	orderRepo  repository.OrderRepository
}

// NewCanLeaveReviewUseCase creates a new CanLeaveReviewUseCase.
func NewCanLeaveReviewUseCase(reviewRepo repository.ReviewRepository, orderRepo repository.OrderRepository) *CanLeaveReviewUseCase {
	return &CanLeaveReviewUseCase{
		reviewRepo: reviewRepo,
		orderRepo:  orderRepo,
	}
}

// Run executes the use case.
func (uc *CanLeaveReviewUseCase) Run(ctx context.Context, userID uuid.UUID, orderID uuid.UUID) (bool, error) {
	// 1. Get order
	order, err := uc.orderRepo.FindByID(ctx, orderID)
	if err != nil {
		return false, fmt.Errorf("order not found: %w", err)
	}

	// 2. Check if user is participant
	if order.ClientID != userID && order.FreelancerID != nil && *order.FreelancerID != userID {
		return false, nil // Not a participant
	}

	// 3. Check order status (must be completed)
	if order.Status != "completed" {
		return false, nil
	}

	// 4. Check if review already exists from this user
	reviews, err := uc.reviewRepo.ListByOrderID(ctx, orderID)
	if err != nil {
		return false, fmt.Errorf("failed to check existing reviews: %w", err)
	}

	for _, review := range reviews {
		if review.ReviewerID == userID {
			return false, nil // Already reviewed
		}
	}

	return true, nil
}
