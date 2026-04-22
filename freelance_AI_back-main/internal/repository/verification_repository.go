package repository

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/ignatzorin/freelance-backend/internal/models"
)

var ErrVerificationCodeNotFound = errors.New("verification code not found")

const defaultVerificationMaxAttempts = 5

type VerificationRepository struct {
	db *sqlx.DB
}

func NewVerificationRepository(db *sqlx.DB) *VerificationRepository {
	return &VerificationRepository{db: db}
}

func (r *VerificationRepository) CreateCode(ctx context.Context, userID uuid.UUID, codeType, code string, expiresAt time.Time) (*models.VerificationCode, error) {
	return r.CreateCodeReplacingActive(ctx, userID, codeType, code, expiresAt, defaultVerificationMaxAttempts)
}

func (r *VerificationRepository) CreateCodeReplacingActive(ctx context.Context, userID uuid.UUID, codeType, code string, expiresAt time.Time, maxAttempts int) (*models.VerificationCode, error) {
	if maxAttempts <= 0 {
		maxAttempts = defaultVerificationMaxAttempts
	}

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("verification repository: begin transaction: %w", err)
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx, `
		UPDATE verification_codes
		SET used = TRUE
		WHERE user_id = $1 AND type = $2 AND used = FALSE AND expires_at > NOW()
	`, userID, codeType)
	if err != nil {
		return nil, fmt.Errorf("verification repository: invalidate active codes: %w", err)
	}

	var vc models.VerificationCode
	err = tx.GetContext(ctx, &vc, `
		INSERT INTO verification_codes (user_id, type, code, expires_at, max_attempts)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING *
	`, userID, codeType, hashVerificationCode(code), expiresAt, maxAttempts)
	if err != nil {
		return nil, fmt.Errorf("verification repository: insert verification code: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("verification repository: commit transaction: %w", err)
	}

	return &vc, nil
}

func (r *VerificationRepository) VerifyCode(ctx context.Context, userID uuid.UUID, codeType, code string) (bool, error) {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return false, fmt.Errorf("verification repository: begin transaction: %w", err)
	}
	defer tx.Rollback()

	var vc models.VerificationCode
	err = tx.GetContext(ctx, &vc, `
		SELECT * FROM verification_codes
		WHERE user_id = $1 AND type = $2 AND used = FALSE AND expires_at > NOW()
		ORDER BY created_at DESC
		LIMIT 1
		FOR UPDATE
	`, userID, codeType)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("verification repository: select active verification code: %w", err)
	}

	hashedCode := hashVerificationCode(code)
	if !constantTimeEquals(vc.Code, hashedCode) {
		attempts := vc.Attempts + 1
		blocked := attempts >= vc.MaxAttempts

		_, err = tx.ExecContext(ctx, `
			UPDATE verification_codes
			SET attempts = $2,
				used = CASE WHEN $3 THEN TRUE ELSE used END
			WHERE id = $1
		`, vc.ID, attempts, blocked)
		if err != nil {
			return false, fmt.Errorf("verification repository: update attempts: %w", err)
		}

		if err := tx.Commit(); err != nil {
			return false, fmt.Errorf("verification repository: commit transaction: %w", err)
		}

		return false, nil
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE verification_codes
		SET used = TRUE,
			attempts = attempts + 1
		WHERE id = $1
	`, vc.ID)
	if err != nil {
		return false, fmt.Errorf("verification repository: mark code as used: %w", err)
	}

	field, err := verifiedFieldByType(codeType)
	if err != nil {
		return false, err
	}

	_, err = tx.ExecContext(ctx, `UPDATE users SET `+field+` = TRUE WHERE id = $1`, userID)
	if err != nil {
		return false, fmt.Errorf("verification repository: update verification status: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return false, fmt.Errorf("verification repository: commit transaction: %w", err)
	}

	return true, nil
}

func (r *VerificationRepository) MarkCodeUsed(ctx context.Context, codeID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `UPDATE verification_codes SET used = TRUE WHERE id = $1`, codeID)
	if err != nil {
		return fmt.Errorf("verification repository: mark code used: %w", err)
	}

	return nil
}

func (r *VerificationRepository) CountCodesCreatedSince(ctx context.Context, userID uuid.UUID, codeType string, since time.Time) (int, error) {
	var count int
	err := r.db.GetContext(ctx, &count, `
		SELECT COUNT(*)
		FROM verification_codes
		WHERE user_id = $1 AND type = $2 AND created_at >= $3
	`, userID, codeType, since)
	if err != nil {
		return 0, fmt.Errorf("verification repository: count recent codes: %w", err)
	}

	return count, nil
}

func (r *VerificationRepository) GetLastCodeCreatedAt(ctx context.Context, userID uuid.UUID, codeType string) (*time.Time, error) {
	var createdAt time.Time
	err := r.db.GetContext(ctx, &createdAt, `
		SELECT created_at
		FROM verification_codes
		WHERE user_id = $1 AND type = $2
		ORDER BY created_at DESC
		LIMIT 1
	`, userID, codeType)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("verification repository: get last code timestamp: %w", err)
	}

	return &createdAt, nil
}

func (r *VerificationRepository) GetVerificationTarget(ctx context.Context, userID uuid.UUID, codeType string) (string, bool, error) {
	switch codeType {
	case models.VerificationTypeEmail:
		var email string
		var verified bool
		err := r.db.QueryRowContext(ctx, `
			SELECT email, email_verified
			FROM users
			WHERE id = $1
		`, userID).Scan(&email, &verified)
		if errors.Is(err, sql.ErrNoRows) {
			return "", false, ErrUserNotFound
		}
		if err != nil {
			return "", false, fmt.Errorf("verification repository: get email target: %w", err)
		}
		return strings.TrimSpace(email), verified, nil

	case models.VerificationTypePhone:
		var phone sql.NullString
		var verified bool
		err := r.db.QueryRowContext(ctx, `
			SELECT p.phone, u.phone_verified
			FROM users u
			LEFT JOIN profiles p ON p.user_id = u.id
			WHERE u.id = $1
		`, userID).Scan(&phone, &verified)
		if errors.Is(err, sql.ErrNoRows) {
			return "", false, ErrUserNotFound
		}
		if err != nil {
			return "", false, fmt.Errorf("verification repository: get phone target: %w", err)
		}
		if !phone.Valid {
			return "", verified, nil
		}
		return strings.TrimSpace(phone.String), verified, nil
	default:
		return "", false, fmt.Errorf("verification repository: unsupported verification type %q", codeType)
	}
}

func (r *VerificationRepository) GetUserVerificationStatus(ctx context.Context, userID uuid.UUID) (emailVerified, phoneVerified, identityVerified bool, err error) {
	err = r.db.QueryRowContext(ctx, `
		SELECT email_verified, phone_verified, identity_verified FROM users WHERE id = $1
	`, userID).Scan(&emailVerified, &phoneVerified, &identityVerified)
	return
}

func hashVerificationCode(code string) string {
	h := sha256.Sum256([]byte(code))
	return hex.EncodeToString(h[:])
}

func constantTimeEquals(left, right string) bool {
	if len(left) != len(right) {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(left), []byte(right)) == 1
}

func verifiedFieldByType(codeType string) (string, error) {
	switch codeType {
	case models.VerificationTypeEmail:
		return "email_verified", nil
	case models.VerificationTypePhone:
		return "phone_verified", nil
	default:
		return "", fmt.Errorf("verification repository: unsupported verification type %q", codeType)
	}
}
