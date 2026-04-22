package models

import (
	"time"

	"github.com/google/uuid"
)

const (
	VerificationTypeEmail = "email"
	VerificationTypePhone = "phone"
)

type VerificationCode struct {
	ID          uuid.UUID `db:"id" json:"id"`
	UserID      uuid.UUID `db:"user_id" json:"user_id"`
	Type        string    `db:"type" json:"type"`
	Code        string    `db:"code" json:"-"`
	ExpiresAt   time.Time `db:"expires_at" json:"expires_at"`
	Used        bool      `db:"used" json:"used"`
	Attempts    int       `db:"attempts" json:"attempts"`
	MaxAttempts int       `db:"max_attempts" json:"max_attempts"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
}
