package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/ignatzorin/freelance-backend/internal/http/handlers/common"
)

func (h *AIOrderHandler) ImproveProfile(c *gin.Context) {
	userID, ok := h.requireCurrentUserID(c)
	if !ok {
		return
	}

	var req struct {
		CurrentBio      string   `json:"current_bio" binding:"required"`
		Skills          []string `json:"skills"`
		ExperienceLevel string   `json:"experience_level"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondBadRequest(c, err)
		return
	}

	// Получаем профиль для получения навыков и уровня опыта, если не переданы
	profile, err := h.users.GetProfile(c.Request.Context(), userID)
	if err == nil && profile != nil {
		if len(req.Skills) == 0 {
			req.Skills = profile.Skills
		}
		if req.ExperienceLevel == "" {
			req.ExperienceLevel = profile.ExperienceLevel
		}
	}

	improved, err := h.orders.ImproveProfile(c.Request.Context(), req.CurrentBio, req.Skills, req.ExperienceLevel)
	if err != nil {
		h.respondInternalError(c, err)
		return
	}

	common.RespondJSON(c, http.StatusOK, gin.H{
		"improved_bio": improved,
	})
}

func (h *AIOrderHandler) StreamImproveProfile(c *gin.Context) {
	userID, ok := h.requireCurrentUserID(c)
	if !ok {
		return
	}

	var req struct {
		CurrentBio      string   `json:"current_bio" binding:"required"`
		Skills          []string `json:"skills"`
		ExperienceLevel string   `json:"experience_level"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondBadRequest(c, err)
		return
	}

	// Получаем профиль для получения навыков и уровня опыта, если не переданы
	profile, err := h.users.GetProfile(c.Request.Context(), userID)
	if err == nil && profile != nil {
		if len(req.Skills) == 0 {
			req.Skills = profile.Skills
		}
		if req.ExperienceLevel == "" {
			req.ExperienceLevel = profile.ExperienceLevel
		}
	}

	flusher, ok := h.setupSSE(c)
	if !ok {
		return
	}

	err = h.orders.StreamImproveProfile(
		c.Request.Context(),
		req.CurrentBio,
		req.Skills,
		req.ExperienceLevel,
		sseChunkWriter(c.Writer, flusher),
	)

	if err != nil {
		h.writeSSEInternalError(c.Writer, flusher, err)
	}
}

func (h *AIOrderHandler) ImprovePortfolioItem(c *gin.Context) {
	if _, ok := h.requireCurrentUserID(c); !ok {
		return
	}

	var req struct {
		Title       string   `json:"title" binding:"required"`
		Description string   `json:"description" binding:"required"`
		AITags      []string `json:"ai_tags"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondBadRequest(c, err)
		return
	}

	improved, err := h.orders.ImprovePortfolioItem(c.Request.Context(), req.Title, req.Description, req.AITags)
	if err != nil {
		h.respondInternalError(c, err)
		return
	}

	common.RespondJSON(c, http.StatusOK, gin.H{
		"improved_description": improved,
	})
}

func (h *AIOrderHandler) StreamImprovePortfolioItem(c *gin.Context) {
	if _, ok := h.requireCurrentUserID(c); !ok {
		return
	}

	var req struct {
		Title       string   `json:"title" binding:"required"`
		Description string   `json:"description"`
		AITags      []string `json:"ai_tags"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		// Отправляем ошибку валидации через SSE, если это возможно
		// Но сначала проверяем, можем ли мы установить SSE заголовки
		c.Writer.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
		c.Writer.Header().Set("Cache-Control", "no-cache")
		c.Writer.Header().Set("Connection", "keep-alive")

		flusher, ok := c.Writer.(http.Flusher)
		if ok {
			h.writeSSEInternalError(c.Writer, flusher, err)
		} else {
			h.respondBadRequest(c, err)
		}
		return
	}

	// Если описание пустое, используем значение по умолчанию
	if req.Description == "" {
		req.Description = "Описание проекта"
	}

	flusher, ok := h.setupSSE(c)
	if !ok {
		return
	}

	err := h.orders.StreamImprovePortfolioItem(
		c.Request.Context(),
		req.Title,
		req.Description,
		req.AITags,
		sseChunkWriter(c.Writer, flusher),
	)

	if err != nil {
		h.writeSSEInternalError(c.Writer, flusher, err)
	}
}
