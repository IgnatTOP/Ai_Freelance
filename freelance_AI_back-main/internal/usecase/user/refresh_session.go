package user

import (
	"context"
	"fmt"

	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
	"github.com/ignatzorin/freelance-backend/internal/infrastructure/security"
)

type RefreshSessionUseCase struct {
	userRepo     repository.UserRepository
	tokenManager *security.TokenManager
}

func NewRefreshSessionUseCase(userRepo repository.UserRepository, tokenManager *security.TokenManager) *RefreshSessionUseCase {
	return &RefreshSessionUseCase{
		userRepo:     userRepo,
		tokenManager: tokenManager,
	}
}

func (uc *RefreshSessionUseCase) Run(ctx context.Context, refreshToken string) (*AuthResult, error) {
	// 1. Verify refresh token format/signature
	_, err := uc.tokenManager.ParseRefresh(refreshToken)
	if err != nil {
		return nil, fmt.Errorf("invalid refresh token: %w", err)
	}

	// 2. Check if session exists in DB
	session, err := uc.userRepo.GetSessionByRefreshToken(ctx, refreshToken)
	if err != nil {
		return nil, fmt.Errorf("session not found: %w", err)
	}

	// 3. User might be inactive or deleted, check user
	user, err := uc.userRepo.GetByID(ctx, session.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// 4. Generate new pair
	tokenPair, _, refreshExp, err := uc.tokenManager.GeneratePair(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	// 5. Rotate session (Delete old, create new)
	if err := uc.userRepo.DeleteSession(ctx, session.ID); err != nil {
		// Log but continue? Ideally transactional.
	}

	newSession := &entity.Session{
		UserID:       user.ID,
		RefreshToken: tokenPair.RefreshToken,
		ExpiresAt:    refreshExp,
	}
	// Add metadata like IP if available

	if err := uc.userRepo.CreateSession(ctx, newSession); err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	return &AuthResult{
		User:      user,
		TokenPair: tokenPair,
	}, nil
}
