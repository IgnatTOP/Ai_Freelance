package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	httpresp "github.com/ignatzorin/freelance-backend/internal/interface/http/response"
	"github.com/ignatzorin/freelance-backend/internal/pkg/apperror"
	"github.com/ignatzorin/freelance-backend/internal/usecase/portfolio"
)

// PortfolioHandler handles portfolio related requests.
type PortfolioHandler struct {
	createPortfolioItemUC *portfolio.CreatePortfolioItemUseCase
	listPortfolioItemsUC  *portfolio.ListPortfolioItemsUseCase
	deletePortfolioItemUC *portfolio.DeletePortfolioItemUseCase
	getPortfolioItemUC    *portfolio.GetPortfolioItemUseCase
	updatePortfolioItemUC *portfolio.UpdatePortfolioItemUseCase
}

// NewPortfolioHandler creates a new PortfolioHandler.
func NewPortfolioHandler(
	createPortfolioItemUC *portfolio.CreatePortfolioItemUseCase,
	listPortfolioItemsUC *portfolio.ListPortfolioItemsUseCase,
	deletePortfolioItemUC *portfolio.DeletePortfolioItemUseCase,
	getPortfolioItemUC *portfolio.GetPortfolioItemUseCase,
	updatePortfolioItemUC *portfolio.UpdatePortfolioItemUseCase,
) *PortfolioHandler {
	return &PortfolioHandler{
		createPortfolioItemUC: createPortfolioItemUC,
		listPortfolioItemsUC:  listPortfolioItemsUC,
		deletePortfolioItemUC: deletePortfolioItemUC,
		getPortfolioItemUC:    getPortfolioItemUC,
		updatePortfolioItemUC: updatePortfolioItemUC,
	}
}

// CreateItem handles POST /portfolio
func (h *PortfolioHandler) CreateItem(c *gin.Context) {
	var input struct {
		Title        string   `json:"title"`
		Description  *string  `json:"description"`
		CoverMediaID *string  `json:"cover_media_id"`
		AITags       []string `json:"ai_tags"`
		ExternalLink *string  `json:"external_link"`
		MediaIDs     []string `json:"media_ids"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		httpresp.BadRequest(c, err.Error())
		return
	}

	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}

	var coverMediaID *uuid.UUID
	if input.CoverMediaID != nil {
		id, err := uuid.Parse(*input.CoverMediaID)
		if err == nil {
			coverMediaID = &id
		}
	}

	mediaIDs := make([]uuid.UUID, 0, len(input.MediaIDs))
	for _, idStr := range input.MediaIDs {
		if id, err := uuid.Parse(idStr); err == nil {
			mediaIDs = append(mediaIDs, id)
		}
	}

	createInput := portfolio.CreatePortfolioItemInput{
		UserID:       userID,
		Title:        input.Title,
		Description:  input.Description,
		CoverMediaID: coverMediaID,
		AITags:       input.AITags,
		ExternalLink: input.ExternalLink,
		MediaIDs:     mediaIDs,
	}

	item, err := h.createPortfolioItemUC.Run(c.Request.Context(), createInput)
	if err != nil {
		httpresp.Error(c, err)
		return
	}

	httpresp.Created(c, item)
}

// ListItems handles GET /users/:id/portfolio and GET /portfolio
func (h *PortfolioHandler) ListItems(c *gin.Context) {
	var userID uuid.UUID
	if c.Param("id") != "" {
		uid, ok := parseUUIDParam(c, "id", "invalid user id")
		if !ok {
			return
		}
		userID = uid
	} else {
		uid, ok := requireUserID(c, "unauthorized")
		if !ok {
			return
		}
		userID = uid
	}

	limit := parseIntQuery(c, "limit", 10)
	offset := parseIntQuery(c, "offset", 0)

	items, err := h.listPortfolioItemsUC.Run(c.Request.Context(), userID, limit, offset)
	if err != nil {
		httpresp.Error(c, err)
		return
	}

	httpresp.Success(c, items)
}

// DeleteItem handles DELETE /portfolio/:id
func (h *PortfolioHandler) DeleteItem(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}

	id, ok := parseUUIDParam(c, "id", "invalid portfolio item id")
	if !ok {
		return
	}

	if err := h.deletePortfolioItemUC.Run(c.Request.Context(), userID, id); err != nil {
		switch {
		case apperror.IsForbidden(err):
			httpresp.Forbidden(c, "portfolio item does not belong to current user")
		case apperror.IsNotFound(err):
			httpresp.NotFound(c, "portfolio item not found")
		default:
			httpresp.Error(c, err)
		}
		return
	}

	httpresp.Success(c, gin.H{"message": "portfolio item deleted"})
}

// GetItem handles GET /portfolio/:id
func (h *PortfolioHandler) GetItem(c *gin.Context) {
	id, ok := parseUUIDParam(c, "id", "invalid portfolio item id")
	if !ok {
		return
	}

	item, err := h.getPortfolioItemUC.Run(c.Request.Context(), id)
	if err != nil {
		httpresp.Error(c, err)
		return
	}

	httpresp.Success(c, item)
}

// UpdateItem handles PUT /portfolio/:id
func (h *PortfolioHandler) UpdateItem(c *gin.Context) {
	id, ok := parseUUIDParam(c, "id", "invalid portfolio item id")
	if !ok {
		return
	}

	var input struct {
		Title        string   `json:"title"`
		Description  *string  `json:"description"`
		CoverMediaID *string  `json:"cover_media_id"`
		AITags       []string `json:"ai_tags"`
		ExternalLink *string  `json:"external_link"`
		MediaIDs     []string `json:"media_ids"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		httpresp.BadRequest(c, err.Error())
		return
	}

	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}

	var coverMediaID *uuid.UUID
	if input.CoverMediaID != nil {
		uid, err := uuid.Parse(*input.CoverMediaID)
		if err == nil {
			coverMediaID = &uid
		}
	}

	mediaIDs := make([]uuid.UUID, 0, len(input.MediaIDs))
	for _, idStr := range input.MediaIDs {
		if uid, err := uuid.Parse(idStr); err == nil {
			mediaIDs = append(mediaIDs, uid)
		}
	}

	updateInput := portfolio.UpdatePortfolioItemInput{
		ID:           id,
		UserID:       userID,
		Title:        input.Title,
		Description:  input.Description,
		CoverMediaID: coverMediaID,
		AITags:       input.AITags,
		ExternalLink: input.ExternalLink,
		MediaIDs:     mediaIDs,
	}

	item, err := h.updatePortfolioItemUC.Run(c.Request.Context(), updateInput)
	if err != nil {
		switch {
		case apperror.IsForbidden(err):
			httpresp.Forbidden(c, "portfolio item does not belong to current user")
		case apperror.IsNotFound(err):
			httpresp.NotFound(c, "portfolio item not found")
		default:
			httpresp.Error(c, err)
		}
		return
	}

	httpresp.Success(c, item)
}
