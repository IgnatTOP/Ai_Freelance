package payment

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
)

// CreateEscrowInput defines input for creating escrow.
type CreateEscrowInput struct {
	OrderID      uuid.UUID
	ClientID     uuid.UUID
	FreelancerID uuid.UUID
	Amount       float64
}

// CreateEscrowUseCase handles escrow creation (fund reservation).
type CreateEscrowUseCase struct {
	paymentRepo repository.PaymentRepository
}

// NewCreateEscrowUseCase creates a new CreateEscrowUseCase.
func NewCreateEscrowUseCase(paymentRepo repository.PaymentRepository) *CreateEscrowUseCase {
	return &CreateEscrowUseCase{paymentRepo: paymentRepo}
}

// Run executes the use case.
func (uc *CreateEscrowUseCase) Run(ctx context.Context, input CreateEscrowInput) (*entity.Escrow, error) {
	if input.Amount <= 0 {
		return nil, fmt.Errorf("amount must be positive")
	}

	escrow := &entity.Escrow{
		ID:           uuid.New(),
		OrderID:      input.OrderID,
		ClientID:     input.ClientID,
		FreelancerID: input.FreelancerID,
		Amount:       input.Amount,
		Status:       entity.EscrowStatusHeld,
		CreatedAt:    time.Now(),
	}

	if err := uc.paymentRepo.CreateEscrowAtomic(ctx, escrow); err != nil {
		return nil, fmt.Errorf("failed to create escrow atomically: %w", err)
	}

	return escrow, nil
}
