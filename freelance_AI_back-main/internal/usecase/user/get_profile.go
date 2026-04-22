package user

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
)

// GetProfileUseCase handles retrieving a user profile.
type GetProfileUseCase struct {
	userRepo repository.UserRepository
}

// NewGetProfileUseCase creates a new GetProfileUseCase.
func NewGetProfileUseCase(userRepo repository.UserRepository) *GetProfileUseCase {
	return &GetProfileUseCase{userRepo: userRepo}
}

// Run executes the use case.
func (uc *GetProfileUseCase) Run(ctx context.Context, userID uuid.UUID) (*entity.Profile, error) {
	return uc.userRepo.GetProfile(ctx, userID)
}

// RunWithUserID executes the use case and returns user + profile by user ID.
func (uc *GetProfileUseCase) RunWithUserID(ctx context.Context, userID uuid.UUID) (*entity.User, *entity.Profile, error) {
	foundUser, err := uc.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, nil, err
	}

	profile, err := uc.userRepo.GetProfile(ctx, userID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get profile by user id: %w", err)
	}

	return foundUser, profile, nil
}

// RunByUsername executes the use case by username and returns profile with user meta.
func (uc *GetProfileUseCase) RunByUsername(ctx context.Context, username string) (*entity.User, *entity.Profile, error) {
	user, err := uc.userRepo.GetByUsername(ctx, username)
	if err != nil {
		return nil, nil, err
	}

	profile, err := uc.userRepo.GetProfile(ctx, user.ID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get profile by username: %w", err)
	}

	return user, profile, nil
}
