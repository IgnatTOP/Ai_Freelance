package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
)

// UserRepository defines the interface for user persistence.
type UserRepository interface {
	Create(ctx context.Context, user *entity.User) error
	Update(ctx context.Context, user *entity.User) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.User, error)
	GetByEmail(ctx context.Context, email string) (*entity.User, error)
	GetByUsername(ctx context.Context, username string) (*entity.User, error)
	GetProfile(ctx context.Context, userID uuid.UUID) (*entity.Profile, error)
	UpdateProfile(ctx context.Context, profile *entity.Profile) error

	// Session management
	CreateSession(ctx context.Context, session *entity.Session) error
	GetSessionByRefreshToken(ctx context.Context, refreshToken string) (*entity.Session, error)
	DeleteSession(ctx context.Context, id uuid.UUID) error
	DeleteSessionByUser(ctx context.Context, userID, sessionID uuid.UUID) error
	DeleteAllSessions(ctx context.Context, userID uuid.UUID) error
	DeleteAllSessionsExcept(ctx context.Context, userID uuid.UUID, sessionID uuid.UUID) error
	ListSessions(ctx context.Context, userID uuid.UUID) ([]entity.Session, error)
}
