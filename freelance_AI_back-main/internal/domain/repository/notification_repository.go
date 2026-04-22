package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
)

// NotificationRepository defines the interface for notification persistence.
type NotificationRepository interface {
	Create(ctx context.Context, notification *entity.Notification) error
	GetByID(ctx context.Context, userID, id uuid.UUID) (*entity.Notification, error)
	List(ctx context.Context, userID uuid.UUID, limit, offset int) ([]entity.Notification, error)
	Delete(ctx context.Context, userID, id uuid.UUID) error
	MarkAsRead(ctx context.Context, userID, id uuid.UUID) error
	MarkAllAsRead(ctx context.Context, userID uuid.UUID) error
	GetUnreadCount(ctx context.Context, userID uuid.UUID) (int, error)
}
