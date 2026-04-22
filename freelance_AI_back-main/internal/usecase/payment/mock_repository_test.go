package payment

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/pkg/apperror"
)

type MockPaymentRepository struct {
	balances     map[uuid.UUID]*entity.UserBalance
	escrows      map[uuid.UUID]*entity.Escrow
	transactions map[uuid.UUID]*entity.Transaction
}

func NewMockPaymentRepository() *MockPaymentRepository {
	return &MockPaymentRepository{
		balances:     make(map[uuid.UUID]*entity.UserBalance),
		escrows:      make(map[uuid.UUID]*entity.Escrow),
		transactions: make(map[uuid.UUID]*entity.Transaction),
	}
}

func (m *MockPaymentRepository) GetBalance(ctx context.Context, userID uuid.UUID) (*entity.UserBalance, error) {
	if bal, ok := m.balances[userID]; ok {
		return bal, nil
	}
	return nil, apperror.ErrBalanceNotFound
}

func (m *MockPaymentRepository) UpdateBalance(ctx context.Context, balance *entity.UserBalance) error {
	m.balances[balance.UserID] = balance
	return nil
}

func (m *MockPaymentRepository) CreateTransaction(ctx context.Context, tx *entity.Transaction) error {
	m.transactions[tx.ID] = tx
	return nil
}

func (m *MockPaymentRepository) GetTransaction(ctx context.Context, id uuid.UUID) (*entity.Transaction, error) {
	if tx, ok := m.transactions[id]; ok {
		return tx, nil
	}
	return nil, fmt.Errorf("transaction not found")
}

func (m *MockPaymentRepository) ListTransactions(ctx context.Context, userID uuid.UUID, limit, offset int) ([]entity.Transaction, error) {
	var txs []entity.Transaction
	for _, tx := range m.transactions {
		if tx.UserID == userID {
			txs = append(txs, *tx)
		}
	}
	return txs, nil
}

func (m *MockPaymentRepository) CreateEscrow(ctx context.Context, escrow *entity.Escrow) error {
	m.escrows[escrow.ID] = escrow
	return nil
}

func (m *MockPaymentRepository) GetEscrow(ctx context.Context, id uuid.UUID) (*entity.Escrow, error) {
	if e, ok := m.escrows[id]; ok {
		return e, nil
	}
	return nil, apperror.ErrEscrowNotFound
}

func (m *MockPaymentRepository) GetEscrowByOrderID(ctx context.Context, orderID uuid.UUID) (*entity.Escrow, error) {
	for _, e := range m.escrows {
		if e.OrderID == orderID {
			return e, nil
		}
	}
	return nil, apperror.ErrEscrowNotFound
}

func (m *MockPaymentRepository) UpdateEscrow(ctx context.Context, escrow *entity.Escrow) error {
	m.escrows[escrow.ID] = escrow
	return nil
}

func (m *MockPaymentRepository) CreateEscrowAtomic(ctx context.Context, escrow *entity.Escrow) error {
	balance, ok := m.balances[escrow.ClientID]
	if !ok || balance.Available < escrow.Amount {
		return fmt.Errorf("insufficient funds")
	}

	balance.Available -= escrow.Amount
	balance.Frozen += escrow.Amount
	balance.UpdatedAt = time.Now()

	m.escrows[escrow.ID] = escrow
	txID := uuid.New()
	m.transactions[txID] = &entity.Transaction{
		ID:        txID,
		UserID:    escrow.ClientID,
		OrderID:   &escrow.OrderID,
		Type:      entity.TransactionTypeEscrowHold,
		Amount:    escrow.Amount,
		Status:    entity.TransactionStatusCompleted,
		CreatedAt: time.Now(),
	}
	return nil
}

func (m *MockPaymentRepository) ReleaseEscrowAtomic(ctx context.Context, orderID uuid.UUID, feeRate float64) (*entity.Escrow, error) {
	escrow, err := m.GetEscrowByOrderID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if escrow.Status != entity.EscrowStatusHeld {
		return nil, fmt.Errorf("escrow is not in held status")
	}

	clientBalance, ok := m.balances[escrow.ClientID]
	if !ok || clientBalance.Frozen < escrow.Amount {
		return nil, fmt.Errorf("insufficient frozen funds")
	}
	clientBalance.Frozen -= escrow.Amount
	clientBalance.UpdatedAt = time.Now()

	freelancerBalance, ok := m.balances[escrow.FreelancerID]
	if !ok {
		freelancerBalance = &entity.UserBalance{UserID: escrow.FreelancerID}
		m.balances[escrow.FreelancerID] = freelancerBalance
	}
	payout := escrow.Amount * (1 - feeRate)
	freelancerBalance.Available += payout
	freelancerBalance.UpdatedAt = time.Now()

	now := time.Now()
	escrow.Status = entity.EscrowStatusReleased
	escrow.ReleasedAt = &now
	m.escrows[escrow.ID] = escrow

	txID := uuid.New()
	m.transactions[txID] = &entity.Transaction{
		ID:        txID,
		UserID:    escrow.FreelancerID,
		OrderID:   &escrow.OrderID,
		Type:      entity.TransactionTypeEscrowRelease,
		Amount:    payout,
		Status:    entity.TransactionStatusCompleted,
		CreatedAt: time.Now(),
	}

	return escrow, nil
}

func (m *MockPaymentRepository) RefundEscrowAtomic(ctx context.Context, orderID uuid.UUID) (*entity.Escrow, error) {
	escrow, err := m.GetEscrowByOrderID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if escrow.Status != entity.EscrowStatusHeld {
		return nil, fmt.Errorf("escrow is not in held status")
	}

	clientBalance, ok := m.balances[escrow.ClientID]
	if !ok || clientBalance.Frozen < escrow.Amount {
		return nil, fmt.Errorf("insufficient frozen funds")
	}
	clientBalance.Frozen -= escrow.Amount
	clientBalance.Available += escrow.Amount
	clientBalance.UpdatedAt = time.Now()

	now := time.Now()
	escrow.Status = entity.EscrowStatusRefunded
	escrow.ReleasedAt = &now
	m.escrows[escrow.ID] = escrow

	txID := uuid.New()
	m.transactions[txID] = &entity.Transaction{
		ID:        txID,
		UserID:    escrow.ClientID,
		OrderID:   &escrow.OrderID,
		Type:      entity.TransactionTypeEscrowRefund,
		Amount:    escrow.Amount,
		Status:    entity.TransactionStatusCompleted,
		CreatedAt: time.Now(),
	}

	return escrow, nil
}
