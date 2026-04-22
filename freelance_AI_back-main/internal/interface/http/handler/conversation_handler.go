package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
	"github.com/ignatzorin/freelance-backend/internal/interface/http/dto"
	"github.com/ignatzorin/freelance-backend/internal/interface/http/response"
	"github.com/ignatzorin/freelance-backend/internal/usecase/conversation"
	"github.com/ignatzorin/freelance-backend/internal/ws"
)

type ConversationHandler struct {
	getOrCreateConvUC *conversation.GetOrCreateConversationUseCase
	getOrderChatUC    *conversation.GetOrderChatUseCase
	listMyConvsUC     *conversation.ListMyConversationsUseCase
	sendMessageUC     *conversation.SendMessageUseCase
	listMessagesUC    *conversation.ListMessagesUseCase
	updateMessageUC   *conversation.UpdateMessageUseCase
	deleteMessageUC   *conversation.DeleteMessageUseCase
	addReactionUC     *conversation.AddReactionUseCase
	removeReactionUC  *conversation.RemoveReactionUseCase
	broadcaster       ws.RealtimeBroadcaster
	msgRepo           repository.MessageRepository
	orderRepo         repository.OrderRepository
	userRepo          repository.UserRepository
}

func NewConversationHandler(
	getOrCreateConvUC *conversation.GetOrCreateConversationUseCase,
	getOrderChatUC *conversation.GetOrderChatUseCase,
	listMyConvsUC *conversation.ListMyConversationsUseCase,
	sendMessageUC *conversation.SendMessageUseCase,
	listMessagesUC *conversation.ListMessagesUseCase,
	updateMessageUC *conversation.UpdateMessageUseCase,
	deleteMessageUC *conversation.DeleteMessageUseCase,
	addReactionUC *conversation.AddReactionUseCase,
	removeReactionUC *conversation.RemoveReactionUseCase,
	msgRepo repository.MessageRepository,
	orderRepo repository.OrderRepository,
	userRepo repository.UserRepository,
) *ConversationHandler {
	return &ConversationHandler{
		getOrCreateConvUC: getOrCreateConvUC,
		getOrderChatUC:    getOrderChatUC,
		listMyConvsUC:     listMyConvsUC,
		sendMessageUC:     sendMessageUC,
		listMessagesUC:    listMessagesUC,
		updateMessageUC:   updateMessageUC,
		deleteMessageUC:   deleteMessageUC,
		addReactionUC:     addReactionUC,
		removeReactionUC:  removeReactionUC,
		msgRepo:           msgRepo,
		orderRepo:         orderRepo,
		userRepo:          userRepo,
	}
}

func (h *ConversationHandler) SetBroadcaster(b ws.RealtimeBroadcaster) {
	h.broadcaster = b
}

func (h *ConversationHandler) GetOrderChat(c *gin.Context) {
	userID, ok := requireUserID(c, "требуется авторизация")
	if !ok {
		return
	}

	orderID, ok := parseUUIDParam(c, "id", "некорректный ID заказа")
	if !ok {
		return
	}

	conv, err := h.getOrderChatUC.Execute(c.Request.Context(), orderID, userID)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, dto.ToConversationResponse(conv))
}

func (h *ConversationHandler) GetConversation(c *gin.Context) {
	userID, ok := requireUserID(c, "требуется авторизация")
	if !ok {
		return
	}

	orderID, ok := parseUUIDParam(c, "id", "некорректный ID заказа")
	if !ok {
		return
	}

	participantID, ok := parseUUIDParam(c, "participantId", "некорректный ID участника")
	if !ok {
		return
	}

	conv, err := h.getOrCreateConvUC.Execute(c.Request.Context(), orderID, userID, participantID)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, dto.ToConversationResponse(conv))
}

func (h *ConversationHandler) ListMyConversations(c *gin.Context) {
	userID, ok := requireUserID(c, "требуется авторизация")
	if !ok {
		return
	}

	convs, err := h.listMyConvsUC.Execute(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, err)
		return
	}

	ctx := c.Request.Context()
	result := make([]dto.ConversationResponse, 0, len(convs))
	for _, conv := range convs {
		resp := dto.ToConversationResponse(conv)

		// Enrich with order title
		if order, err := h.orderRepo.FindByID(ctx, conv.OrderID); err == nil && order != nil {
			resp.OrderTitle = order.Title
		}

		// Enrich with other user info
		var otherUserID uuid.UUID
		if conv.ClientID == userID {
			otherUserID = conv.FreelancerID
		} else {
			otherUserID = conv.ClientID
		}
		if profile, err := h.userRepo.GetProfile(ctx, otherUserID); err == nil && profile != nil {
			resp.OtherUser = &dto.OtherUserInfo{
				ID:          otherUserID,
				DisplayName: profile.DisplayName,
			}
		}

		// Enrich with last message
		if lastMsg, err := h.msgRepo.GetLastMessage(ctx, conv.ID); err == nil && lastMsg != nil {
			msgResp := dto.ToMessageResponse(lastMsg)
			resp.LastMessage = &msgResp
		}

		result = append(result, resp)
	}

	response.Success(c, result)
}

func (h *ConversationHandler) SendMessage(c *gin.Context) {
	userID, ok := requireUserID(c, "требуется авторизация")
	if !ok {
		return
	}

	conversationID, ok := parseUUIDParam(c, "conversationId", "некорректный ID беседы")
	if !ok {
		return
	}

	var req dto.SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "некорректные данные запроса")
		return
	}

	// Validate: message must have content or attachments
	if req.Content == "" && len(req.AttachmentIDs) == 0 {
		response.BadRequest(c, "сообщение должно содержать текст или вложения")
		return
	}

	// Use content or placeholder for attachment-only messages
	content := req.Content
	if content == "" {
		content = " "
	}

	msg, conv, err := h.sendMessageUC.ExecuteWithConversation(c.Request.Context(), conversationID, userID, content)
	if err != nil {
		response.Error(c, err)
		return
	}

	if h.broadcaster != nil && conv != nil {
		payload := gin.H{
			"conversation_id": conv.ID.String(),
			"message":         dto.ToMessageResponse(msg),
		}
		_ = h.broadcaster.EmitToUsers([]uuid.UUID{conv.ClientID, conv.FreelancerID}, "chat.message.created", payload)
		_ = h.broadcaster.EmitToUsers([]uuid.UUID{conv.ClientID, conv.FreelancerID}, "conversation.updated", gin.H{
			"conversation_id": conv.ID.String(),
		})
	}

	response.Created(c, dto.ToMessageResponse(msg))
}

func (h *ConversationHandler) ListMessages(c *gin.Context) {
	userID, ok := requireUserID(c, "требуется авторизация")
	if !ok {
		return
	}

	conversationID, ok := parseUUIDParam(c, "conversationId", "некорректный ID беседы")
	if !ok {
		return
	}

	limit := parseIntQuery(c, "limit", 50)
	offset := parseIntQuery(c, "offset", 0)

	messages, err := h.listMessagesUC.Execute(c.Request.Context(), conversationID, userID, limit, offset)
	if err != nil {
		response.Error(c, err)
		return
	}

	total := offset + len(messages)
	hasMore := limit > 0 && len(messages) == limit
	if hasMore {
		total++
	}
	response.Paginated(c, dto.ToMessageResponses(messages), total, limit, offset)
}

func (h *ConversationHandler) UpdateMessage(c *gin.Context) {
	userID, ok := requireUserID(c, "требуется авторизация")
	if !ok {
		return
	}

	messageID, ok := parseUUIDParam(c, "messageId", "некорректный ID сообщения")
	if !ok {
		return
	}

	var req dto.UpdateMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "некорректные данные запроса")
		return
	}

	msg, err := h.updateMessageUC.Execute(c.Request.Context(), messageID, userID, req.Content)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, dto.ToMessageResponse(msg))
}

func (h *ConversationHandler) DeleteMessage(c *gin.Context) {
	userID, ok := requireUserID(c, "требуется авторизация")
	if !ok {
		return
	}

	messageID, ok := parseUUIDParam(c, "messageId", "некорректный ID сообщения")
	if !ok {
		return
	}

	if err := h.deleteMessageUC.Execute(c.Request.Context(), messageID, userID); err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, gin.H{"message": "сообщение удалено"})
}

func (h *ConversationHandler) AddReaction(c *gin.Context) {
	userID, ok := requireUserID(c, "требуется авторизация")
	if !ok {
		return
	}

	messageID, ok := parseUUIDParam(c, "messageId", "некорректный ID сообщения")
	if !ok {
		return
	}

	var req dto.AddReactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "некорректные данные запроса")
		return
	}

	reaction, err := h.addReactionUC.Execute(c.Request.Context(), messageID, userID, req.Emoji)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Created(c, dto.ToReactionResponse(reaction))
}

func (h *ConversationHandler) RemoveReaction(c *gin.Context) {
	userID, ok := requireUserID(c, "требуется авторизация")
	if !ok {
		return
	}

	messageID, ok := parseUUIDParam(c, "messageId", "некорректный ID сообщения")
	if !ok {
		return
	}

	if err := h.removeReactionUC.Execute(c.Request.Context(), messageID, userID); err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, gin.H{"message": "реакция удалена"})
}

// MarkRead handles POST /conversations/:conversationId/read
func (h *ConversationHandler) MarkRead(c *gin.Context) {
	_, ok := requireUserID(c, "требуется авторизация")
	if !ok {
		return
	}

	_, ok = parseUUIDParam(c, "conversationId", "некорректный ID беседы")
	if !ok {
		return
	}

	response.Success(c, gin.H{"marked_read": true})
}
