package ws

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/models"
)

// CommandDependencies описывает внешние зависимости обработчика команд.
type CommandDependencies struct {
	MarkNotificationRead     func(ctx context.Context, userID, notificationID uuid.UUID) error
	MarkAllNotificationsRead func(ctx context.Context, userID uuid.UUID) error
	UpsertMessageRead        func(ctx context.Context, userID, conversationID, messageID uuid.UUID) error
	CountUnreadNotifications func(ctx context.Context, userID uuid.UUID) (int, error)
	GetConversationByID      func(ctx context.Context, conversationID uuid.UUID) (*models.Conversation, error)
	GetMessageByID           func(ctx context.Context, messageID uuid.UUID) (*models.Message, error)
}

// DefaultCommandHandler - базовый обработчик WS команд.
type DefaultCommandHandler struct {
	deps CommandDependencies
}

func NewDefaultCommandHandler(deps CommandDependencies) *DefaultCommandHandler {
	return &DefaultCommandHandler{deps: deps}
}

func (h *DefaultCommandHandler) Handle(ctx context.Context, request ClientCommandEnvelope, hub *Hub, userID uuid.UUID) error {
	switch request.Cmd {
	case "presence.subscribe":
		targets, err := parseTargetsPayload(request.Data)
		if err != nil {
			return NackError("ws_invalid_payload", err.Error())
		}
		hub.SetPresenceSubscription(userID, targets)
		return nil
	case "presence.unsubscribe":
		targets, err := parseUnsubscribePayload(request.Data)
		if err != nil {
			return NackError("ws_invalid_payload", err.Error())
		}
		hub.SetPresenceSubscription(userID, targets)
		return nil
	case "chat.typing.set":
		payload, err := parseTypingPayload(request.Data)
		if err != nil {
			return NackError("ws_invalid_payload", err.Error())
		}
		store := hub.RTStore()
		if store != nil {
			if payload.IsTyping {
				_ = store.SetTyping(ctx, userID, payload.ConversationID, hub.TypingTTL())
			} else {
				_ = store.ClearTyping(ctx, userID, payload.ConversationID)
			}
		}
		typingUsers := []string{userID.String()}
		if store != nil {
			if current, err := store.GetTyping(ctx, payload.ConversationID); err == nil {
				typingUsers = make([]string, 0, len(current))
				for _, id := range current {
					typingUsers = append(typingUsers, id.String())
				}
			}
		}
		eventData := map[string]interface{}{
			"conversation_id": payload.ConversationID.String(),
			"user_id":         userID.String(),
			"is_typing":       payload.IsTyping,
			"typing_users":    typingUsers,
		}
		if payload.TargetUserID != nil {
			return hub.BroadcastToUser(*payload.TargetUserID, "chat.typing.updated", eventData)
		}
		if h.deps.GetConversationByID != nil {
			conv, err := h.deps.GetConversationByID(ctx, payload.ConversationID)
			if err == nil && conv != nil {
				if conv.ClientID == userID && conv.FreelancerID != userID {
					return hub.BroadcastToUser(conv.FreelancerID, "chat.typing.updated", eventData)
				}
				if conv.FreelancerID == userID && conv.ClientID != userID {
					return hub.BroadcastToUser(conv.ClientID, "chat.typing.updated", eventData)
				}
			}
		}
		return nil
	case "chat.message.read.upsert":
		conversationID, messageID, err := parseReadPayload(request.Data)
		if err != nil {
			return NackError("ws_invalid_payload", err.Error())
		}
		if h.deps.GetConversationByID != nil {
			conv, err := h.deps.GetConversationByID(ctx, conversationID)
			if err != nil {
				return NackError("ws_not_found", "conversation not found")
			}
			if conv.ClientID != userID && conv.FreelancerID != userID {
				return NackError("ws_forbidden", "no access to conversation")
			}
			if h.deps.GetMessageByID != nil {
				msg, err := h.deps.GetMessageByID(ctx, messageID)
				if err != nil {
					return NackError("ws_not_found", "message not found")
				}
				if msg.ConversationID != conversationID {
					return NackError("ws_invalid_payload", "message does not belong to conversation")
				}
			}
			if h.deps.UpsertMessageRead != nil {
				if err := h.deps.UpsertMessageRead(ctx, userID, conversationID, messageID); err != nil {
					return err
				}
			}
			event := map[string]string{
				"conversation_id": conversationID.String(),
				"message_id":      messageID.String(),
				"user_id":         userID.String(),
			}
			_ = hub.BroadcastToUser(conv.ClientID, "chat.message.read", event)
			if conv.FreelancerID != conv.ClientID {
				_ = hub.BroadcastToUser(conv.FreelancerID, "chat.message.read", event)
			}
			return nil
		}
		if h.deps.UpsertMessageRead != nil {
			if err := h.deps.UpsertMessageRead(ctx, userID, conversationID, messageID); err != nil {
				return err
			}
		}
		return hub.BroadcastToUser(userID, "chat.message.read", map[string]string{
			"conversation_id": conversationID.String(),
			"message_id":      messageID.String(),
		})
	case "notification.mark_read":
		notificationID, err := parseSingleUUID(request.Data, "notification_id")
		if err != nil {
			return NackError("ws_invalid_payload", err.Error())
		}
		if h.deps.MarkNotificationRead != nil {
			if err := h.deps.MarkNotificationRead(ctx, userID, notificationID); err != nil {
				return err
			}
		}
		_ = hub.BroadcastToUser(userID, "notification.read", map[string]string{
			"notification_id": notificationID.String(),
		})
		if h.deps.CountUnreadNotifications != nil {
			if count, err := h.deps.CountUnreadNotifications(ctx, userID); err == nil {
				_ = hub.BroadcastToUser(userID, "notification.unread_count.updated", map[string]int{
					"unread_count": count,
				})
			}
		}
		return nil
	case "notification.mark_all_read":
		if h.deps.MarkAllNotificationsRead != nil {
			if err := h.deps.MarkAllNotificationsRead(ctx, userID); err != nil {
				return err
			}
		}
		_ = hub.BroadcastToUser(userID, "notification.read", map[string]bool{"all": true})
		if h.deps.CountUnreadNotifications != nil {
			if count, err := h.deps.CountUnreadNotifications(ctx, userID); err == nil {
				_ = hub.BroadcastToUser(userID, "notification.unread_count.updated", map[string]int{
					"unread_count": count,
				})
			}
		}
		return nil
	case "ai.assistant.stop":
		return hub.BroadcastToUser(userID, "ai.assistant.stopped", map[string]string{"status": "stopped"})
	default:
		return NackError("ws_unsupported_command", "неподдерживаемая команда")
	}
}

func parseTargetsPayload(raw interface{}) ([]uuid.UUID, error) {
	payload, ok := raw.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid presence.subscribe payload")
	}
	items, ok := payload["target_user_ids"].([]interface{})
	if !ok {
		return nil, fmt.Errorf("target_user_ids is required")
	}

	result := make([]uuid.UUID, 0, len(items))
	for _, item := range items {
		value, ok := item.(string)
		if !ok {
			continue
		}
		parsed, err := uuid.Parse(value)
		if err != nil {
			return nil, err
		}
		result = append(result, parsed)
	}
	return result, nil
}

func parseUnsubscribePayload(raw interface{}) ([]uuid.UUID, error) {
	if raw == nil {
		return []uuid.UUID{}, nil
	}
	payload, ok := raw.(map[string]interface{})
	if !ok {
		return []uuid.UUID{}, nil
	}
	itemsRaw, exists := payload["target_user_ids"]
	if !exists {
		return []uuid.UUID{}, nil
	}
	items, ok := itemsRaw.([]interface{})
	if !ok {
		return nil, fmt.Errorf("target_user_ids must be array")
	}
	result := make([]uuid.UUID, 0, len(items))
	for _, item := range items {
		value, ok := item.(string)
		if !ok {
			continue
		}
		parsed, err := uuid.Parse(value)
		if err != nil {
			return nil, err
		}
		result = append(result, parsed)
	}
	return result, nil
}

func parseSingleUUID(raw interface{}, key string) (uuid.UUID, error) {
	payload, ok := raw.(map[string]interface{})
	if !ok {
		return uuid.Nil, fmt.Errorf("invalid payload")
	}
	value, ok := payload[key].(string)
	if !ok {
		return uuid.Nil, fmt.Errorf("missing %s", key)
	}
	return uuid.Parse(value)
}

func parseReadPayload(raw interface{}) (uuid.UUID, uuid.UUID, error) {
	payload, ok := raw.(map[string]interface{})
	if !ok {
		return uuid.Nil, uuid.Nil, fmt.Errorf("invalid payload")
	}
	conversationIDRaw, ok := payload["conversation_id"].(string)
	if !ok {
		return uuid.Nil, uuid.Nil, fmt.Errorf("missing conversation_id")
	}
	messageIDRaw, ok := payload["message_id"].(string)
	if !ok {
		return uuid.Nil, uuid.Nil, fmt.Errorf("missing message_id")
	}
	conversationID, err := uuid.Parse(conversationIDRaw)
	if err != nil {
		return uuid.Nil, uuid.Nil, err
	}
	messageID, err := uuid.Parse(messageIDRaw)
	if err != nil {
		return uuid.Nil, uuid.Nil, err
	}
	return conversationID, messageID, nil
}

type typingPayload struct {
	ConversationID uuid.UUID
	IsTyping       bool
	TargetUserID   *uuid.UUID
}

func parseTypingPayload(raw interface{}) (*typingPayload, error) {
	payload, ok := raw.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid typing payload")
	}
	conversationIDRaw, ok := payload["conversation_id"].(string)
	if !ok {
		return nil, fmt.Errorf("missing conversation_id")
	}
	conversationID, err := uuid.Parse(conversationIDRaw)
	if err != nil {
		return nil, err
	}
	isTyping, ok := payload["is_typing"].(bool)
	if !ok {
		return nil, fmt.Errorf("is_typing must be boolean")
	}
	result := &typingPayload{
		ConversationID: conversationID,
		IsTyping:       isTyping,
	}
	value, exists := payload["target_user_id"]
	if exists {
		rawID, ok := value.(string)
		if !ok || rawID == "" {
			return nil, fmt.Errorf("invalid target_user_id")
		}
		parsed, err := uuid.Parse(rawID)
		if err != nil {
			return nil, err
		}
		result.TargetUserID = &parsed
	}
	return result, nil
}
