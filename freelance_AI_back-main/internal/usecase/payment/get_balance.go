package payment

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
	"github.com/ignatzorin/freelance-backend/internal/pkg/apperror"
)

// GetBalanceUseCase handles retrieving user balance.
type GetBalanceUseCase struct {
	paymentRepo repository.PaymentRepository
}

// NewGetBalanceUseCase creates a new GetBalanceUseCase.
func NewGetBalanceUseCase(paymentRepo repository.PaymentRepository) *GetBalanceUseCase {
	return &GetBalanceUseCase{paymentRepo: paymentRepo}
}

// Run executes the use case.
func (uc *GetBalanceUseCase) Run(ctx context.Context, userID uuid.UUID) (*entity.UserBalance, error) {
	balance, err := uc.paymentRepo.GetBalance(ctx, userID)
	if err != nil {
		if errors.Is(err, apperror.ErrBalanceNotFound) {
			// Return a zero balance if not found
			return &entity.UserBalance{
				UserID:    userID,
				Available: 0,
				Frozen:    0,
			}, nil
		}
		return nil, err
	}
	return balance, nil
}
