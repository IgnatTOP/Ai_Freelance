package dto

import (
	"time"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
)

type SendMessageRequest struct {
	Content       string   `json:"content"`
	AttachmentIDs []string `json:"attachment_ids"`
}

type UpdateMessageRequest struct {
	Content string `json:"content" binding:"required"`
}

type AddReactionRequest struct {
	Emoji string `json:"emoji" binding:"required"`
}

type OtherUserInfo struct {
	ID          uuid.UUID `json:"id"`
	DisplayName string    `json:"display_name"`
	PhotoURL    *string   `json:"photo_url,omitempty"`
}

type ConversationResponse struct {
	ID           uuid.UUID        `json:"id"`
	OrderID      uuid.UUID        `json:"order_id"`
	ClientID     uuid.UUID        `json:"client_id"`
	FreelancerID uuid.UUID        `json:"freelancer_id"`
	OrderTitle   string           `json:"order_title,omitempty"`
	OtherUser    *OtherUserInfo   `json:"other_user,omitempty"`
	LastMessage  *MessageResponse `json:"last_message,omitempty"`
	UnreadCount  int              `json:"unread_count"`
	CreatedAt    time.Time        `json:"created_at"`
	UpdatedAt    time.Time        `json:"updated_at"`
}

type MessageResponse struct {
	ID             uuid.UUID                   `json:"id"`
	ConversationID uuid.UUID                   `json:"conversation_id"`
	SenderID       uuid.UUID                   `json:"sender_id"`
	AuthorID       uuid.UUID                   `json:"author_id"`
	Content        string                      `json:"content"`
	Attachments    []MessageAttachmentResponse `json:"attachments,omitempty"`
	Reactions      []ReactionResponse          `json:"reactions,omitempty"`
	IsEdited       bool                        `json:"is_edited"`
	CreatedAt      time.Time                   `json:"created_at"`
	UpdatedAt      time.Time                   `json:"updated_at"`
}

type MessageAttachmentResponse struct {
	ID        uuid.UUID         `json:"id"`
	MessageID uuid.UUID         `json:"message_id"`
	MediaID   uuid.UUID         `json:"media_id"`
	Media     MediaFileResponse `json:"media"`
	CreatedAt time.Time         `json:"created_at"`
}

type MediaFileResponse struct {
	ID       uuid.UUID `json:"id"`
	FilePath string    `json:"file_path"`
	FileType string    `json:"file_type"`
	FileSize int64     `json:"file_size"`
}

type ReactionResponse struct {
	ID        uuid.UUID `json:"id"`
	MessageID uuid.UUID `json:"message_id"`
	UserID    uuid.UUID `json:"user_id"`
	Emoji     string    `json:"emoji"`
	CreatedAt time.Time `json:"created_at"`
}

func ToConversationResponse(conv *entity.Conversation) ConversationResponse {
	return ConversationResponse{
		ID:           conv.ID,
		OrderID:      conv.OrderID,
		ClientID:     conv.ClientID,
		FreelancerID: conv.FreelancerID,
		CreatedAt:    conv.CreatedAt,
		UpdatedAt:    conv.UpdatedAt,
	}
}

func ToConversationResponses(convs []*entity.Conversation) []ConversationResponse {
	result := make([]ConversationResponse, len(convs))
	for i, conv := range convs {
		result[i] = ToConversationResponse(conv)
	}
	return result
}

func ToMessageResponse(msg *entity.Message) MessageResponse {
	response := MessageResponse{
		ID:             msg.ID,
		ConversationID: msg.ConversationID,
		SenderID:       msg.SenderID,
		AuthorID:       msg.SenderID,
		Content:        msg.Content,
		IsEdited:       msg.IsEdited,
		CreatedAt:      msg.CreatedAt,
		UpdatedAt:      msg.UpdatedAt,
	}
	if len(msg.Attachments) > 0 {
		response.Attachments = make([]MessageAttachmentResponse, 0, len(msg.Attachments))
		for _, attachment := range msg.Attachments {
			response.Attachments = append(response.Attachments, MessageAttachmentResponse{
				ID:        attachment.ID,
				MessageID: attachment.MessageID,
				MediaID:   attachment.MediaID,
				Media: MediaFileResponse{
					ID:       attachment.MediaID,
					FilePath: attachment.FilePath,
					FileType: attachment.FileType,
					FileSize: attachment.FileSize,
				},
				CreatedAt: attachment.CreatedAt,
			})
		}
	}
	if len(msg.Reactions) > 0 {
		response.Reactions = make([]ReactionResponse, 0, len(msg.Reactions))
		for _, reaction := range msg.Reactions {
			response.Reactions = append(response.Reactions, ToReactionResponse(reaction))
		}
	}
	return response
}

func ToMessageResponses(msgs []*entity.Message) []MessageResponse {
	result := make([]MessageResponse, len(msgs))
	for i, msg := range msgs {
		result[i] = ToMessageResponse(msg)
	}
	return result
}

func ToReactionResponse(r *entity.MessageReaction) ReactionResponse {
	return ReactionResponse{
		ID:        r.ID,
		MessageID: r.MessageID,
		UserID:    r.UserID,
		Emoji:     r.Emoji,
		CreatedAt: r.CreatedAt,
	}
}
