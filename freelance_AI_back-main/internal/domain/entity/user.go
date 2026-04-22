package entity

import (
	"time"

	"github.com/google/uuid"
)

// User represents a user in the system.
type User struct {
	ID           uuid.UUID  `json:"id" db:"id"`
	Email        string     `json:"email" db:"email"`
	Username     string     `json:"username" db:"username"`
	PasswordHash string     `json:"-" db:"password_hash"`
	Role         string     `json:"role" db:"role"`
	IsActive     bool       `json:"is_active" db:"is_active"`
	LastLoginAt  *time.Time `json:"last_login_at" db:"last_login_at"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`

	// Profile information
	Profile *Profile `json:"profile,omitempty"`
}

// Profile represents a user's profile.
type Profile struct {
	UserID                uuid.UUID  `json:"user_id" db:"user_id"`
	DisplayName           string     `json:"display_name" db:"display_name"`
	Bio                   *string    `json:"bio" db:"bio"`
	HourlyRate            *float64   `json:"hourly_rate" db:"hourly_rate"`
	ExperienceLevel       string     `json:"experience_level" db:"experience_level"`
	Skills                []string   `json:"skills" db:"skills"`
	Location              *string    `json:"location" db:"location"`
	PhotoID               *uuid.UUID `json:"photo_id" db:"photo_id"`
	AISummary             *string    `json:"ai_summary" db:"ai_summary"`
	Phone                 *string    `json:"phone" db:"phone"`
	Telegram              *string    `json:"telegram" db:"telegram"`
	Website               *string    `json:"website" db:"website"`
	CompanyName           *string    `json:"company_name" db:"company_name"`
	INN                   *string    `json:"inn" db:"inn"`
	OnboardingCompletedAt *time.Time `json:"onboarding_completed_at" db:"onboarding_completed_at"`
	UpdatedAt             time.Time  `json:"updated_at" db:"updated_at"`
}

// Session represents a user session.
type Session struct {
	ID           uuid.UUID `json:"id" db:"id"`
	UserID       uuid.UUID `json:"user_id" db:"user_id"`
	RefreshToken string    `json:"refresh_token" db:"refresh_token"`
	UserAgent    *string   `json:"user_agent" db:"user_agent"`
	IPAddress    *string   `json:"ip_address" db:"ip_address"`
	ExpiresAt    time.Time `json:"expires_at" db:"expires_at"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

// NewUser creates a new user with default values.
func NewUser(email, username, passwordHash, role string) *User {
	now := time.Now()
	return &User{
		ID:           uuid.New(),
		Email:        email,
		Username:     username,
		PasswordHash: passwordHash,
		Role:         role,
		IsActive:     true,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
}
