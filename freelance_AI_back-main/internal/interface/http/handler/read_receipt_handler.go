package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	httpresp "github.com/ignatzorin/freelance-backend/internal/interface/http/response"
	"github.com/jmoiron/sqlx"
)

type ReadReceiptHandler struct {
	db *sqlx.DB
}

func NewReadReceiptHandler(db *sqlx.DB) *ReadReceiptHandler {
	return &ReadReceiptHandler{db: db}
}

func (h *ReadReceiptHandler) MarkConversationRead(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}
	conversationID, ok := parseUUIDParam(c, "conversationId", "invalid conversation id")
	if !ok {
		return
	}

	var req struct {
		MessageID  *string  `json:"message_id"`
		MessageIDs []string `json:"message_ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		httpresp.BadRequest(c, err.Error())
		return
	}
	messageIDs := make([]uuid.UUID, 0, 8)
	if req.MessageID != nil && *req.MessageID != "" {
		messageID, err := uuid.Parse(*req.MessageID)
		if err != nil {
			httpresp.BadRequest(c, "invalid message_id")
			return
		}
		messageIDs = append(messageIDs, messageID)
	}
	for _, rawID := range req.MessageIDs {
		parsed, err := uuid.Parse(rawID)
		if err != nil {
			httpresp.BadRequest(c, "invalid message_ids")
			return
		}
		messageIDs = append(messageIDs, parsed)
	}
	if len(messageIDs) == 0 {
		httpresp.BadRequest(c, "message_id or message_ids is required")
		return
	}

	for _, messageID := range messageIDs {
		if _, err := h.db.Exec(
			`INSERT INTO message_reads (conversation_id, message_id, user_id)
			 VALUES ($1, $2, $3)
			 ON CONFLICT (message_id, user_id) DO UPDATE SET read_at = NOW()`,
			conversationID,
			messageID,
			userID,
		); err != nil {
			httpresp.Error(c, err)
			return
		}
	}

	httpresp.Success(c, gin.H{"marked_read": true, "messages_count": len(messageIDs)})
}
