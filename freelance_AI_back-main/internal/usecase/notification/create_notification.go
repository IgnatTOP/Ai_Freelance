package notification

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
)

// CreateNotificationUseCase handles notification creation.
type CreateNotificationUseCase struct {
	notificationRepo repository.NotificationRepository
}

// NewCreateNotificationUseCase creates a new CreateNotificationUseCase.
func NewCreateNotificationUseCase(notificationRepo repository.NotificationRepository) *CreateNotificationUseCase {
	return &CreateNotificationUseCase{notificationRepo: notificationRepo}
}

// Run executes the use case.
func (uc *CreateNotificationUseCase) Run(ctx context.Context, userID uuid.UUID, payload interface{}) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	notification := &entity.Notification{
		ID:        uuid.New(),
		UserID:    userID,
		Payload:   jsonPayload,
		IsRead:    false,
		CreatedAt: time.Now(),
	}

	return uc.notificationRepo.Create(ctx, notification)
}
