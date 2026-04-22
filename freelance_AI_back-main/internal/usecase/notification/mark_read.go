package notification

import (
	"context"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
)

// MarkReadUseCase handles marking notifications as read.
type MarkReadUseCase struct {
	notificationRepo repository.NotificationRepository
}

// NewMarkReadUseCase creates a new MarkReadUseCase.
func NewMarkReadUseCase(notificationRepo repository.NotificationRepository) *MarkReadUseCase {
	return &MarkReadUseCase{notificationRepo: notificationRepo}
}

// Run executes the use case.
func (uc *MarkReadUseCase) Run(ctx context.Context, userID, id uuid.UUID) error {
	return uc.notificationRepo.MarkAsRead(ctx, userID, id)
}

// MarkAllReadUseCase handles marking all notifications as read.
type MarkAllReadUseCase struct {
	notificationRepo repository.NotificationRepository
}

func NewMarkAllReadUseCase(notificationRepo repository.NotificationRepository) *MarkAllReadUseCase {
	return &MarkAllReadUseCase{notificationRepo: notificationRepo}
}

func (uc *MarkAllReadUseCase) Run(ctx context.Context, userID uuid.UUID) error {
	return uc.notificationRepo.MarkAllAsRead(ctx, userID)
}
