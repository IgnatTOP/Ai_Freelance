package user

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/infrastructure/security"
	"github.com/stretchr/testify/assert"
)

// MockUserRepository implements repository.UserRepository for testing.
type MockUserRepository struct {
	users    map[uuid.UUID]*entity.User
	profiles map[uuid.UUID]*entity.Profile
	sessions map[uuid.UUID]*entity.Session
}

func NewMockUserRepository() *MockUserRepository {
	return &MockUserRepository{
		users:    make(map[uuid.UUID]*entity.User),
		profiles: make(map[uuid.UUID]*entity.Profile),
		sessions: make(map[uuid.UUID]*entity.Session),
	}
}

func (m *MockUserRepository) Create(ctx context.Context, user *entity.User) error {
	m.users[user.ID] = user
	return nil
}

func (m *MockUserRepository) Update(ctx context.Context, user *entity.User) error {
	m.users[user.ID] = user
	return nil
}

func (m *MockUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.User, error) {
	if user, ok := m.users[id]; ok {
		return user, nil
	}
	return nil, fmt.Errorf("user not found")
}

func (m *MockUserRepository) GetByEmail(ctx context.Context, email string) (*entity.User, error) {
	for _, user := range m.users {
		if user.Email == email {
			return user, nil
		}
	}
	return nil, fmt.Errorf("user not found")
}

func (m *MockUserRepository) GetByUsername(ctx context.Context, username string) (*entity.User, error) {
	for _, user := range m.users {
		if user.Username == username {
			return user, nil
		}
	}
	return nil, fmt.Errorf("user not found")
}

func (m *MockUserRepository) GetProfile(ctx context.Context, userID uuid.UUID) (*entity.Profile, error) {
	if profile, ok := m.profiles[userID]; ok {
		return profile, nil
	}
	return nil, nil // Adapter returns nil if not found potentially, or error
}

func (m *MockUserRepository) UpdateProfile(ctx context.Context, profile *entity.Profile) error {
	m.profiles[profile.UserID] = profile
	return nil
}

func (m *MockUserRepository) CreateSession(ctx context.Context, session *entity.Session) error {
	m.sessions[session.UserID] = session // Simple mock, one session per user for now
	return nil
}

func (m *MockUserRepository) GetSessionByRefreshToken(ctx context.Context, refreshToken string) (*entity.Session, error) {
	return nil, nil
}

func (m *MockUserRepository) DeleteSession(ctx context.Context, id uuid.UUID) error {
	return nil
}

func (m *MockUserRepository) DeleteSessionByUser(ctx context.Context, userID, sessionID uuid.UUID) error {
	return nil
}

func (m *MockUserRepository) DeleteAllSessions(ctx context.Context, userID uuid.UUID) error {
	return nil
}

func (m *MockUserRepository) DeleteAllSessionsExcept(ctx context.Context, userID uuid.UUID, sessionID uuid.UUID) error {
	return nil
}

func (m *MockUserRepository) ListSessions(ctx context.Context, userID uuid.UUID) ([]entity.Session, error) {
	return nil, nil
}

func TestRegisterUserUseCase_Run(t *testing.T) {
	repo := NewMockUserRepository()
	tokenManager := security.NewTokenManager("secret", "refresh", time.Hour, time.Hour*24)
	uc := NewRegisterUserUseCase(repo, tokenManager)

	ctx := context.Background()
	input := RegisterUserInput{
		Email:    "test@example.com",
		Username: "testuser",
		Password: "password123",
		Role:     "freelancer",
	}

	// Test successful registration
	result, err := uc.Run(ctx, input)
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.NotNil(t, result.User)
	assert.NotNil(t, result.TokenPair)

	user := result.User
	assert.Equal(t, input.Email, user.Email)
	assert.Equal(t, input.Username, user.Username)
	assert.Equal(t, input.Role, user.Role)
	assert.NotEqual(t, input.Password, user.PasswordHash) // Password should be hashed

	// Verify persistence
	persistedUser, _ := repo.GetByEmail(ctx, input.Email)
	assert.NotNil(t, persistedUser)
	assert.Equal(t, user.ID, persistedUser.ID)

	// Verify profile creation
	profile, _ := repo.GetProfile(ctx, user.ID)
	if profile == nil {
		t.Fatal("profile should not be nil")
	}
	assert.Equal(t, user.ID, profile.UserID)

	// Verify session creation (indirectly via no error and TokenPair return)
	assert.NotEmpty(t, result.TokenPair.AccessToken)

	// Test duplicate email
	_, err = uc.Run(ctx, input)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "already exists")
}
