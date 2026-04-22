package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
)

// PaymentRepository defines the interface for payment persistence.
type PaymentRepository interface {
	// Balance
	GetBalance(ctx context.Context, userID uuid.UUID) (*entity.UserBalance, error)
	UpdateBalance(ctx context.Context, balance *entity.UserBalance) error

	// Transactions
	CreateTransaction(ctx context.Context, tx *entity.Transaction) error
	GetTransaction(ctx context.Context, id uuid.UUID) (*entity.Transaction, error)
	ListTransactions(ctx context.Context, userID uuid.UUID, limit, offset int) ([]entity.Transaction, error)

	// Escrow
	CreateEscrow(ctx context.Context, escrow *entity.Escrow) error
	GetEscrow(ctx context.Context, id uuid.UUID) (*entity.Escrow, error)
	GetEscrowByOrderID(ctx context.Context, orderID uuid.UUID) (*entity.Escrow, error)
	UpdateEscrow(ctx context.Context, escrow *entity.Escrow) error

	// Atomic operations for money consistency.
	CreateEscrowAtomic(ctx context.Context, escrow *entity.Escrow) error
	ReleaseEscrowAtomic(ctx context.Context, orderID uuid.UUID, feeRate float64) (*entity.Escrow, error)
	RefundEscrowAtomic(ctx context.Context, orderID uuid.UUID) (*entity.Escrow, error)
}
