package notification

import (
	"context"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
)

// GetNotificationUseCase returns a single notification for the owner.
type GetNotificationUseCase struct {
	notificationRepo repository.NotificationRepository
}

func NewGetNotificationUseCase(notificationRepo repository.NotificationRepository) *GetNotificationUseCase {
	return &GetNotificationUseCase{notificationRepo: notificationRepo}
}

func (uc *GetNotificationUseCase) Run(ctx context.Context, userID, id uuid.UUID) (*entity.Notification, error) {
	return uc.notificationRepo.GetByID(ctx, userID, id)
}

// DeleteNotificationUseCase deletes a single notification for the owner.
type DeleteNotificationUseCase struct {
	notificationRepo repository.NotificationRepository
}

func NewDeleteNotificationUseCase(notificationRepo repository.NotificationRepository) *DeleteNotificationUseCase {
	return &DeleteNotificationUseCase{notificationRepo: notificationRepo}
}

func (uc *DeleteNotificationUseCase) Run(ctx context.Context, userID, id uuid.UUID) error {
	return uc.notificationRepo.Delete(ctx, userID, id)
}

// CountUnreadNotificationsUseCase returns unread notifications count.
type CountUnreadNotificationsUseCase struct {
	notificationRepo repository.NotificationRepository
}

func NewCountUnreadNotificationsUseCase(notificationRepo repository.NotificationRepository) *CountUnreadNotificationsUseCase {
	return &CountUnreadNotificationsUseCase{notificationRepo: notificationRepo}
}

func (uc *CountUnreadNotificationsUseCase) Run(ctx context.Context, userID uuid.UUID) (int, error) {
	return uc.notificationRepo.GetUnreadCount(ctx, userID)
}
