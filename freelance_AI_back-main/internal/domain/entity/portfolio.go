package entity

import (
	"time"

	"github.com/google/uuid"
)

// PortfolioItem represents a portfolio work.
type PortfolioItem struct {
	ID           uuid.UUID
	UserID       uuid.UUID
	Title        string
	Description  *string
	CoverMediaID *uuid.UUID
	AITags       []string
	ExternalLink *string
	MediaIDs     []uuid.UUID
	CreatedAt    time.Time
}
