package payment

import (
	"context"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
)

// GetEscrowByOrderUseCase handles retrieving an escrow by order ID.
type GetEscrowByOrderUseCase struct {
	paymentRepo repository.PaymentRepository
}

// NewGetEscrowByOrderUseCase creates a new GetEscrowByOrderUseCase.
func NewGetEscrowByOrderUseCase(paymentRepo repository.PaymentRepository) *GetEscrowByOrderUseCase {
	return &GetEscrowByOrderUseCase{paymentRepo: paymentRepo}
}

// Run executes the use case.
func (uc *GetEscrowByOrderUseCase) Run(ctx context.Context, orderID uuid.UUID) (*entity.Escrow, error) {
	return uc.paymentRepo.GetEscrowByOrderID(ctx, orderID)
}
