package service

import (
	"time"

	"github.com/google/uuid"

	"github.com/ignatzorin/freelance-backend/internal/models"
)

// CreateOrderInput описывает входные данные.
type CreateOrderInput struct {
	ClientID      uuid.UUID
	Title         string
	Description   string
	BudgetMin     *float64
	BudgetMax     *float64
	DeadlineAt    *time.Time
	Requirements  []models.OrderRequirement
	AttachmentIDs []uuid.UUID
}

// UpdateOrderInput описывает входные данные для обновления заказа.
type UpdateOrderInput struct {
	OrderID       uuid.UUID
	ClientID      uuid.UUID
	Title         string
	Description   string
	BudgetMin     *float64
	BudgetMax     *float64
	Status        string
	DeadlineAt    *time.Time
	Requirements  []models.OrderRequirement
	AttachmentIDs []uuid.UUID
}

// ProposalInput описывает отклик.
type ProposalInput struct {
	OrderID        uuid.UUID
	FreelancerID   uuid.UUID
	CoverLetter    string
	Amount         *float64
	ProposedBudget *float64
	EstimatedDays  *int
}
