package notification

import (
	"context"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
)

// ListNotificationsUseCase handles listing notifications.
type ListNotificationsUseCase struct {
	notificationRepo repository.NotificationRepository
}

// NewListNotificationsUseCase creates a new ListNotificationsUseCase.
func NewListNotificationsUseCase(notificationRepo repository.NotificationRepository) *ListNotificationsUseCase {
	return &ListNotificationsUseCase{notificationRepo: notificationRepo}
}

// Run executes the use case.
func (uc *ListNotificationsUseCase) Run(ctx context.Context, userID uuid.UUID, limit, offset int) ([]entity.Notification, int, error) {
	notifications, err := uc.notificationRepo.List(ctx, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	unreadCount, err := uc.notificationRepo.GetUnreadCount(ctx, userID)
	if err != nil {
		return nil, 0, err
	}

	return notifications, unreadCount, nil
}
