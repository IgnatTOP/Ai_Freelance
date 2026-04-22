package user

import (
	"context"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
)

type ListSessionsUseCase struct {
	userRepo repository.UserRepository
}

func NewListSessionsUseCase(userRepo repository.UserRepository) *ListSessionsUseCase {
	return &ListSessionsUseCase{userRepo: userRepo}
}

func (uc *ListSessionsUseCase) Run(ctx context.Context, userID uuid.UUID) ([]entity.Session, error) {
	return uc.userRepo.ListSessions(ctx, userID)
}
