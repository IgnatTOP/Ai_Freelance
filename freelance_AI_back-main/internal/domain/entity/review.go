package entity

import (
	"time"

	"github.com/google/uuid"
)

// Review represents a user review.
type Review struct {
	ID         uuid.UUID
	OrderID    uuid.UUID
	ReviewerID uuid.UUID
	ReviewedID uuid.UUID
	Rating     int
	Comment    *string
	CreatedAt  time.Time
	UpdatedAt  time.Time
}
