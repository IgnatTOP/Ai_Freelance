package payment

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
)

const defaultEscrowFeeRate = 0.10

// ReleaseEscrowUseCase handles releasing funds to freelancer.
type ReleaseEscrowUseCase struct {
	paymentRepo repository.PaymentRepository
	feeRate     float64
}

// NewReleaseEscrowUseCase creates a new ReleaseEscrowUseCase.
func NewReleaseEscrowUseCase(paymentRepo repository.PaymentRepository, feeRate float64) *ReleaseEscrowUseCase {
	if feeRate < 0 || feeRate >= 1 {
		feeRate = defaultEscrowFeeRate
	}
	return &ReleaseEscrowUseCase{
		paymentRepo: paymentRepo,
		feeRate:     feeRate,
	}
}

// Run executes the use case.
func (uc *ReleaseEscrowUseCase) Run(ctx context.Context, orderID uuid.UUID) (*entity.Escrow, error) {
	escrow, err := uc.paymentRepo.ReleaseEscrowAtomic(ctx, orderID, uc.feeRate)
	if err != nil {
		return nil, fmt.Errorf("failed to release escrow atomically: %w", err)
	}
	return escrow, nil
}
