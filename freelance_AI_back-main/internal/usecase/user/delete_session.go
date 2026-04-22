package user

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
)

type DeleteSessionUseCase struct {
	userRepo repository.UserRepository
}

func NewDeleteSessionUseCase(userRepo repository.UserRepository) *DeleteSessionUseCase {
	return &DeleteSessionUseCase{userRepo: userRepo}
}

func (uc *DeleteSessionUseCase) Run(ctx context.Context, userID, sessionID uuid.UUID) error {
	return uc.userRepo.DeleteSessionByUser(ctx, userID, sessionID)
}

type DeleteAllSessionsUseCase struct {
	userRepo repository.UserRepository
}

func NewDeleteAllSessionsUseCase(userRepo repository.UserRepository) *DeleteAllSessionsUseCase {
	return &DeleteAllSessionsUseCase{userRepo: userRepo}
}

func (uc *DeleteAllSessionsUseCase) Run(ctx context.Context, userID uuid.UUID) error {
	return uc.userRepo.DeleteAllSessions(ctx, userID)
}

type DeleteOtherSessionsUseCase struct {
	userRepo repository.UserRepository
}

func NewDeleteOtherSessionsUseCase(userRepo repository.UserRepository) *DeleteOtherSessionsUseCase {
	return &DeleteOtherSessionsUseCase{userRepo: userRepo}
}

func (uc *DeleteOtherSessionsUseCase) Run(ctx context.Context, userID uuid.UUID, refreshToken string) error {
	// 1. Find the session for this refresh token
	currentSession, err := uc.userRepo.GetSessionByRefreshToken(ctx, refreshToken)
	if err != nil {
		return fmt.Errorf("current session not found: %w", err)
	}

	// 2. Verify ownership
	if currentSession.UserID != userID {
		return fmt.Errorf("session does not belong to user")
	}

	// 3. Delete others
	return uc.userRepo.DeleteAllSessionsExcept(ctx, userID, currentSession.ID)
}
