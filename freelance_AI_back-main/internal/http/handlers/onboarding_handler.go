package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/ignatzorin/freelance-backend/internal/http/handlers/common"
	"github.com/ignatzorin/freelance-backend/internal/http/middleware"
)

type OnboardingHandler struct {
	db *sqlx.DB
}

func NewOnboardingHandler(db *sqlx.DB) *OnboardingHandler {
	return &OnboardingHandler{db: db}
}

type OnboardingStateResponse struct {
	Role                  string     `json:"role"`
	OnboardingCompleted   bool       `json:"onboarding_completed"`
	OnboardingCompletedAt *time.Time `json:"onboarding_completed_at,omitempty"`
	HasOrders             bool       `json:"has_orders"`
	HasProposals          bool       `json:"has_proposals"`
}

func (h *OnboardingHandler) GetState(c *gin.Context) {
	userID, err := middleware.UserIDFromContext(c)
	if userID == uuid.Nil {
		userID, err = common.CurrentUserID(c)
	}
	if err != nil || userID == uuid.Nil {
		msg := "требуется авторизация"
		if err != nil {
			msg = err.Error()
		}
		c.JSON(http.StatusUnauthorized, gin.H{"error": msg})
		return
	}

	ctx := c.Request.Context()

	var role string
	if err := h.db.GetContext(ctx, &role, `SELECT role FROM users WHERE id = $1`, userID); err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "пользователь не найден"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "не удалось получить роль пользователя"})
		return
	}

	var onboardingCompletedAt *time.Time
	if err := h.db.GetContext(ctx, &onboardingCompletedAt, `SELECT onboarding_completed_at FROM profiles WHERE user_id = $1`, userID); err != nil {
		if err != sql.ErrNoRows {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "не удалось получить профиль"})
			return
		}
		onboardingCompletedAt = nil
	}

	var ordersCount int
	if role == "client" || role == "admin" {
		_ = h.db.GetContext(ctx, &ordersCount, `SELECT COUNT(1) FROM orders WHERE client_id = $1`, userID)
	}

	var proposalsCount int
	if role == "freelancer" {
		_ = h.db.GetContext(ctx, &proposalsCount, `SELECT COUNT(1) FROM proposals WHERE freelancer_id = $1`, userID)
	}

	c.JSON(http.StatusOK, OnboardingStateResponse{
		Role:                  role,
		OnboardingCompleted:   onboardingCompletedAt != nil,
		OnboardingCompletedAt: onboardingCompletedAt,
		HasOrders:             ordersCount > 0,
		HasProposals:          proposalsCount > 0,
	})
}
