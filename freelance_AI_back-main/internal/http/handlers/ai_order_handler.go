package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/ignatzorin/freelance-backend/internal/http/handlers/common"
	"github.com/ignatzorin/freelance-backend/internal/models"
	"github.com/ignatzorin/freelance-backend/internal/repository"
	"github.com/ignatzorin/freelance-backend/internal/service"
	"github.com/ignatzorin/freelance-backend/internal/ws"
)

// AIOrderHandler обслуживает маршруты AI операций с заказами
type AIOrderHandler struct {
	orders *service.OrderService
	users  *repository.UserRepository
	media  *repository.MediaRepository
	hub    *ws.Hub
}

// NewAIOrderHandler создаёт новый хэндлер.
func NewAIOrderHandler(orders *service.OrderService, users *repository.UserRepository, media *repository.MediaRepository, hub *ws.Hub) *AIOrderHandler {
	return &AIOrderHandler{orders: orders, users: users, media: media, hub: hub}
}

func (h *AIOrderHandler) requireCurrentUser(c *gin.Context) (uuid.UUID, *models.User, bool) {
	userID, err := common.CurrentUserID(c)
	if err != nil {
		h.respondUnauthorized(c, err)
		return uuid.Nil, nil, false
	}

	user, err := h.users.GetByID(c.Request.Context(), userID)
	if err != nil {
		common.RespondUnauthorized(c, "пользователь не найден")
		return uuid.Nil, nil, false
	}

	return userID, user, true
}

func (h *AIOrderHandler) requireCurrentUserID(c *gin.Context) (uuid.UUID, bool) {
	userID, err := common.CurrentUserID(c)
	if err != nil {
		h.respondUnauthorized(c, err)
		return uuid.Nil, false
	}
	return userID, true
}

func (h *AIOrderHandler) requireClientOrAdminUser(c *gin.Context, forbiddenMessage string) (uuid.UUID, *models.User, bool) {
	userID, user, ok := h.requireCurrentUser(c)
	if !ok {
		return uuid.Nil, nil, false
	}
	if user.Role != "client" && user.Role != "admin" {
		common.RespondForbidden(c, forbiddenMessage)
		return uuid.Nil, nil, false
	}
	return userID, user, true
}

func (h *AIOrderHandler) requireFreelancerUser(c *gin.Context, forbiddenMessage string) (uuid.UUID, *models.User, bool) {
	userID, user, ok := h.requireCurrentUser(c)
	if !ok {
		return uuid.Nil, nil, false
	}
	if user.Role != "freelancer" {
		common.RespondForbidden(c, forbiddenMessage)
		return uuid.Nil, nil, false
	}
	return userID, user, true
}

func (h *AIOrderHandler) GenerateOrderDescription(c *gin.Context) {
	_, _, ok := h.requireClientOrAdminUser(c, "только заказчики могут генерировать описания заказов")
	if !ok {
		return
	}

	var req struct {
		Title       string   `json:"title" binding:"required"`
		Description string   `json:"description"`
		Skills      []string `json:"skills"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondBadRequest(c, err)
		return
	}

	if h.orders == nil {
		common.RespondError(c, http.StatusServiceUnavailable, "AI сервис недоступен")
		return
	}

	// Получаем AI клиент через рефлексию или добавляем метод в сервис
	// Для простоты, добавим метод в OrderService
	description, err := h.orders.GenerateOrderDescription(c.Request.Context(), req.Title, req.Description, req.Skills)
	if err != nil {
		h.respondInternalError(c, err)
		return
	}

	common.RespondJSON(c, http.StatusOK, gin.H{"description": description})
}

func (h *AIOrderHandler) StreamGenerateOrderDescription(c *gin.Context) {
	_, _, ok := h.requireClientOrAdminUser(c, "только заказчики могут генерировать описания заказов")
	if !ok {
		return
	}

	var req struct {
		Title       string   `json:"title" binding:"required"`
		Description string   `json:"description"`
		Skills      []string `json:"skills"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondBadRequest(c, err)
		return
	}

	flusher, ok := h.setupSSE(c)
	if !ok {
		return
	}

	err := h.orders.StreamGenerateOrderDescription(
		c.Request.Context(),
		req.Title,
		req.Description,
		req.Skills,
		sseChunkWriter(c.Writer, flusher),
	)

	if err != nil {
		h.writeSSEInternalError(c.Writer, flusher, err)
	}
}

func (h *AIOrderHandler) respondUnauthorized(c *gin.Context, err error) {
	if err != nil {
		log.Printf("ai_order_handler: unauthorized request: %v", err)
	}
	common.RespondUnauthorized(c, "требуется авторизация")
}

func (h *AIOrderHandler) respondBadRequest(c *gin.Context, err error) {
	if err != nil {
		log.Printf("ai_order_handler: bad request: %v", err)
	}
	common.RespondBadRequest(c, "некорректный запрос")
}

func (h *AIOrderHandler) respondInternalError(c *gin.Context, err error) {
	if err != nil {
		log.Printf("ai_order_handler: internal error: %v", err)
	}
	common.RespondInternalError(c, "внутренняя ошибка сервера")
}

func (h *AIOrderHandler) writeSSEInternalError(writer http.ResponseWriter, flusher http.Flusher, err error) {
	if err != nil {
		log.Printf("ai_order_handler: sse internal error: %v", err)
	}
	writeSSEErrorEventAndFlush(writer, flusher, "внутренняя ошибка сервера")
}

func (h *AIOrderHandler) setupSSE(c *gin.Context) (http.Flusher, bool) {
	return common.SetupSSE(c)
}

func (h *AIOrderHandler) GenerateProposal(c *gin.Context) {
	userID, _, ok := h.requireFreelancerUser(c, "только исполнители могут генерировать предложения")
	if !ok {
		return
	}

	orderID, err := common.ParseUUIDParam(c, "id")
	if err != nil {
		common.RespondBadRequest(c, "неверный идентификатор заказа")
		return
	}

	// Опциональные параметры для переопределения данных профиля и портфолио
	var req struct {
		UserSkills     []string `json:"user_skills,omitempty"`
		UserExperience string   `json:"user_experience,omitempty"`
		UserBio        string   `json:"user_bio,omitempty"`
		Portfolio      []struct {
			Title       string   `json:"title"`
			Description string   `json:"description"`
			AITags      []string `json:"ai_tags"`
		} `json:"portfolio,omitempty"`
	}

	// Если тело запроса пустое, это нормально - будем использовать данные из профиля
	_ = c.ShouldBindJSON(&req)

	// Преобразуем портфолио в нужный тип
	portfolioItems := make([]models.PortfolioItemForAI, len(req.Portfolio))
	for i, item := range req.Portfolio {
		portfolioItems[i] = models.PortfolioItemForAI{
			Title:       item.Title,
			Description: item.Description,
			AITags:      item.AITags,
		}
	}

	proposal, err := h.orders.GenerateProposal(c.Request.Context(), orderID, userID, req.UserSkills, req.UserExperience, req.UserBio, portfolioItems)
	if err != nil {
		if errors.Is(err, repository.ErrOrderNotFound) {
			common.RespondNotFound(c, "заказ не найден")
			return
		}
		h.respondInternalError(c, err)
		return
	}

	common.RespondJSON(c, http.StatusOK, gin.H{"proposal": proposal})
}

func (h *AIOrderHandler) StreamGenerateProposal(c *gin.Context) {
	userID, _, ok := h.requireFreelancerUser(c, "только исполнители могут генерировать предложения")
	if !ok {
		return
	}

	orderID, err := common.ParseUUIDParam(c, "id")
	if err != nil {
		common.RespondBadRequest(c, "неверный идентификатор заказа")
		return
	}

	// Опциональные параметры (как в GenerateProposal)
	var req struct {
		UserSkills     []string `json:"user_skills,omitempty"`
		UserExperience string   `json:"user_experience,omitempty"`
		UserBio        string   `json:"user_bio,omitempty"`
		Portfolio      []struct {
			Title       string   `json:"title"`
			Description string   `json:"description"`
			AITags      []string `json:"ai_tags"`
		} `json:"portfolio,omitempty"`
	}

	_ = c.ShouldBindJSON(&req)

	portfolioItems := make([]models.PortfolioItemForAI, len(req.Portfolio))
	for i, item := range req.Portfolio {
		portfolioItems[i] = models.PortfolioItemForAI{
			Title:       item.Title,
			Description: item.Description,
			AITags:      item.AITags,
		}
	}

	flusher, ok := h.setupSSE(c)
	if !ok {
		return
	}

	err = h.orders.StreamGenerateProposal(
		c.Request.Context(),
		orderID,
		userID,
		req.UserSkills,
		req.UserExperience,
		req.UserBio,
		portfolioItems,
		sseChunkWriter(c.Writer, flusher),
	)

	if err != nil {
		h.writeSSEInternalError(c.Writer, flusher, err)
	}
}

func (h *AIOrderHandler) ImproveOrderDescription(c *gin.Context) {
	_, _, ok := h.requireClientOrAdminUser(c, "только заказчики могут улучшать описания заказов")
	if !ok {
		return
	}

	var req struct {
		Title       string `json:"title" binding:"required"`
		Description string `json:"description" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondBadRequest(c, err)
		return
	}

	improved, err := h.orders.ImproveOrderDescription(c.Request.Context(), req.Title, req.Description)
	if err != nil {
		h.respondInternalError(c, err)
		return
	}

	common.RespondJSON(c, http.StatusOK, gin.H{"description": improved})
}

func (h *AIOrderHandler) StreamImproveOrderDescription(c *gin.Context) {
	_, _, ok := h.requireClientOrAdminUser(c, "только заказчики могут улучшать описания заказов")
	if !ok {
		return
	}

	var req struct {
		Title       string `json:"title" binding:"required"`
		Description string `json:"description" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondBadRequest(c, err)
		return
	}

	flusher, ok := h.setupSSE(c)
	if !ok {
		return
	}

	err := h.orders.StreamImproveOrderDescription(
		c.Request.Context(),
		req.Title,
		req.Description,
		sseChunkWriter(c.Writer, flusher),
	)

	if err != nil {
		h.writeSSEInternalError(c.Writer, flusher, err)
	}
}

func (h *AIOrderHandler) RegenerateOrderSummary(c *gin.Context) {
	userID, ok := h.requireCurrentUserID(c)
	if !ok {
		return
	}

	orderID, err := common.ParseUUIDParam(c, "id")
	if err != nil {
		common.RespondBadRequest(c, "неверный идентификатор заказа")
		return
	}

	order, err := h.orders.RegenerateOrderSummary(c.Request.Context(), orderID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrOrderNotFound) {
			common.RespondNotFound(c, "заказ не найден")
			return
		}
		h.respondInternalError(c, err)
		return
	}

	common.RespondJSON(c, http.StatusOK, order)
}

func (h *AIOrderHandler) StreamRegenerateOrderSummary(c *gin.Context) {
	userID, ok := h.requireCurrentUserID(c)
	if !ok {
		return
	}

	orderID, err := common.ParseUUIDParam(c, "id")
	if err != nil {
		common.RespondBadRequest(c, "неверный идентификатор заказа")
		return
	}

	flusher, ok := h.setupSSE(c)
	if !ok {
		return
	}

	order, err := h.orders.StreamRegenerateOrderSummary(
		c.Request.Context(),
		orderID,
		userID,
		sseChunkWriter(c.Writer, flusher),
	)
	if err != nil {
		if errors.Is(err, repository.ErrOrderNotFound) {
			writeSSEErrorEventAndFlush(c.Writer, flusher, "заказ не найден")
			return
		}
		h.writeSSEInternalError(c.Writer, flusher, err)
		return
	}

	// В конце можно отправить событие с информацией об обновлённом заказе (опционально)
	orderJSON, _ := json.Marshal(order)
	writeSSEEventAndFlush(c.Writer, flusher, "done", string(orderJSON))
}

// SummarizeConversation обрабатывает GET /ai/conversations/:conversationId/summary.
func (h *AIOrderHandler) SummarizeConversation(c *gin.Context) {
	userID, ok := h.requireCurrentUserID(c)
	if !ok {
		return
	}

	conversationID, err := common.ParseUUIDParam(c, "conversationId")
	if err != nil {
		common.RespondBadRequest(c, "неверный идентификатор чата")
		return
	}

	summary, err := h.orders.SummarizeConversation(c.Request.Context(), conversationID, userID)
	if err != nil {
		h.respondInternalError(c, err)
		return
	}

	common.RespondJSON(c, http.StatusOK, summary)
}

// StreamSummarizeConversation обрабатывает GET /ai/conversations/:conversationId/summary/stream.
func (h *AIOrderHandler) StreamSummarizeConversation(c *gin.Context) {
	userID, ok := h.requireCurrentUserID(c)
	if !ok {
		return
	}

	conversationID, err := common.ParseUUIDParam(c, "conversationId")
	if err != nil {
		common.RespondBadRequest(c, "неверный идентификатор чата")
		return
	}

	flusher, ok := h.setupSSE(c)
	if !ok {
		return
	}

	err = h.orders.StreamSummarizeConversation(c.Request.Context(), conversationID, userID, sseChunkWriter(c.Writer, flusher))
	if err != nil {
		h.writeSSEInternalError(c.Writer, flusher, err)
	}
}

// GetProposalFeedback обрабатывает GET /ai/orders/:id/proposals/feedback - получает рекомендации по улучшению отклика.
func (h *AIOrderHandler) GetProposalFeedback(c *gin.Context) {
	userID, _, ok := h.requireFreelancerUser(c, "только исполнители могут получать рекомендации по улучшению откликов")
	if !ok {
		return
	}

	orderID, err := common.ParseUUIDParam(c, "id")
	if err != nil {
		common.RespondBadRequest(c, "неверный идентификатор заказа")
		return
	}

	feedback, err := h.orders.GetProposalFeedback(c.Request.Context(), orderID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrProposalNotFound) {
			common.RespondNotFound(c, "отклик не найден")
			return
		}
		h.respondInternalError(c, err)
		return
	}

	common.RespondJSON(c, http.StatusOK, gin.H{"feedback": feedback})
}

// StreamProposalFeedback обрабатывает GET /ai/orders/:id/proposals/feedback/stream -
// стриминг рекомендаций по улучшению отклика через SSE.
func (h *AIOrderHandler) StreamProposalFeedback(c *gin.Context) {
	userID, _, ok := h.requireFreelancerUser(c, "только исполнители могут получать рекомендации по улучшению откликов")
	if !ok {
		return
	}

	orderID, err := common.ParseUUIDParam(c, "id")
	if err != nil {
		common.RespondBadRequest(c, "неверный идентификатор заказа")
		return
	}

	// Настраиваем SSE заголовки
	flusher, ok := h.setupSSE(c)
	if !ok {
		return
	}

	// Стримим кусочки текста по мере генерации AI
	err = h.orders.StreamProposalFeedback(c.Request.Context(), orderID, userID, sseChunkWriter(c.Writer, flusher))

	if err != nil {
		// В случае ошибки отправляем финальное событие с информацией об ошибке
		h.writeSSEInternalError(c.Writer, flusher, err)
	}
}
