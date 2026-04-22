package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/ignatzorin/freelance-backend/internal/http/handlers/common"
	"github.com/ignatzorin/freelance-backend/internal/models"
	"github.com/ignatzorin/freelance-backend/internal/repository"
)

func (h *AIOrderHandler) RecommendRelevantOrders(c *gin.Context) {
	userID, _, ok := h.requireFreelancerUser(c, "только фрилансеры могут получать рекомендации по заказам")
	if !ok {
		return
	}

	limit := common.ParseIntQuery(c, "limit", 10)
	// Ограничиваем максимум 10 заказов
	if limit > 10 {
		limit = 10
	}
	recommendedOrders, explanation, err := h.orders.RecommendRelevantOrders(c.Request.Context(), userID, limit)
	if err != nil {
		h.respondInternalError(c, err)
		return
	}

	// Защитный fallback: если AI/сервис вернул пусто, формируем рекомендации из доступных заказов.
	if len(recommendedOrders) == 0 {
		listResult, listErr := h.orders.ListOrders(c.Request.Context(), repository.ListFilterParams{
			Status: models.OrderStatusPublished,
			Limit:  limit,
			Offset: 0,
		})
		if listErr == nil && listResult != nil && len(listResult.Orders) > 0 {
			recommendedOrders = make([]models.RecommendedOrder, 0, len(listResult.Orders))
			for _, order := range listResult.Orders {
				recommendedOrders = append(recommendedOrders, models.RecommendedOrder{
					OrderID:     order.ID,
					MatchScore:  6.0,
					Explanation: "Рекомендация на основе доступных заказов",
				})
			}
			explanation = "Рекомендации на основе доступных заказов на платформе"
		}
	}

	// Преобразуем в формат для фронтенда
	orderIDs := make([]string, 0, len(recommendedOrders))
	ordersWithScores := make([]gin.H, 0, len(recommendedOrders))
	for _, rec := range recommendedOrders {
		orderIDs = append(orderIDs, rec.OrderID.String())
		ordersWithScores = append(ordersWithScores, gin.H{
			"order_id":    rec.OrderID.String(),
			"match_score": rec.MatchScore,
			"explanation": rec.Explanation,
		})
	}

	common.RespondJSON(c, http.StatusOK, gin.H{
		"recommended_order_ids": orderIDs,
		"recommended_orders":    ordersWithScores,
		"explanation":           explanation,
	})
}

func (h *AIOrderHandler) StreamRecommendRelevantOrders(c *gin.Context) {
	userID, _, ok := h.requireFreelancerUser(c, "только фрилансеры могут получать рекомендации по заказам")
	if !ok {
		return
	}

	limit := common.ParseIntQuery(c, "limit", 10)
	// Ограничиваем максимум 10 заказов - показываем только самые подходящие
	if limit > 10 {
		limit = 10
	}

	flusher, ok := h.setupSSE(c)
	if !ok {
		return
	}

	err := h.orders.StreamRecommendRelevantOrders(
		c.Request.Context(),
		userID,
		limit,
		sseChunkWriter(c.Writer, flusher),
		func(recommendedOrders []models.RecommendedOrder, generalExplanation string) error {
			// Преобразуем в формат для фронтенда
			orderIDs := make([]string, 0, len(recommendedOrders))
			ordersWithScores := make([]gin.H, 0, len(recommendedOrders))
			for _, rec := range recommendedOrders {
				orderIDs = append(orderIDs, rec.OrderID.String())
				ordersWithScores = append(ordersWithScores, gin.H{
					"order_id":    rec.OrderID.String(),
					"match_score": rec.MatchScore,
					"explanation": rec.Explanation,
				})
			}
			return writeSSEJSONDataAndFlush(c.Writer, flusher, gin.H{
				"recommended_order_ids": orderIDs,
				"recommended_orders":    ordersWithScores,
				"explanation":           generalExplanation,
			})
		},
	)

	if err != nil {
		h.writeSSEInternalError(c.Writer, flusher, err)
	}
}

func (h *AIOrderHandler) RecommendPriceAndTimeline(c *gin.Context) {
	userID, _, ok := h.requireFreelancerUser(c, "только фрилансеры могут получать рекомендации по цене и срокам")
	if !ok {
		return
	}

	orderID, err := common.ParseUUIDParam(c, "id")
	if err != nil {
		common.RespondBadRequest(c, "неверный идентификатор заказа")
		return
	}

	recommendation, err := h.orders.RecommendPriceAndTimeline(c.Request.Context(), orderID, userID)
	if err != nil {
		h.respondInternalError(c, err)
		return
	}

	common.RespondJSON(c, http.StatusOK, recommendation)
}

func (h *AIOrderHandler) StreamRecommendPriceAndTimeline(c *gin.Context) {
	userID, _, ok := h.requireFreelancerUser(c, "только фрилансеры могут получать рекомендации по цене и срокам")
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

	err = h.orders.StreamRecommendPriceAndTimeline(
		c.Request.Context(),
		orderID,
		userID,
		sseChunkWriter(c.Writer, flusher),
		func(recommendation *models.PriceTimelineRecommendation) error {
			return writeSSEJSONDataAndFlush(c.Writer, flusher, recommendation)
		},
	)

	if err != nil {
		h.writeSSEInternalError(c.Writer, flusher, err)
	}
}

func (h *AIOrderHandler) EvaluateOrderQuality(c *gin.Context) {
	userID, ok := h.requireCurrentUserID(c)
	if !ok {
		return
	}

	orderID, err := common.ParseUUIDParam(c, "id")
	if err != nil {
		common.RespondBadRequest(c, "неверный идентификатор заказа")
		return
	}

	evaluation, err := h.orders.EvaluateOrderQuality(c.Request.Context(), orderID, userID)
	if err != nil {
		h.respondInternalError(c, err)
		return
	}

	common.RespondJSON(c, http.StatusOK, evaluation)
}

func (h *AIOrderHandler) StreamEvaluateOrderQuality(c *gin.Context) {
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

	err = h.orders.StreamEvaluateOrderQuality(
		c.Request.Context(),
		orderID,
		userID,
		sseChunkWriter(c.Writer, flusher),
		func(evaluation *models.OrderQualityEvaluation) error {
			return writeSSEJSONDataAndFlush(c.Writer, flusher, evaluation)
		},
	)

	if err != nil {
		h.writeSSEInternalError(c.Writer, flusher, err)
	}
}

func (h *AIOrderHandler) FindSuitableFreelancers(c *gin.Context) {
	userID, user, ok := h.requireClientOrAdminUser(c, "только заказчики могут искать подходящих исполнителей")
	if !ok {
		return
	}

	orderID, err := common.ParseUUIDParam(c, "id")
	if err != nil {
		common.RespondBadRequest(c, "неверный идентификатор заказа")
		return
	}

	limit := common.ParseIntQuery(c, "limit", 10)
	freelancers, err := h.orders.FindSuitableFreelancers(c.Request.Context(), orderID, userID, user.Role, limit)
	if err != nil {
		h.respondInternalError(c, err)
		return
	}

	common.RespondJSON(c, http.StatusOK, gin.H{
		"freelancers": freelancers,
	})
}

func (h *AIOrderHandler) StreamFindSuitableFreelancers(c *gin.Context) {
	userID, user, ok := h.requireClientOrAdminUser(c, "только заказчики могут искать подходящих исполнителей")
	if !ok {
		return
	}

	orderID, err := common.ParseUUIDParam(c, "id")
	if err != nil {
		common.RespondBadRequest(c, "неверный идентификатор заказа")
		return
	}

	limit := common.ParseIntQuery(c, "limit", 10)

	flusher, ok := h.setupSSE(c)
	if !ok {
		return
	}

	err = h.orders.StreamFindSuitableFreelancers(
		c.Request.Context(),
		orderID,
		userID,
		user.Role,
		limit,
		sseChunkWriter(c.Writer, flusher),
		func(freelancers []models.SuitableFreelancer) error {
			return writeSSEJSONDataAndFlush(c.Writer, flusher, gin.H{"freelancers": freelancers})
		},
	)

	if err != nil {
		h.writeSSEInternalError(c.Writer, flusher, err)
	}
}

func (h *AIOrderHandler) AIChatAssistant(c *gin.Context) {
	userID, user, ok := h.requireCurrentUser(c)
	if !ok {
		return
	}

	var req struct {
		Message     string                 `json:"message" binding:"required"`
		ContextData map[string]interface{} `json:"context_data"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondBadRequest(c, err)
		return
	}

	if req.ContextData == nil {
		req.ContextData = make(map[string]interface{})
	}

	response, err := h.orders.AIChatAssistant(c.Request.Context(), userID, req.Message, user.Role, req.ContextData)
	if err != nil {
		h.respondInternalError(c, err)
		return
	}

	common.RespondJSON(c, http.StatusOK, gin.H{
		"response": response,
	})
}

func (h *AIOrderHandler) StreamAIChatAssistant(c *gin.Context) {
	userID, user, ok := h.requireCurrentUser(c)
	if !ok {
		return
	}

	var req struct {
		Message     string                 `json:"message" binding:"required"`
		ContextData map[string]interface{} `json:"context_data"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondBadRequest(c, err)
		return
	}

	if req.ContextData == nil {
		req.ContextData = make(map[string]interface{})
	}

	flusher, ok := h.setupSSE(c)
	if !ok {
		return
	}

	err := h.orders.StreamAIChatAssistant(c.Request.Context(), userID, req.Message, user.Role, req.ContextData, sseChunkWriter(c.Writer, flusher))

	if err != nil {
		h.writeSSEInternalError(c.Writer, flusher, err)
	}
}
