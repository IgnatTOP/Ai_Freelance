package entity

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Notification represents a user notification.
type Notification struct {
	ID        uuid.UUID       `db:"id"`
	UserID    uuid.UUID       `db:"user_id"`
	Payload   json.RawMessage `db:"payload"`
	IsRead    bool            `db:"is_read"`
	CreatedAt time.Time       `db:"created_at"`
}
