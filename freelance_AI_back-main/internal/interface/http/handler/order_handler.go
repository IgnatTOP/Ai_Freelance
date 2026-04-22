package handler

import (
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
	"github.com/ignatzorin/freelance-backend/internal/interface/http/dto"
	"github.com/ignatzorin/freelance-backend/internal/interface/http/response"
	"github.com/ignatzorin/freelance-backend/internal/usecase/order"
	"github.com/ignatzorin/freelance-backend/internal/ws"
)

type OrderHandler struct {
	createOrderUC   *order.CreateOrderUseCase
	updateOrderUC   *order.UpdateOrderUseCase
	getOrderUC      *order.GetOrderUseCase
	listOrdersUC    *order.ListOrdersUseCase
	deleteOrderUC   *order.DeleteOrderUseCase
	publishOrderUC  *order.PublishOrderUseCase
	cancelOrderUC   *order.CancelOrderUseCase
	completeOrderUC *order.CompleteOrderUseCase
	listMyOrdersUC  *order.ListMyOrdersUseCase
	broadcaster     ws.RealtimeBroadcaster
}

func NewOrderHandler(
	createOrderUC *order.CreateOrderUseCase,
	updateOrderUC *order.UpdateOrderUseCase,
	getOrderUC *order.GetOrderUseCase,
	listOrdersUC *order.ListOrdersUseCase,
	deleteOrderUC *order.DeleteOrderUseCase,
) *OrderHandler {
	return &OrderHandler{
		createOrderUC: createOrderUC,
		updateOrderUC: updateOrderUC,
		getOrderUC:    getOrderUC,
		listOrdersUC:  listOrdersUC,
		deleteOrderUC: deleteOrderUC,
	}
}

func NewOrderHandlerFull(
	createOrderUC *order.CreateOrderUseCase,
	updateOrderUC *order.UpdateOrderUseCase,
	getOrderUC *order.GetOrderUseCase,
	listOrdersUC *order.ListOrdersUseCase,
	deleteOrderUC *order.DeleteOrderUseCase,
	publishOrderUC *order.PublishOrderUseCase,
	cancelOrderUC *order.CancelOrderUseCase,
	completeOrderUC *order.CompleteOrderUseCase,
	listMyOrdersUC *order.ListMyOrdersUseCase,
) *OrderHandler {
	return &OrderHandler{
		createOrderUC:   createOrderUC,
		updateOrderUC:   updateOrderUC,
		getOrderUC:      getOrderUC,
		listOrdersUC:    listOrdersUC,
		deleteOrderUC:   deleteOrderUC,
		publishOrderUC:  publishOrderUC,
		cancelOrderUC:   cancelOrderUC,
		completeOrderUC: completeOrderUC,
		listMyOrdersUC:  listMyOrdersUC,
	}
}

func (h *OrderHandler) SetBroadcaster(b ws.RealtimeBroadcaster) {
	h.broadcaster = b
}

func (h *OrderHandler) CreateOrder(c *gin.Context) {
	userID, ok := requireUserID(c, "требуется авторизация")
	if !ok {
		return
	}

	var req dto.CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "некорректные данные запроса")
		return
	}

	deadline, err := dto.ParseDeadline(req.DeadlineAt)
	if err != nil {
		response.BadRequest(c, "некорректный формат дедлайна")
		return
	}

	attachmentIDs, err := dto.ParseUUIDs(req.AttachmentIDs)
	if err != nil {
		response.BadRequest(c, "некорректный формат ID вложений")
		return
	}

	requirements := make([]order.RequirementInput, 0, len(req.Requirements))
	for _, r := range req.Requirements {
		requirements = append(requirements, order.RequirementInput{
			Skill: r.Skill,
			Level: r.Level,
		})
	}

	var categoryID *uuid.UUID
	if req.CategoryID != nil && *req.CategoryID != "" {
		parsed, err := uuid.Parse(*req.CategoryID)
		if err != nil {
			response.BadRequest(c, "некорректный category_id")
			return
		}
		categoryID = &parsed
	}

	createdOrder, err := h.createOrderUC.Execute(c.Request.Context(), order.CreateOrderInput{
		ClientID:      userID,
		CategoryID:    categoryID,
		Title:         req.Title,
		Description:   req.Description,
		BudgetMin:     req.BudgetMin,
		BudgetMax:     req.BudgetMax,
		DeadlineAt:    deadline,
		Requirements:  requirements,
		AttachmentIDs: attachmentIDs,
	})
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Created(c, dto.ToOrderResponse(createdOrder))
}

func (h *OrderHandler) GetOrder(c *gin.Context) {
	orderID, ok := parseUUIDParam(c, "id", "некорректный ID заказа")
	if !ok {
		return
	}

	o, err := h.getOrderUC.Execute(c.Request.Context(), orderID)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, dto.ToOrderResponse(o))
}

func (h *OrderHandler) ListOrders(c *gin.Context) {
	sortBy := c.DefaultQuery("sort_by", "created_at")
	if sortBy == "proposals" {
		sortBy = "proposals_count"
	}

	filter := repository.OrderFilter{
		Status:    c.Query("status"),
		Search:    c.Query("search"),
		SortBy:    sortBy,
		SortOrder: c.DefaultQuery("sort_order", "desc"),
		Limit:     parseIntQuery(c, "limit", 20),
		Offset:    parseIntQuery(c, "offset", 0),
	}

	if skillsRaw := strings.TrimSpace(c.Query("skills")); skillsRaw != "" {
		skills := strings.Split(skillsRaw, ",")
		filter.Skills = make([]string, 0, len(skills))
		for _, skill := range skills {
			skill = strings.TrimSpace(skill)
			if skill != "" {
				filter.Skills = append(filter.Skills, skill)
			}
		}
	}

	if categoryIDStr := c.Query("category_id"); categoryIDStr != "" {
		parsed, err := uuid.Parse(categoryIDStr)
		if err != nil {
			response.BadRequest(c, "некорректный category_id")
			return
		}
		filter.CategoryID = &parsed
	}

	if budgetMin := parseFloatQuery(c, "budget_min"); budgetMin != nil {
		filter.BudgetMin = budgetMin
	}
	if budgetMax := parseFloatQuery(c, "budget_max"); budgetMax != nil {
		filter.BudgetMax = budgetMax
	}
	if minProposals, err := parseIntQueryPtr(c, "min_proposals"); err != nil {
		response.BadRequest(c, "некорректный min_proposals")
		return
	} else if minProposals != nil {
		if *minProposals < 0 {
			response.BadRequest(c, "min_proposals не может быть отрицательным")
			return
		}
		filter.MinProposals = minProposals
	}
	if maxProposals, err := parseIntQueryPtr(c, "max_proposals"); err != nil {
		response.BadRequest(c, "некорректный max_proposals")
		return
	} else if maxProposals != nil {
		if *maxProposals < 0 {
			response.BadRequest(c, "max_proposals не может быть отрицательным")
			return
		}
		filter.MaxProposals = maxProposals
	}
	if filter.MinProposals != nil && filter.MaxProposals != nil && *filter.MinProposals > *filter.MaxProposals {
		response.BadRequest(c, "min_proposals не может быть больше max_proposals")
		return
	}

	orders, total, err := h.listOrdersUC.Execute(c.Request.Context(), filter)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Paginated(c, dto.ToOrderResponses(orders), total, filter.Limit, filter.Offset)
}

func parseIntQueryPtr(c *gin.Context, key string) (*int, error) {
	raw := strings.TrimSpace(c.Query(key))
	if raw == "" {
		return nil, nil
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return nil, err
	}
	return &value, nil
}

func (h *OrderHandler) UpdateOrder(c *gin.Context) {
	userID, ok := requireUserID(c, "требуется авторизация")
	if !ok {
		return
	}

	orderID, ok := parseUUIDParam(c, "id", "некорректный ID заказа")
	if !ok {
		return
	}

	var req dto.UpdateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "некорректные данные запроса")
		return
	}

	deadline, err := dto.ParseDeadline(req.DeadlineAt)
	if err != nil {
		response.BadRequest(c, "некорректный формат дедлайна")
		return
	}

	attachmentIDs, err := dto.ParseUUIDs(req.AttachmentIDs)
	if err != nil {
		response.BadRequest(c, "некорректный формат ID вложений")
		return
	}

	requirements := make([]order.RequirementInput, 0, len(req.Requirements))
	for _, r := range req.Requirements {
		requirements = append(requirements, order.RequirementInput{
			Skill: r.Skill,
			Level: r.Level,
		})
	}

	var categoryID *uuid.UUID
	categorySet := false
	if req.CategoryID != nil {
		categorySet = true
		if *req.CategoryID != "" {
			parsed, err := uuid.Parse(*req.CategoryID)
			if err != nil {
				response.BadRequest(c, "некорректный category_id")
				return
			}
			categoryID = &parsed
		}
	}

	updatedOrder, err := h.updateOrderUC.Execute(c.Request.Context(), order.UpdateOrderInput{
		OrderID:       orderID,
		ClientID:      userID,
		CategoryID:    categoryID,
		CategorySet:   categorySet,
		Title:         req.Title,
		Description:   req.Description,
		BudgetMin:     req.BudgetMin,
		BudgetMax:     req.BudgetMax,
		DeadlineAt:    deadline,
		Requirements:  requirements,
		AttachmentIDs: attachmentIDs,
	})
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, dto.ToOrderResponse(updatedOrder))
}

func (h *OrderHandler) DeleteOrder(c *gin.Context) {
	userID, ok := requireUserID(c, "требуется авторизация")
	if !ok {
		return
	}

	orderID, ok := parseUUIDParam(c, "id", "некорректный ID заказа")
	if !ok {
		return
	}

	if err := h.deleteOrderUC.Execute(c.Request.Context(), orderID, userID); err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, gin.H{"message": "заказ успешно удалён"})
}

func (h *OrderHandler) PublishOrder(c *gin.Context) {
	userID, ok := requireUserID(c, "требуется авторизация")
	if !ok {
		return
	}

	orderID, ok := parseUUIDParam(c, "id", "некорректный ID заказа")
	if !ok {
		return
	}

	if h.publishOrderUC == nil {
		response.BadRequest(c, "функция недоступна")
		return
	}

	o, err := h.publishOrderUC.Execute(c.Request.Context(), orderID, userID)
	if err != nil {
		response.Error(c, err)
		return
	}
	if h.broadcaster != nil {
		_ = h.broadcaster.EmitGlobal("order.created", dto.ToOrderResponse(o))
	}

	response.Success(c, dto.ToOrderResponse(o))
}

func (h *OrderHandler) CancelOrder(c *gin.Context) {
	userID, ok := requireUserID(c, "требуется авторизация")
	if !ok {
		return
	}

	orderID, ok := parseUUIDParam(c, "id", "некорректный ID заказа")
	if !ok {
		return
	}

	if h.cancelOrderUC == nil {
		response.BadRequest(c, "функция недоступна")
		return
	}

	o, err := h.cancelOrderUC.Execute(c.Request.Context(), orderID, userID)
	if err != nil {
		response.Error(c, err)
		return
	}
	if h.broadcaster != nil {
		_ = h.broadcaster.EmitGlobal("order.updated", dto.ToOrderResponse(o))
	}

	response.Success(c, dto.ToOrderResponse(o))
}

func (h *OrderHandler) CompleteOrder(c *gin.Context) {
	userID, ok := requireUserID(c, "требуется авторизация")
	if !ok {
		return
	}

	orderID, ok := parseUUIDParam(c, "id", "некорректный ID заказа")
	if !ok {
		return
	}

	if h.completeOrderUC == nil {
		response.BadRequest(c, "функция недоступна")
		return
	}

	o, err := h.completeOrderUC.Execute(c.Request.Context(), orderID, userID)
	if err != nil {
		response.Error(c, err)
		return
	}
	if h.broadcaster != nil {
		_ = h.broadcaster.EmitGlobal("order.updated", dto.ToOrderResponse(o))
	}

	response.Success(c, dto.ToOrderResponse(o))
}

func (h *OrderHandler) ListMyOrders(c *gin.Context) {
	userID, ok := requireUserID(c, "требуется авторизация")
	if !ok {
		return
	}

	if h.listMyOrdersUC == nil {
		response.BadRequest(c, "функция недоступна")
		return
	}

	orders, err := h.listMyOrdersUC.Execute(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, dto.ToOrderResponses(orders))
}
