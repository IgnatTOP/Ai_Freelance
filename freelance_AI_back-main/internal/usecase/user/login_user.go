package user

import (
	"context"
	"fmt"
	"time"

	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
	"github.com/ignatzorin/freelance-backend/internal/infrastructure/security"
	"golang.org/x/crypto/bcrypt"
)

// LoginUserInput defines the input for user login.
type LoginUserInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// LoginUserUseCase handles user login.
type LoginUserUseCase struct {
	userRepo     repository.UserRepository
	tokenManager *security.TokenManager
}

// NewLoginUserUseCase creates a new LoginUserUseCase.
func NewLoginUserUseCase(userRepo repository.UserRepository, tokenManager *security.TokenManager) *LoginUserUseCase {
	return &LoginUserUseCase{
		userRepo:     userRepo,
		tokenManager: tokenManager,
	}
}

// Run executes the use case.
func (uc *LoginUserUseCase) Run(ctx context.Context, input LoginUserInput) (*AuthResult, error) {
	// 1. Find user by email
	user, err := uc.userRepo.GetByEmail(ctx, input.Email)
	if err != nil {
		return nil, fmt.Errorf("invalid credentials") // Don't reveal if user exists
	}

	// 2. Compare passwords
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return nil, fmt.Errorf("invalid credentials")
	}

	// 3. Update last login
	now := time.Now()
	user.LastLoginAt = &now
	if err := uc.userRepo.Update(ctx, user); err != nil {
		// Log error but continue
	}

	// 4. Generate tokens
	tokenPair, _, refreshExp, err := uc.tokenManager.GeneratePair(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	// 5. Create session
	session := &entity.Session{
		UserID:       user.ID,
		RefreshToken: tokenPair.RefreshToken,
		ExpiresAt:    refreshExp,
	}
	// TODO: Add IP/UserAgent if available in handler and passed via input
	if err := uc.userRepo.CreateSession(ctx, session); err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	return &AuthResult{
		User:      user,
		TokenPair: tokenPair,
	}, nil
}
