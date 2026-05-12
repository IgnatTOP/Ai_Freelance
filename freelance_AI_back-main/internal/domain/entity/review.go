package entity

import (
	"time"

	"github.com/google/uuid"
)

// Review represents a user review.
type Review struct {
	ID         uuid.UUID `json:"id"`
	OrderID    uuid.UUID `json:"order_id"`
	ReviewerID uuid.UUID `json:"reviewer_id"`
	ReviewedID uuid.UUID `json:"reviewed_id"`
	Rating     int       `json:"rating"`
	Comment    *string   `json:"comment,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}
