package payment

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
	"github.com/ignatzorin/freelance-backend/internal/pkg/apperror"
)

// DepositInput defines input for deposit.
type DepositInput struct {
	UserID uuid.UUID
	Amount float64
}

// DepositUseCase handles depositing funds.
type DepositUseCase struct {
	paymentRepo repository.PaymentRepository
}

// NewDepositUseCase creates a new DepositUseCase.
func NewDepositUseCase(paymentRepo repository.PaymentRepository) *DepositUseCase {
	return &DepositUseCase{paymentRepo: paymentRepo}
}

// Run executes the use case.
func (uc *DepositUseCase) Run(ctx context.Context, input DepositInput) (*entity.UserBalance, error) {
	if input.Amount <= 0 {
		return nil, fmt.Errorf("amount must be positive")
	}

	// 1. Get current balance or create default
	balance, err := uc.paymentRepo.GetBalance(ctx, input.UserID)
	if err != nil {
		if errors.Is(err, apperror.ErrBalanceNotFound) {
			balance = &entity.UserBalance{
				UserID:    input.UserID,
				Available: 0,
				Frozen:    0,
			}
		} else {
			return nil, fmt.Errorf("failed to get balance: %w", err)
		}
	}

	// 2. Update balance
	balance.Available += input.Amount
	balance.UpdatedAt = time.Now()

	// 3. Save balance
	if err := uc.paymentRepo.UpdateBalance(ctx, balance); err != nil {
		return nil, fmt.Errorf("failed to update balance: %w", err)
	}

	// 4. Create transaction record
	tx := &entity.Transaction{
		ID:          uuid.New(),
		UserID:      input.UserID,
		Type:        entity.TransactionTypeDeposit,
		Amount:      input.Amount,
		Status:      entity.TransactionStatusCompleted,
		CreatedAt:   time.Now(),
		CompletedAt: &balance.UpdatedAt,
	}
	if err := uc.paymentRepo.CreateTransaction(ctx, tx); err != nil {
		return nil, fmt.Errorf("failed to create deposit transaction: %w", err)
	}

	return balance, nil
}
