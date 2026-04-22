package persistence

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/pkg/apperror"
	"github.com/jmoiron/sqlx"
)

// NotificationRepositoryAdapter implements NotificationRepository interface.
type NotificationRepositoryAdapter struct {
	db *sqlx.DB
}

// NewNotificationRepositoryAdapter creates a new notification repository adapter.
func NewNotificationRepositoryAdapter(db *sqlx.DB) *NotificationRepositoryAdapter {
	return &NotificationRepositoryAdapter{db: db}
}

// Create creates a new notification.
func (r *NotificationRepositoryAdapter) Create(ctx context.Context, notification *entity.Notification) error {
	query := `
		INSERT INTO notifications (id, user_id, payload, is_read, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := r.db.ExecContext(ctx, query,
		notification.ID,
		notification.UserID,
		notification.Payload,
		notification.IsRead,
		notification.CreatedAt,
	)
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to create notification")
	}
	return nil
}

// GetByID retrieves a notification by id for the owner.
func (r *NotificationRepositoryAdapter) GetByID(ctx context.Context, userID, id uuid.UUID) (*entity.Notification, error) {
	var notification entity.Notification
	query := `
		SELECT id, user_id, payload, is_read, created_at
		FROM notifications
		WHERE id = $1 AND user_id = $2
	`
	if err := r.db.GetContext(ctx, &notification, query, id, userID); err != nil {
		if err == sql.ErrNoRows {
			return nil, apperror.Wrap(err, apperror.ErrCodeNotFound, "notification not found")
		}
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to get notification")
	}
	return &notification, nil
}

// List retrieves notifications for a user.
func (r *NotificationRepositoryAdapter) List(ctx context.Context, userID uuid.UUID, limit, offset int) ([]entity.Notification, error) {
	var notifications []entity.Notification
	query := `
		SELECT id, user_id, payload, is_read, created_at
		FROM notifications
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	if err := r.db.SelectContext(ctx, &notifications, query, userID, limit, offset); err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to list notifications")
	}
	return notifications, nil
}

// MarkAsRead marks a notification as read only for the owner.
func (r *NotificationRepositoryAdapter) MarkAsRead(ctx context.Context, userID, id uuid.UUID) error {
	query := `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`
	res, err := r.db.ExecContext(ctx, query, id, userID)
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to mark notification as read")
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to read mark-as-read result")
	}
	if rows == 0 {
		return apperror.Wrap(sql.ErrNoRows, apperror.ErrCodeNotFound, "notification not found")
	}
	return nil
}

// Delete removes a notification by id for the owner.
func (r *NotificationRepositoryAdapter) Delete(ctx context.Context, userID, id uuid.UUID) error {
	query := `DELETE FROM notifications WHERE id = $1 AND user_id = $2`
	res, err := r.db.ExecContext(ctx, query, id, userID)
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to delete notification")
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to read delete-notification result")
	}
	if rows == 0 {
		return apperror.Wrap(sql.ErrNoRows, apperror.ErrCodeNotFound, "notification not found")
	}
	return nil
}

// MarkAllAsRead marks all user notifications as read.
func (r *NotificationRepositoryAdapter) MarkAllAsRead(ctx context.Context, userID uuid.UUID) error {
	query := `UPDATE notifications SET is_read = true WHERE user_id = $1`
	if _, err := r.db.ExecContext(ctx, query, userID); err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to mark all notifications as read")
	}
	return nil
}

// GetUnreadCount returns the number of unread notifications.
func (r *NotificationRepositoryAdapter) GetUnreadCount(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`
	if err := r.db.GetContext(ctx, &count, query, userID); err != nil {
		return 0, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to get unread count")
	}
	return count, nil
}
