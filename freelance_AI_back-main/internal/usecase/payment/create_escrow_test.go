package payment

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCreateEscrowUseCase_Run(t *testing.T) {
	repo := NewMockPaymentRepository()
	uc := NewCreateEscrowUseCase(repo)

	ctx := context.Background()
	clientID := uuid.New()
	freelancerID := uuid.New()
	orderID := uuid.New()
	amount := 100.0

	// Setup initial balance for client
	repo.balances[clientID] = &entity.UserBalance{
		UserID:    clientID,
		Available: 200.0,
		Frozen:    0.0,
		UpdatedAt: time.Now(),
	}

	input := CreateEscrowInput{
		OrderID:      orderID,
		ClientID:     clientID,
		FreelancerID: freelancerID,
		Amount:       amount,
	}

	// Run UseCase
	escrow, err := uc.Run(ctx, input)
	require.NoError(t, err)
	require.NotNil(t, escrow)

	// Verify Escrow created
	assert.Equal(t, orderID, escrow.OrderID)
	assert.Equal(t, clientID, escrow.ClientID)
	assert.Equal(t, freelancerID, escrow.FreelancerID)
	assert.Equal(t, amount, escrow.Amount)
	assert.Equal(t, entity.EscrowStatusHeld, escrow.Status)

	// Verify Balance updated
	balance, err := repo.GetBalance(ctx, clientID)
	require.NoError(t, err)
	assert.Equal(t, 100.0, balance.Available)
	assert.Equal(t, 100.0, balance.Frozen)

	// Verify Transactions created (Hold)
	txs, _ := repo.ListTransactions(ctx, clientID, 10, 0)
	assert.NotEmpty(t, txs)
	// Check specifically for Hold transaction
	found := false
	for _, tx := range txs {
		if tx.Type == entity.TransactionTypeEscrowHold && tx.Amount == amount {
			found = true
			break
		}
	}
	assert.True(t, found, "Escrow Hold transaction not found")
}

func TestCreateEscrowUseCase_InsufficientFunds(t *testing.T) {
	repo := NewMockPaymentRepository()
	uc := NewCreateEscrowUseCase(repo)

	ctx := context.Background()
	clientID := uuid.New()
	amount := 100.0

	// Setup insufficient balance
	repo.balances[clientID] = &entity.UserBalance{
		UserID:    clientID,
		Available: 50.0,
		Frozen:    0.0,
	}

	input := CreateEscrowInput{
		OrderID:      uuid.New(),
		ClientID:     clientID,
		FreelancerID: uuid.New(),
		Amount:       amount,
	}

	// Run UseCase
	escrow, err := uc.Run(ctx, input)
	assert.Error(t, err)
	assert.Nil(t, escrow)
	assert.Contains(t, err.Error(), "insufficient funds")
}
