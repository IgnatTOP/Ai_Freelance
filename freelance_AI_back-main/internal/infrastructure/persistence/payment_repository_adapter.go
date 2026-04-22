package persistence

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/pkg/apperror"
	"github.com/jmoiron/sqlx"
)

// PaymentRepositoryAdapter implements PaymentRepository interface.
type PaymentRepositoryAdapter struct {
	db *sqlx.DB
}

// NewPaymentRepositoryAdapter creates a new payment repository adapter.
func NewPaymentRepositoryAdapter(db *sqlx.DB) *PaymentRepositoryAdapter {
	return &PaymentRepositoryAdapter{db: db}
}

// GetBalance retrieves user balance.
func (r *PaymentRepositoryAdapter) GetBalance(ctx context.Context, userID uuid.UUID) (*entity.UserBalance, error) {
	var balance entity.UserBalance
	query := `SELECT user_id, available, frozen, updated_at FROM user_balances WHERE user_id = $1`
	if err := r.db.GetContext(ctx, &balance, query, userID); err != nil {
		if err == sql.ErrNoRows {
			// If not found, return a default balance or error.
			// Let's return a default zero balance for simplicity, as most users start with 0.
			// Or return error if the business logic requires explicit creation.
			// Legacy behavior usually creates it on the fly or returns 0.
			// I'll return nil/error to be explicit, but maybe usecase handles it.
			return nil, apperror.ErrBalanceNotFound
		}
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to get balance")
	}
	return &balance, nil
}

// UpdateBalance updates user balance.
func (r *PaymentRepositoryAdapter) UpdateBalance(ctx context.Context, balance *entity.UserBalance) error {
	query := `
		INSERT INTO user_balances (user_id, available, frozen, updated_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_id) DO UPDATE SET
			available = EXCLUDED.available,
			frozen = EXCLUDED.frozen,
			updated_at = EXCLUDED.updated_at
	`
	_, err := r.db.ExecContext(ctx, query, balance.UserID, balance.Available, balance.Frozen, balance.UpdatedAt)
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to update balance")
	}
	return nil
}

// CreateTransaction creates a new transaction.
func (r *PaymentRepositoryAdapter) CreateTransaction(ctx context.Context, tx *entity.Transaction) error {
	query := `
		INSERT INTO transactions (id, user_id, order_id, type, amount, status, description, created_at, completed_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := r.db.ExecContext(ctx, query,
		tx.ID,
		tx.UserID,
		tx.OrderID,
		tx.Type,
		tx.Amount,
		tx.Status,
		tx.Description,
		tx.CreatedAt,
		tx.CompletedAt,
	)
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to create transaction")
	}
	return nil
}

// GetTransaction retrieves a transaction by ID.
func (r *PaymentRepositoryAdapter) GetTransaction(ctx context.Context, id uuid.UUID) (*entity.Transaction, error) {
	var tx entity.Transaction
	query := `SELECT id, user_id, order_id, type, amount, status, description, created_at, completed_at FROM transactions WHERE id = $1`
	if err := r.db.GetContext(ctx, &tx, query, id); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("transaction not found")
		}
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to get transaction")
	}
	return &tx, nil
}

// ListTransactions retrieves transactions for a user.
func (r *PaymentRepositoryAdapter) ListTransactions(ctx context.Context, userID uuid.UUID, limit, offset int) ([]entity.Transaction, error) {
	var txs []entity.Transaction
	query := `
		SELECT id, user_id, order_id, type, amount, status, description, created_at, completed_at 
		FROM transactions 
		WHERE user_id = $1 
		ORDER BY created_at DESC 
		LIMIT $2 OFFSET $3
	`
	if err := r.db.SelectContext(ctx, &txs, query, userID, limit, offset); err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to list transactions")
	}
	return txs, nil
}

// CreateEscrow creates a new escrow.
func (r *PaymentRepositoryAdapter) CreateEscrow(ctx context.Context, escrow *entity.Escrow) error {
	query := `
		INSERT INTO escrow (id, order_id, client_id, freelancer_id, amount, status, created_at, released_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.db.ExecContext(ctx, query,
		escrow.ID,
		escrow.OrderID,
		escrow.ClientID,
		escrow.FreelancerID,
		escrow.Amount,
		escrow.Status,
		escrow.CreatedAt,
		escrow.ReleasedAt,
	)
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to create escrow")
	}
	return nil
}

// GetEscrow retrieves an escrow by ID.
func (r *PaymentRepositoryAdapter) GetEscrow(ctx context.Context, id uuid.UUID) (*entity.Escrow, error) {
	var escrow entity.Escrow
	query := `SELECT id, order_id, client_id, freelancer_id, amount, status, created_at, released_at FROM escrow WHERE id = $1`
	if err := r.db.GetContext(ctx, &escrow, query, id); err != nil {
		if err == sql.ErrNoRows {
			return nil, apperror.ErrEscrowNotFound
		}
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to get escrow")
	}
	return &escrow, nil
}

// GetEscrowByOrderID retrieves an escrow by Order ID.
func (r *PaymentRepositoryAdapter) GetEscrowByOrderID(ctx context.Context, orderID uuid.UUID) (*entity.Escrow, error) {
	var escrow entity.Escrow
	query := `SELECT id, order_id, client_id, freelancer_id, amount, status, created_at, released_at FROM escrow WHERE order_id = $1`
	if err := r.db.GetContext(ctx, &escrow, query, orderID); err != nil {
		if err == sql.ErrNoRows {
			// Not specifically ErrEscrowNotFound, but usually treated as such
			return nil, apperror.ErrEscrowNotFound
		}
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to get escrow by order id")
	}
	return &escrow, nil
}

// UpdateEscrow updates an escrow.
func (r *PaymentRepositoryAdapter) UpdateEscrow(ctx context.Context, escrow *entity.Escrow) error {
	query := `
		UPDATE escrow
		SET status = $2, released_at = $3
		WHERE id = $1
	`
	_, err := r.db.ExecContext(ctx, query,
		escrow.ID,
		escrow.Status,
		escrow.ReleasedAt,
	)
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to update escrow")
	}
	return nil
}

func (r *PaymentRepositoryAdapter) ensureBalanceForUpdate(ctx context.Context, tx *sqlx.Tx, userID uuid.UUID) (*entity.UserBalance, error) {
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO user_balances (user_id, available, frozen, updated_at)
		VALUES ($1, 0, 0, NOW())
		ON CONFLICT (user_id) DO NOTHING
	`, userID); err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to initialize user balance")
	}

	var balance entity.UserBalance
	if err := tx.GetContext(ctx, &balance, `
		SELECT user_id, available, frozen, updated_at
		FROM user_balances
		WHERE user_id = $1
		FOR UPDATE
	`, userID); err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to lock user balance")
	}

	return &balance, nil
}

// CreateEscrowAtomic reserves funds, creates escrow and ledger record in one transaction.
func (r *PaymentRepositoryAdapter) CreateEscrowAtomic(ctx context.Context, escrow *entity.Escrow) (err error) {
	tx, err := r.db.BeginTxx(ctx, &sql.TxOptions{})
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to begin transaction for escrow")
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	balance, err := r.ensureBalanceForUpdate(ctx, tx, escrow.ClientID)
	if err != nil {
		return err
	}
	if balance.Available < escrow.Amount {
		return apperror.New(apperror.ErrCodeBadRequest, "insufficient funds")
	}

	res, err := tx.ExecContext(ctx, `
		UPDATE user_balances
		SET available = available - $2, frozen = frozen + $2, updated_at = NOW()
		WHERE user_id = $1 AND available >= $2
	`, escrow.ClientID, escrow.Amount)
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to reserve escrow funds")
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to check escrow reserve result")
	}
	if rows == 0 {
		return apperror.New(apperror.ErrCodeBadRequest, "insufficient funds")
	}

	if _, err = tx.ExecContext(ctx, `
		INSERT INTO escrow (id, order_id, client_id, freelancer_id, amount, status, created_at, released_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, escrow.ID, escrow.OrderID, escrow.ClientID, escrow.FreelancerID, escrow.Amount, escrow.Status, escrow.CreatedAt, escrow.ReleasedAt); err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to create escrow record")
	}

	completedAt := time.Now()
	if _, err = tx.ExecContext(ctx, `
		INSERT INTO transactions (id, user_id, order_id, type, amount, status, description, created_at, completed_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, uuid.New(), escrow.ClientID, escrow.OrderID, entity.TransactionTypeEscrowHold, escrow.Amount, entity.TransactionStatusCompleted, "Escrow hold", completedAt, completedAt); err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to create escrow hold transaction")
	}

	if err = tx.Commit(); err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to commit escrow transaction")
	}
	return nil
}

// ReleaseEscrowAtomic releases held escrow in one transaction.
func (r *PaymentRepositoryAdapter) ReleaseEscrowAtomic(ctx context.Context, orderID uuid.UUID, feeRate float64) (result *entity.Escrow, err error) {
	if feeRate < 0 || feeRate >= 1 {
		return nil, apperror.New(apperror.ErrCodeBadRequest, "invalid fee rate")
	}

	tx, err := r.db.BeginTxx(ctx, &sql.TxOptions{})
	if err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to begin release escrow transaction")
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	var escrow entity.Escrow
	if err = tx.GetContext(ctx, &escrow, `
		SELECT id, order_id, client_id, freelancer_id, amount, status, created_at, released_at
		FROM escrow
		WHERE order_id = $1
		FOR UPDATE
	`, orderID); err != nil {
		if err == sql.ErrNoRows {
			return nil, apperror.ErrEscrowNotFound
		}
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to lock escrow by order")
	}

	if escrow.Status != entity.EscrowStatusHeld {
		return nil, apperror.New(apperror.ErrCodeConflict, "escrow is not in held status")
	}

	clientBalance, err := r.ensureBalanceForUpdate(ctx, tx, escrow.ClientID)
	if err != nil {
		return nil, err
	}
	if clientBalance.Frozen < escrow.Amount {
		return nil, apperror.New(apperror.ErrCodeConflict, "insufficient frozen funds")
	}

	res, err := tx.ExecContext(ctx, `
		UPDATE user_balances
		SET frozen = frozen - $2, updated_at = NOW()
		WHERE user_id = $1 AND frozen >= $2
	`, escrow.ClientID, escrow.Amount)
	if err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to release client frozen funds")
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to check client frozen update")
	}
	if rows == 0 {
		return nil, apperror.New(apperror.ErrCodeConflict, "insufficient frozen funds")
	}

	if _, err = r.ensureBalanceForUpdate(ctx, tx, escrow.FreelancerID); err != nil {
		return nil, err
	}

	payout := escrow.Amount * (1 - feeRate)
	if payout < 0 {
		return nil, apperror.New(apperror.ErrCodeBadRequest, "invalid payout amount")
	}

	if _, err = tx.ExecContext(ctx, `
		UPDATE user_balances
		SET available = available + $2, updated_at = NOW()
		WHERE user_id = $1
	`, escrow.FreelancerID, payout); err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to credit freelancer balance")
	}

	releasedAt := time.Now()
	res, err = tx.ExecContext(ctx, `
		UPDATE escrow
		SET status = $2, released_at = $3
		WHERE id = $1 AND status = $4
	`, escrow.ID, entity.EscrowStatusReleased, releasedAt, entity.EscrowStatusHeld)
	if err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to update escrow release status")
	}
	rows, err = res.RowsAffected()
	if err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to check escrow release update")
	}
	if rows == 0 {
		return nil, apperror.New(apperror.ErrCodeConflict, "escrow release conflict")
	}
	escrow.Status = entity.EscrowStatusReleased
	escrow.ReleasedAt = &releasedAt

	completedAt := time.Now()
	if _, err = tx.ExecContext(ctx, `
		INSERT INTO transactions (id, user_id, order_id, type, amount, status, description, created_at, completed_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, uuid.New(), escrow.FreelancerID, escrow.OrderID, entity.TransactionTypeEscrowRelease, payout, entity.TransactionStatusCompleted, "Escrow release payout", completedAt, completedAt); err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to create escrow release transaction")
	}

	if err = tx.Commit(); err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to commit escrow release transaction")
	}
	return &escrow, nil
}

// RefundEscrowAtomic refunds held escrow to client in one transaction.
func (r *PaymentRepositoryAdapter) RefundEscrowAtomic(ctx context.Context, orderID uuid.UUID) (result *entity.Escrow, err error) {
	tx, err := r.db.BeginTxx(ctx, &sql.TxOptions{})
	if err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to begin refund escrow transaction")
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	var escrow entity.Escrow
	if err = tx.GetContext(ctx, &escrow, `
		SELECT id, order_id, client_id, freelancer_id, amount, status, created_at, released_at
		FROM escrow
		WHERE order_id = $1
		FOR UPDATE
	`, orderID); err != nil {
		if err == sql.ErrNoRows {
			return nil, apperror.ErrEscrowNotFound
		}
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to lock escrow for refund")
	}

	if escrow.Status != entity.EscrowStatusHeld {
		return nil, apperror.New(apperror.ErrCodeConflict, "escrow is not in held status")
	}

	clientBalance, err := r.ensureBalanceForUpdate(ctx, tx, escrow.ClientID)
	if err != nil {
		return nil, err
	}
	if clientBalance.Frozen < escrow.Amount {
		return nil, apperror.New(apperror.ErrCodeConflict, "insufficient frozen funds")
	}

	res, err := tx.ExecContext(ctx, `
		UPDATE user_balances
		SET available = available + $2, frozen = frozen - $2, updated_at = NOW()
		WHERE user_id = $1 AND frozen >= $2
	`, escrow.ClientID, escrow.Amount)
	if err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to refund client balance")
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to check client refund update")
	}
	if rows == 0 {
		return nil, apperror.New(apperror.ErrCodeConflict, "insufficient frozen funds")
	}

	releasedAt := time.Now()
	res, err = tx.ExecContext(ctx, `
		UPDATE escrow
		SET status = $2, released_at = $3
		WHERE id = $1 AND status = $4
	`, escrow.ID, entity.EscrowStatusRefunded, releasedAt, entity.EscrowStatusHeld)
	if err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to update escrow refund status")
	}
	rows, err = res.RowsAffected()
	if err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to check escrow refund update")
	}
	if rows == 0 {
		return nil, apperror.New(apperror.ErrCodeConflict, "escrow refund conflict")
	}
	escrow.Status = entity.EscrowStatusRefunded
	escrow.ReleasedAt = &releasedAt

	completedAt := time.Now()
	if _, err = tx.ExecContext(ctx, `
		INSERT INTO transactions (id, user_id, order_id, type, amount, status, description, created_at, completed_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, uuid.New(), escrow.ClientID, escrow.OrderID, entity.TransactionTypeEscrowRefund, escrow.Amount, entity.TransactionStatusCompleted, "Escrow refund", completedAt, completedAt); err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to create escrow refund transaction")
	}

	if err = tx.Commit(); err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to commit escrow refund transaction")
	}
	return &escrow, nil
}
