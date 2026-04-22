package payment

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
)

// RefundEscrowUseCase handles refunding escrow to client.
type RefundEscrowUseCase struct {
	paymentRepo repository.PaymentRepository
}

// NewRefundEscrowUseCase creates a new RefundEscrowUseCase.
func NewRefundEscrowUseCase(paymentRepo repository.PaymentRepository) *RefundEscrowUseCase {
	return &RefundEscrowUseCase{paymentRepo: paymentRepo}
}

// Run executes the use case.
func (uc *RefundEscrowUseCase) Run(ctx context.Context, orderID uuid.UUID) (*entity.Escrow, error) {
	escrow, err := uc.paymentRepo.RefundEscrowAtomic(ctx, orderID)
	if err != nil {
		return nil, fmt.Errorf("failed to refund escrow atomically: %w", err)
	}
	return escrow, nil
}
