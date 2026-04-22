package handlers

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/ignatzorin/freelance-backend/internal/dto"
	"github.com/ignatzorin/freelance-backend/internal/http/handlers/common"
	"github.com/ignatzorin/freelance-backend/internal/models"
	"github.com/ignatzorin/freelance-backend/internal/repository"
	"github.com/ignatzorin/freelance-backend/internal/service"
	"github.com/ignatzorin/freelance-backend/internal/validation"
	"github.com/ignatzorin/freelance-backend/internal/ws"
)

// ProposalOperationsHandler обслуживает маршруты операций с предложениями
type ProposalOperationsHandler struct {
	orders                   *service.OrderService
	users                    *repository.UserRepository
	media                    *repository.MediaRepository
	hub                      *ws.Hub
	enforceTopDomainEnvelope bool
}

// NewProposalOperationsHandler создаёт новый хэндлер.
func NewProposalOperationsHandler(orders *service.OrderService, users *repository.UserRepository, media *repository.MediaRepository, hub *ws.Hub) *ProposalOperationsHandler {
	return &ProposalOperationsHandler{orders: orders, users: users, media: media, hub: hub}
}

func (h *ProposalOperationsHandler) SetEnforceTopDomainEnvelope(enforce bool) {
	h.enforceTopDomainEnvelope = enforce
}

func (h *ProposalOperationsHandler) CreateProposal(c *gin.Context) {
	userID, err := common.CurrentUserID(c)
	if err != nil {
		common.RespondUnauthorized(c, err.Error())
		return
	}

	// Проверяем роль пользователя из базы данных (не из токена, так как токен может быть устаревшим)
	user, err := h.users.GetByID(c.Request.Context(), userID)
	if err != nil {
		common.RespondUnauthorized(c, "пользователь не найден")
		return
	}
	if user.Role != "freelancer" {
		common.RespondForbidden(c, "только исполнители могут создавать предложения к заказам")
		return
	}

	orderID, err := common.ParseUUIDParam(c, "id")
	if err != nil {
		common.RespondBadRequest(c, "неверный идентификатор заказа")
		return
	}

	var req dto.CreateProposalRequest
	if err := common.BindAndValidate(c, &req); err != nil {
		common.RespondBadRequest(c, err.Error())
		return
	}

	// Валидация сопроводительного письма
	if err := validation.ValidateProposalCoverLetter(req.CoverLetter); err != nil {
		common.RespondBadRequest(c, err.Error())
		return
	}

	// Валидируем canonical сумму: proposed_budget, а amount оставляем как legacy fallback.
	var normalizedBudget *float64
	if req.ProposedBudget != nil {
		normalizedBudget = req.ProposedBudget
	} else if req.Amount != nil {
		normalizedBudget = req.Amount
	}
	if normalizedBudget == nil {
		common.RespondBadRequest(c, "необходимо указать сумму отклика")
		return
	}
	if *normalizedBudget > validation.MaxBudget {
		common.RespondBadRequest(c, fmt.Sprintf("сумма предложения не может превышать %.0f", validation.MaxBudget))
		return
	}

	proposal, err := h.orders.CreateProposal(c.Request.Context(), service.ProposalInput{
		OrderID:        orderID,
		FreelancerID:   userID,
		CoverLetter:    req.CoverLetter,
		Amount:         req.Amount,
		ProposedBudget: req.ProposedBudget,
		EstimatedDays:  req.EstimatedDays,
	})
	if err != nil {
		common.RespondBadRequest(c, err.Error())
		return
	}

	// WebSocket уведомления
	if h.hub != nil {
		order, err := h.orders.GetOrder(c.Request.Context(), orderID)
		if err == nil {
			// Уведомление клиенту о новом предложении
			_ = h.hub.BroadcastToUser(order.ClientID, "proposal.created", gin.H{
				"order": gin.H{
					"id":    order.ID,
					"title": order.Title,
				},
				"proposal": proposal,
				"message":  "Получено новое предложение",
			})
			// Уведомление фрилансеру о успешной отправке
			_ = h.hub.BroadcastToUser(userID, "proposal.created", gin.H{
				"order": gin.H{
					"id":    order.ID,
					"title": order.Title,
				},
				"proposal": proposal,
				"message":  "Предложение успешно отправлено",
			})
			_ = h.hub.BroadcastToUser(order.ClientID, "counter.updated", gin.H{
				"domain": "proposals",
				"delta":  1,
			})
			responsesCount := 1
			if proposalsResult, listErr := h.orders.ListProposals(c.Request.Context(), order.ID, nil); listErr == nil && proposalsResult != nil {
				responsesCount = len(proposalsResult.Proposals)
			}
			_ = h.hub.BroadcastToUser(order.ClientID, "order.responses_count.updated", gin.H{
				"order_id":        order.ID.String(),
				"responses_count": responsesCount,
			})
		}
	}

	common.RespondJSON(c, http.StatusCreated, proposal)
}

// GetOrder обрабатывает GET /orders/:id.
// Использует оптимизированный метод для избежания N+1 запросов.

func (h *ProposalOperationsHandler) ListProposals(c *gin.Context) {
	userID, err := common.CurrentUserID(c)
	if err != nil {
		common.RespondUnauthorized(c, err.Error())
		return
	}

	orderID, err := common.ParseUUIDParam(c, "id")
	if err != nil {
		common.RespondBadRequest(c, "неверный идентификатор заказа")
		return
	}

	// Проверяем права доступа: должны видеть только владелец заказа и авторы предложений
	order, err := h.orders.GetOrder(c.Request.Context(), orderID)
	if err != nil {
		if errors.Is(err, repository.ErrOrderNotFound) {
			common.RespondNotFound(c, "заказ не найден")
			return
		}
		common.RespondInternalError(c, err.Error())
		return
	}

	// Проверяем, является ли пользователь владельцем заказа
	isOwner := order.ClientID == userID

	// Если не владелец, проверяем, есть ли у пользователя предложение к этому заказу
	if !isOwner {
		var clientID *uuid.UUID
		proposalsResult, err := h.orders.ListProposals(c.Request.Context(), orderID, clientID)
		if err != nil {
			common.RespondInternalError(c, err.Error())
			return
		}

		hasProposal := false
		for _, proposal := range proposalsResult.Proposals {
			if proposal.FreelancerID == userID {
				hasProposal = true
				break
			}
		}

		if !hasProposal {
			common.RespondForbidden(c, "у вас нет доступа к предложениям этого заказа")
			return
		}
	}

	// Передаём clientID только если пользователь - владелец заказа
	var clientID *uuid.UUID
	if isOwner {
		clientID = &userID
	}
	result, err := h.orders.ListProposals(c.Request.Context(), orderID, clientID)
	if err != nil {
		common.RespondInternalError(c, err.Error())
		return
	}

	// Legacy compatibility path: only emit plain array when strict top-domain envelope is disabled.
	if !isOwner && !h.enforceTopDomainEnvelope {
		common.RespondJSON(c, http.StatusOK, result.Proposals)
		return
	}

	// Strict path for top RT domain: always return full payload with pagination envelope.
	proposalsTotal := len(result.Proposals)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"proposals":           result.Proposals,
			"best_recommendation": result.BestRecommendation,
		},
		"pagination": gin.H{
			"total":    proposalsTotal,
			"limit":    proposalsTotal,
			"offset":   0,
			"has_more": false,
		},
	})
}

// GetMyProposal обрабатывает GET /orders/:id/my-proposal.

func (h *ProposalOperationsHandler) GetMyProposal(c *gin.Context) {
	userID, err := common.CurrentUserID(c)
	if err != nil {
		common.RespondUnauthorized(c, err.Error())
		return
	}

	orderID, err := common.ParseUUIDParam(c, "id")
	if err != nil {
		common.RespondBadRequest(c, "неверный идентификатор заказа")
		return
	}

	proposal, err := h.orders.GetMyProposalForOrder(c.Request.Context(), orderID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrProposalNotFound) {
			common.RespondNotFound(c, "предложение не найдено")
			return
		}
		common.RespondInternalError(c, err.Error())
		return
	}

	common.RespondJSON(c, http.StatusOK, proposal)
}

// UpdateProposalStatus обрабатывает PUT /orders/:orderId/proposals/:proposalId/status.

func (h *ProposalOperationsHandler) UpdateProposalStatus(c *gin.Context) {
	userID, err := common.CurrentUserID(c)
	if err != nil {
		common.RespondUnauthorized(c, err.Error())
		return
	}

	orderID, err := common.ParseUUIDParam(c, "id")
	if err != nil {
		common.RespondBadRequest(c, "неверный идентификатор заказа")
		return
	}

	proposalID, err := common.ParseUUIDParam(c, "proposalId")
	if err != nil {
		common.RespondBadRequest(c, "неверный идентификатор отклика")
		return
	}

	var req dto.UpdateProposalStatusRequest
	if err := common.BindAndValidate(c, &req); err != nil {
		common.RespondBadRequest(c, err.Error())
		return
	}

	updated, conversation, err := h.orders.UpdateProposalStatus(c.Request.Context(), userID, proposalID, req.Status)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrProposalNotFound):
			common.RespondNotFound(c, "отклик не найден")
		case errors.Is(err, repository.ErrOrderNotFound):
			common.RespondNotFound(c, "заказ не найден")
		default:
			common.RespondBadRequest(c, err.Error())
		}
		return
	}

	if updated.OrderID != orderID {
		common.RespondBadRequest(c, "отклик не относится к указанному заказу")
		return
	}

	response := gin.H{
		"proposal":     updated,
		"conversation": conversation,
	}

	if orderData, err := h.orders.GetOrder(c.Request.Context(), orderID); err == nil {
		response["order"] = gin.H{
			"id":    orderData.ID,
			"title": orderData.Title,
		}
	}

	// WebSocket уведомления
	if h.hub != nil {
		payload := gin.H{
			"proposal":     updated,
			"conversation": conversation,
		}

		if ord, ok := response["order"]; ok {
			payload["order"] = ord
		}

		// Уведомление клиенту
		var clientMessage string
		switch updated.Status {
		case models.ProposalStatusAccepted:
			clientMessage = "Предложение принято"
		case models.ProposalStatusRejected:
			clientMessage = "Предложение отклонено"
		case models.ProposalStatusShortlisted:
			clientMessage = "Предложение добавлено в шортлист"
		default:
			clientMessage = "Статус предложения изменён"
		}
		payload["message"] = clientMessage
		_ = h.hub.BroadcastToUser(userID, "proposal.updated", payload)

		// Уведомление фрилансеру
		var freelancerMessage string
		switch updated.Status {
		case models.ProposalStatusAccepted:
			freelancerMessage = "Ваше предложение принято! Начните работу над заказом."
		case models.ProposalStatusRejected:
			freelancerMessage = "Ваше предложение отклонено"
		case models.ProposalStatusShortlisted:
			freelancerMessage = "Ваше предложение добавлено в шортлист"
		default:
			freelancerMessage = "Статус вашего предложения изменён"
		}
		freelancerPayload := gin.H{}
		for k, v := range payload {
			freelancerPayload[k] = v
		}
		freelancerPayload["message"] = freelancerMessage
		_ = h.hub.BroadcastToUser(updated.FreelancerID, "proposal.updated", freelancerPayload)
		_ = h.hub.BroadcastToUser(updated.FreelancerID, "counter.updated", gin.H{
			"domain": "orders",
			"delta":  0,
		})

		if updated.Status == models.ProposalStatusAccepted {
			_ = h.hub.BroadcastToUser(userID, "order.application_closed", gin.H{
				"order_id": updated.OrderID.String(),
			})
			_ = h.hub.BroadcastToUser(updated.FreelancerID, "order.application_closed", gin.H{
				"order_id": updated.OrderID.String(),
			})
			// Уведомляем обоих участников об изменении статуса заказа
			orderPayload := gin.H{"order_id": updated.OrderID.String(), "status": "in_progress"}
			_ = h.hub.BroadcastToUser(userID, "order.updated", orderPayload)
			_ = h.hub.BroadcastToUser(updated.FreelancerID, "order.updated", orderPayload)
		}
	}

	common.RespondJSON(c, http.StatusOK, response)
}

// MarkOrderAsCompletedByFreelancer обрабатывает POST /orders/:id/complete-by-freelancer.
// Позволяет исполнителю отметить заказ как выполненный.
func (h *ProposalOperationsHandler) MarkOrderAsCompletedByFreelancer(c *gin.Context) {
	userID, err := common.CurrentUserID(c)
	if err != nil {
		common.RespondUnauthorized(c, err.Error())
		return
	}

	orderID, err := common.ParseUUIDParam(c, "id")
	if err != nil {
		common.RespondBadRequest(c, "неверный идентификатор заказа")
		return
	}

	// Получаем заказ
	order, err := h.orders.GetOrder(c.Request.Context(), orderID)
	if err != nil {
		if errors.Is(err, repository.ErrOrderNotFound) {
			common.RespondNotFound(c, "заказ не найден")
			return
		}
		common.RespondInternalError(c, err.Error())
		return
	}

	// Проверяем, что заказ в статусе in_progress
	if order.Status != models.OrderStatusInProgress {
		common.RespondBadRequest(c, "заказ должен быть в статусе 'in_progress'")
		return
	}

	// Проверяем, что пользователь является исполнителем заказа
	proposalsResult, err := h.orders.ListProposals(c.Request.Context(), orderID, nil)
	if err != nil {
		common.RespondInternalError(c, err.Error())
		return
	}

	var isAcceptedFreelancer bool
	if proposalsResult != nil {
		for _, proposal := range proposalsResult.Proposals {
			if proposal.FreelancerID == userID && proposal.Status == models.ProposalStatusAccepted {
				isAcceptedFreelancer = true
				break
			}
		}
	}

	if !isAcceptedFreelancer {
		common.RespondForbidden(c, "только принятый исполнитель может отметить заказ как выполненный")
		return
	}

	// Получаем требования и вложения заказа, чтобы не потерять их при обновлении
	requirements, err := h.orders.ListRequirements(c.Request.Context(), orderID)
	if err != nil {
		common.RespondInternalError(c, err.Error())
		return
	}

	attachments, err := h.orders.ListAttachments(c.Request.Context(), orderID)
	if err != nil {
		common.RespondInternalError(c, err.Error())
		return
	}

	// Получаем ID вложений
	attachmentIDs := make([]uuid.UUID, 0, len(attachments))
	for _, att := range attachments {
		attachmentIDs = append(attachmentIDs, att.MediaID)
	}

	// Обновляем статус заказа на completed, сохраняя все существующие данные
	updated, err := h.orders.UpdateOrder(c.Request.Context(), service.UpdateOrderInput{
		OrderID:       orderID,
		ClientID:      order.ClientID,    // Используем оригинального клиента
		Title:         order.Title,       // Сохраняем существующий заголовок
		Description:   order.Description, // Сохраняем существующее описание
		BudgetMin:     order.BudgetMin,
		BudgetMax:     order.BudgetMax,
		DeadlineAt:    order.DeadlineAt,
		Status:        models.OrderStatusCompleted,
		Requirements:  requirements,
		AttachmentIDs: attachmentIDs,
	})
	if err != nil {
		common.RespondInternalError(c, err.Error())
		return
	}

	// WebSocket уведомления
	if h.hub != nil {
		payload := gin.H{
			"order":   updated,
			"message": "Исполнитель отметил заказ как выполненный",
		}
		_ = h.hub.BroadcastToUser(order.ClientID, "order.updated", payload)
		_ = h.hub.BroadcastToUser(userID, "order.updated", payload)
	}

	common.RespondJSON(c, http.StatusOK, gin.H{
		"order":   updated,
		"message": "Заказ успешно отмечен как выполненный",
	})
}

// GetProposalFeedback обрабатывает GET /ai/orders/:id/proposals/feedback - получает рекомендации по улучшению отклика.
