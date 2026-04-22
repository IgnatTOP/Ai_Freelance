package persistence

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/pkg/apperror"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

// UserRepositoryAdapter implements UserRepository interface.
type UserRepositoryAdapter struct {
	db *sqlx.DB
}

// NewUserRepositoryAdapter creates a new user repository adapter.
func NewUserRepositoryAdapter(db *sqlx.DB) *UserRepositoryAdapter {
	return &UserRepositoryAdapter{db: db}
}

// Create inserts a new user into the database.
func (r *UserRepositoryAdapter) Create(ctx context.Context, user *entity.User) error {
	query := `
		INSERT INTO users (id, email, username, password_hash, role, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.db.ExecContext(ctx, query,
		user.ID,
		user.Email,
		user.Username,
		user.PasswordHash,
		user.Role,
		user.IsActive,
		user.CreatedAt,
		user.UpdatedAt,
	)
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to create user")
	}
	return nil
}

// Update updates an existing user.
func (r *UserRepositoryAdapter) Update(ctx context.Context, user *entity.User) error {
	query := `
		UPDATE users
		SET email = $2, username = $3, password_hash = $4, role = $5, is_active = $6, last_login_at = $7, updated_at = $8
		WHERE id = $1
	`
	_, err := r.db.ExecContext(ctx, query,
		user.ID,
		user.Email,
		user.Username,
		user.PasswordHash,
		user.Role,
		user.IsActive,
		user.LastLoginAt,
		user.UpdatedAt,
	)
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to update user")
	}
	return nil
}

// GetByID retrieves a user by their ID.
func (r *UserRepositoryAdapter) GetByID(ctx context.Context, id uuid.UUID) (*entity.User, error) {
	var user entity.User
	query := `SELECT id, email, username, password_hash, role, is_active, last_login_at, created_at, updated_at FROM users WHERE id = $1`
	if err := r.db.GetContext(ctx, &user, query, id); err != nil {
		if err == sql.ErrNoRows {
			return nil, apperror.ErrUserNotFound
		}
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to get user by id")
	}
	return &user, nil
}

// GetByEmail retrieves a user by their email.
func (r *UserRepositoryAdapter) GetByEmail(ctx context.Context, email string) (*entity.User, error) {
	var user entity.User
	query := `SELECT id, email, username, password_hash, role, is_active, last_login_at, created_at, updated_at FROM users WHERE email = $1`
	if err := r.db.GetContext(ctx, &user, query, email); err != nil {
		if err == sql.ErrNoRows {
			return nil, apperror.ErrUserNotFound
		}
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to get user by email")
	}
	return &user, nil
}

// GetByUsername retrieves a user by their username.
func (r *UserRepositoryAdapter) GetByUsername(ctx context.Context, username string) (*entity.User, error) {
	var user entity.User
	query := `SELECT id, email, username, password_hash, role, is_active, last_login_at, created_at, updated_at FROM users WHERE username = $1`
	if err := r.db.GetContext(ctx, &user, query, username); err != nil {
		if err == sql.ErrNoRows {
			return nil, apperror.ErrUserNotFound
		}
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to get user by username")
	}
	return &user, nil
}

// GetProfile retrieves a user's profile.
func (r *UserRepositoryAdapter) GetProfile(ctx context.Context, userID uuid.UUID) (*entity.Profile, error) {
	var profile entity.Profile
	var skills pq.StringArray
	query := `SELECT user_id, display_name, bio, hourly_rate, experience_level, skills, location, photo_id, ai_summary, phone, telegram, website, company_name, inn, onboarding_completed_at, updated_at FROM profiles WHERE user_id = $1`

	if err := r.db.QueryRowxContext(ctx, query, userID).Scan(
		&profile.UserID,
		&profile.DisplayName,
		&profile.Bio,
		&profile.HourlyRate,
		&profile.ExperienceLevel,
		&skills,
		&profile.Location,
		&profile.PhotoID,
		&profile.AISummary,
		&profile.Phone,
		&profile.Telegram,
		&profile.Website,
		&profile.CompanyName,
		&profile.INN,
		&profile.OnboardingCompletedAt,
		&profile.UpdatedAt,
	); err != nil {
		if err == sql.ErrNoRows {
			// If profile not found, maybe return nil or specific error?
			// The logic usually expects a profile to exist if the user exists in some flows, but strictly speaking it might be missing.
			return nil, apperror.ErrUserNotFound // Or ErrProfileNotFound
		}
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to get profile")
	}
	profile.Skills = []string(skills)
	return &profile, nil
}

// UpdateProfile updates a user's profile.
func (r *UserRepositoryAdapter) UpdateProfile(ctx context.Context, profile *entity.Profile) error {
	if profile.Skills == nil {
		profile.Skills = []string{}
	}

	query := `
		INSERT INTO profiles (user_id, display_name, bio, hourly_rate, experience_level, skills, location, photo_id, ai_summary, phone, telegram, website, company_name, inn, onboarding_completed_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		ON CONFLICT (user_id) DO UPDATE SET
			display_name = EXCLUDED.display_name,
			bio = EXCLUDED.bio,
			hourly_rate = EXCLUDED.hourly_rate,
			experience_level = EXCLUDED.experience_level,
			skills = EXCLUDED.skills,
			location = EXCLUDED.location,
			photo_id = EXCLUDED.photo_id,
			ai_summary = EXCLUDED.ai_summary,
			phone = EXCLUDED.phone,
			telegram = EXCLUDED.telegram,
			website = EXCLUDED.website,
			company_name = EXCLUDED.company_name,
			inn = EXCLUDED.inn,
			onboarding_completed_at = COALESCE(EXCLUDED.onboarding_completed_at, profiles.onboarding_completed_at),
			updated_at = EXCLUDED.updated_at
	`

	_, err := r.db.ExecContext(ctx, query,
		profile.UserID,
		profile.DisplayName,
		profile.Bio,
		profile.HourlyRate,
		profile.ExperienceLevel,
		pq.Array(profile.Skills),
		profile.Location,
		profile.PhotoID,
		profile.AISummary,
		profile.Phone,
		profile.Telegram,
		profile.Website,
		profile.CompanyName,
		profile.INN,
		profile.OnboardingCompletedAt,
		profile.UpdatedAt,
	)
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to update profile")
	}
	return nil
}

// CreateSession creates a new session.
func (r *UserRepositoryAdapter) CreateSession(ctx context.Context, session *entity.Session) error {
	query := `
		INSERT INTO user_sessions (user_id, refresh_token, user_agent, ip_address, expires_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`
	err := r.db.QueryRowxContext(
		ctx,
		query,
		session.UserID,
		session.RefreshToken,
		session.UserAgent,
		session.IPAddress,
		session.ExpiresAt,
	).Scan(&session.ID, &session.CreatedAt)
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to create session")
	}
	return nil
}

// GetSessionByRefreshToken retrieves a session by refresh token.
func (r *UserRepositoryAdapter) GetSessionByRefreshToken(ctx context.Context, refreshToken string) (*entity.Session, error) {
	var session entity.Session
	query := `SELECT id, user_id, refresh_token, user_agent, ip_address, expires_at, created_at FROM user_sessions WHERE refresh_token = $1`
	if err := r.db.GetContext(ctx, &session, query, refreshToken); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("session not found")
		}
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to get session")
	}
	return &session, nil
}

// DeleteSession deletes a session by ID.
func (r *UserRepositoryAdapter) DeleteSession(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM user_sessions WHERE id = $1`
	if _, err := r.db.ExecContext(ctx, query, id); err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to delete session")
	}
	return nil
}

// DeleteSessionByUser deletes a session by ID only if it belongs to the user.
func (r *UserRepositoryAdapter) DeleteSessionByUser(ctx context.Context, userID, sessionID uuid.UUID) error {
	query := `DELETE FROM user_sessions WHERE id = $1 AND user_id = $2`
	res, err := r.db.ExecContext(ctx, query, sessionID, userID)
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to delete session by user")
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to read delete session result")
	}
	if rows == 0 {
		return apperror.ErrForbidden
	}

	return nil
}

// DeleteAllSessions deletes all sessions for a user.
func (r *UserRepositoryAdapter) DeleteAllSessions(ctx context.Context, userID uuid.UUID) error {
	query := `DELETE FROM user_sessions WHERE user_id = $1`
	if _, err := r.db.ExecContext(ctx, query, userID); err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to delete user sessions")
	}
	return nil
}

// DeleteAllSessionsExcept deletes all sessions for a user except the specified one.
func (r *UserRepositoryAdapter) DeleteAllSessionsExcept(ctx context.Context, userID uuid.UUID, sessionID uuid.UUID) error {
	query := `DELETE FROM user_sessions WHERE user_id = $1 AND id != $2`
	if _, err := r.db.ExecContext(ctx, query, userID, sessionID); err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to delete other sessions")
	}
	return nil
}

// ListSessions retrieves all sessions for a user.
func (r *UserRepositoryAdapter) ListSessions(ctx context.Context, userID uuid.UUID) ([]entity.Session, error) {
	var sessions []entity.Session
	query := `SELECT id, user_id, refresh_token, user_agent, ip_address, expires_at, created_at FROM user_sessions WHERE user_id = $1 ORDER BY created_at DESC`
	if err := r.db.SelectContext(ctx, &sessions, query, userID); err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to list sessions")
	}
	return sessions, nil
}
