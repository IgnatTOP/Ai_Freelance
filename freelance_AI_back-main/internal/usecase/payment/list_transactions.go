package payment

import (
	"context"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
)

// ListTransactionsUseCase handles listing transactions.
type ListTransactionsUseCase struct {
	paymentRepo repository.PaymentRepository
}

// NewListTransactionsUseCase creates a new ListTransactionsUseCase.
func NewListTransactionsUseCase(paymentRepo repository.PaymentRepository) *ListTransactionsUseCase {
	return &ListTransactionsUseCase{paymentRepo: paymentRepo}
}

// Run executes the use case.
func (uc *ListTransactionsUseCase) Run(ctx context.Context, userID uuid.UUID, limit, offset int) ([]entity.Transaction, error) {
	return uc.paymentRepo.ListTransactions(ctx, userID, limit, offset)
}
