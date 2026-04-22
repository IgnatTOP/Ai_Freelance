package user

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
)

type UpdateRoleUseCase struct {
	userRepo repository.UserRepository
}

func NewUpdateRoleUseCase(userRepo repository.UserRepository) *UpdateRoleUseCase {
	return &UpdateRoleUseCase{userRepo: userRepo}
}

func (uc *UpdateRoleUseCase) Run(ctx context.Context, userID uuid.UUID, role string) (*entity.User, error) {
	// 1. Get user
	user, err := uc.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// 2. Update role
	// Validate role?
	if role != "client" && role != "freelancer" && role != "admin" {
		return nil, fmt.Errorf("invalid role")
	}

	user.Role = role

	// 3. Save
	if err := uc.userRepo.Update(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	return user, nil
}
