package user

import (
	"context"
	"fmt"
	"time"

	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
	"github.com/ignatzorin/freelance-backend/internal/infrastructure/security"
	"github.com/ignatzorin/freelance-backend/internal/pkg/apperror"
	"golang.org/x/crypto/bcrypt"
)

// RegisterUserInput defines the input for registering a user.
type RegisterUserInput struct {
	Email    string `json:"email" binding:"required,email"`
	Username string `json:"username" binding:"required,min=3"`
	Password string `json:"password" binding:"required,min=8"`
	Role     string `json:"role" binding:"required,oneof=client freelancer"`
}

// RegisterUserUseCase handles user registration.
type RegisterUserUseCase struct {
	userRepo     repository.UserRepository
	tokenManager *security.TokenManager
}

// NewRegisterUserUseCase creates a new RegisterUserUseCase.
func NewRegisterUserUseCase(userRepo repository.UserRepository, tokenManager *security.TokenManager) *RegisterUserUseCase {
	return &RegisterUserUseCase{
		userRepo:     userRepo,
		tokenManager: tokenManager,
	}
}

// Run executes the use case.
func (uc *RegisterUserUseCase) Run(ctx context.Context, input RegisterUserInput) (*AuthResult, error) {
	// 1. Check if user already exists
	if _, err := uc.userRepo.GetByEmail(ctx, input.Email); err == nil {
		return nil, apperror.New(apperror.ErrCodeConflict, "user with this email already exists")
	}
	if _, err := uc.userRepo.GetByUsername(ctx, input.Username); err == nil {
		return nil, apperror.New(apperror.ErrCodeConflict, "user with this username already exists")
	}

	// 2. Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// 3. Create user entity
	user := entity.NewUser(input.Email, input.Username, string(hashedPassword), input.Role)

	// 4. Save to repository
	if err := uc.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	// 5. Create basic profile
	profile := &entity.Profile{
		UserID:    user.ID,
		UpdatedAt: time.Now(),
	}
	// Attempt to create profile, ignore error if duplicate (but it shouldn't be for new user)
	// Actually, UpdateProfile does upsert in our adapter, so we can use that.
	_ = uc.userRepo.UpdateProfile(ctx, profile)

	// 6. Generate tokens
	tokenPair, _, refreshExp, err := uc.tokenManager.GeneratePair(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	// 7. Create session
	session := &entity.Session{
		UserID:       user.ID,
		RefreshToken: tokenPair.RefreshToken,
		ExpiresAt:    refreshExp,
	}
	if err := uc.userRepo.CreateSession(ctx, session); err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	return &AuthResult{
		User:      user,
		TokenPair: tokenPair,
	}, nil
}
