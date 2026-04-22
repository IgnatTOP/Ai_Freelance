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

func TestReleaseEscrowUseCase_Run(t *testing.T) {
	repo := NewMockPaymentRepository()
	createUC := NewCreateEscrowUseCase(repo)
	releaseUC := NewReleaseEscrowUseCase(repo, 0.10)

	ctx := context.Background()
	clientID := uuid.New()
	freelancerID := uuid.New()
	orderID := uuid.New()
	amount := 100.0

	repo.balances[clientID] = &entity.UserBalance{
		UserID:    clientID,
		Available: 200.0,
		Frozen:    0,
		UpdatedAt: time.Now(),
	}

	_, err := createUC.Run(ctx, CreateEscrowInput{
		OrderID:      orderID,
		ClientID:     clientID,
		FreelancerID: freelancerID,
		Amount:       amount,
	})
	require.NoError(t, err)

	escrow, err := releaseUC.Run(ctx, orderID)
	require.NoError(t, err)
	require.NotNil(t, escrow)
	assert.Equal(t, entity.EscrowStatusReleased, escrow.Status)
	require.NotNil(t, escrow.ReleasedAt)

	clientBalance, err := repo.GetBalance(ctx, clientID)
	require.NoError(t, err)
	assert.Equal(t, 100.0, clientBalance.Available)
	assert.Equal(t, 0.0, clientBalance.Frozen)

	freelancerBalance, err := repo.GetBalance(ctx, freelancerID)
	require.NoError(t, err)
	assert.Equal(t, 90.0, freelancerBalance.Available)
	assert.Equal(t, 0.0, freelancerBalance.Frozen)
}

func TestRefundEscrowUseCase_Run(t *testing.T) {
	repo := NewMockPaymentRepository()
	createUC := NewCreateEscrowUseCase(repo)
	refundUC := NewRefundEscrowUseCase(repo)

	ctx := context.Background()
	clientID := uuid.New()
	freelancerID := uuid.New()
	orderID := uuid.New()
	amount := 100.0

	repo.balances[clientID] = &entity.UserBalance{
		UserID:    clientID,
		Available: 200.0,
		Frozen:    0,
		UpdatedAt: time.Now(),
	}

	_, err := createUC.Run(ctx, CreateEscrowInput{
		OrderID:      orderID,
		ClientID:     clientID,
		FreelancerID: freelancerID,
		Amount:       amount,
	})
	require.NoError(t, err)

	escrow, err := refundUC.Run(ctx, orderID)
	require.NoError(t, err)
	require.NotNil(t, escrow)
	assert.Equal(t, entity.EscrowStatusRefunded, escrow.Status)

	clientBalance, err := repo.GetBalance(ctx, clientID)
	require.NoError(t, err)
	assert.Equal(t, 200.0, clientBalance.Available)
	assert.Equal(t, 0.0, clientBalance.Frozen)
}
