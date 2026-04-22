package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/ignatzorin/freelance-backend/internal/http/handlers/common"
)

func (h *AIOrderHandler) GenerateOrderSuggestions(c *gin.Context) {
	_, _, ok := h.requireClientOrAdminUser(c, "только заказчики могут генерировать предложения для заказов")
	if !ok {
		return
	}

	var req struct {
		Title       string `json:"title" binding:"required"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondBadRequest(c, err)
		return
	}

	if h.orders == nil {
		common.RespondError(c, http.StatusServiceUnavailable, "AI сервис недоступен")
		return
	}

	suggestions, err := h.orders.GenerateOrderSuggestions(c.Request.Context(), req.Title, req.Description)
	if err != nil {
		h.respondInternalError(c, err)
		return
	}

	common.RespondJSON(c, http.StatusOK, suggestions)
}

func (h *AIOrderHandler) StreamGenerateOrderSuggestions(c *gin.Context) {
	_, _, ok := h.requireClientOrAdminUser(c, "только заказчики могут генерировать предложения для заказов")
	if !ok {
		return
	}

	var req struct {
		Title       string `json:"title" binding:"required"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondBadRequest(c, err)
		return
	}

	flusher, ok := h.setupSSE(c)
	if !ok {
		return
	}

	err := h.orders.StreamGenerateOrderSuggestions(
		c.Request.Context(),
		req.Title,
		req.Description,
		sseChunkWriter(c.Writer, flusher),
	)

	if err != nil {
		h.writeSSEInternalError(c.Writer, flusher, err)
	}
}

func (h *AIOrderHandler) GenerateOrderSkills(c *gin.Context) {
	_, _, ok := h.requireClientOrAdminUser(c, "только заказчики могут генерировать навыки для заказов")
	if !ok {
		return
	}

	var req struct {
		Title       string `json:"title" binding:"required"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondBadRequest(c, err)
		return
	}

	if h.orders == nil {
		common.RespondError(c, http.StatusServiceUnavailable, "AI сервис недоступен")
		return
	}

	skills, err := h.orders.GenerateOrderSkills(c.Request.Context(), req.Title, req.Description)
	if err != nil {
		h.respondInternalError(c, err)
		return
	}

	common.RespondJSON(c, http.StatusOK, gin.H{"skills": skills})
}

func (h *AIOrderHandler) StreamGenerateOrderSkills(c *gin.Context) {
	_, _, ok := h.requireClientOrAdminUser(c, "только заказчики могут генерировать навыки для заказов")
	if !ok {
		return
	}

	var req struct {
		Title       string `json:"title" binding:"required"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondBadRequest(c, err)
		return
	}

	flusher, ok := h.setupSSE(c)
	if !ok {
		return
	}

	err := h.orders.StreamGenerateOrderSkills(
		c.Request.Context(),
		req.Title,
		req.Description,
		sseChunkWriter(c.Writer, flusher),
	)

	if err != nil {
		h.writeSSEInternalError(c.Writer, flusher, err)
	}
}

func (h *AIOrderHandler) GenerateOrderBudget(c *gin.Context) {
	_, _, ok := h.requireClientOrAdminUser(c, "только заказчики могут генерировать бюджет для заказов")
	if !ok {
		return
	}

	var req struct {
		Title       string `json:"title" binding:"required"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondBadRequest(c, err)
		return
	}

	if h.orders == nil {
		common.RespondError(c, http.StatusServiceUnavailable, "AI сервис недоступен")
		return
	}

	budget, err := h.orders.GenerateOrderBudget(c.Request.Context(), req.Title, req.Description)
	if err != nil {
		h.respondInternalError(c, err)
		return
	}

	common.RespondJSON(c, http.StatusOK, budget)
}

func (h *AIOrderHandler) StreamGenerateOrderBudget(c *gin.Context) {
	_, _, ok := h.requireClientOrAdminUser(c, "только заказчики могут генерировать бюджет для заказов")
	if !ok {
		return
	}

	var req struct {
		Title       string `json:"title" binding:"required"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondBadRequest(c, err)
		return
	}

	flusher, ok := h.setupSSE(c)
	if !ok {
		return
	}

	err := h.orders.StreamGenerateOrderBudget(
		c.Request.Context(),
		req.Title,
		req.Description,
		sseChunkWriter(c.Writer, flusher),
	)

	if err != nil {
		h.writeSSEInternalError(c.Writer, flusher, err)
	}
}

func (h *AIOrderHandler) GenerateWelcomeMessage(c *gin.Context) {
	_, user, ok := h.requireCurrentUser(c)
	if !ok {
		return
	}

	var req struct {
		UserRole string `json:"user_role"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		// Если роль не передана, используем роль из профиля пользователя
		req.UserRole = user.Role
	}

	if req.UserRole == "" {
		req.UserRole = user.Role
	}

	if h.orders == nil {
		common.RespondError(c, http.StatusServiceUnavailable, "AI сервис недоступен")
		return
	}

	message, err := h.orders.GenerateWelcomeMessage(c.Request.Context(), req.UserRole)
	if err != nil {
		h.respondInternalError(c, err)
		return
	}

	common.RespondJSON(c, http.StatusOK, gin.H{"message": message})
}

func (h *AIOrderHandler) StreamGenerateWelcomeMessage(c *gin.Context) {
	_, user, ok := h.requireCurrentUser(c)
	if !ok {
		return
	}

	var req struct {
		UserRole string `json:"user_role"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		// Если роль не передана, используем роль из профиля пользователя
		req.UserRole = user.Role
	}

	if req.UserRole == "" {
		req.UserRole = user.Role
	}

	flusher, ok := h.setupSSE(c)
	if !ok {
		return
	}

	err := h.orders.StreamGenerateWelcomeMessage(
		c.Request.Context(),
		req.UserRole,
		sseChunkWriter(c.Writer, flusher),
	)

	if err != nil {
		h.writeSSEInternalError(c.Writer, flusher, err)
	}
}
