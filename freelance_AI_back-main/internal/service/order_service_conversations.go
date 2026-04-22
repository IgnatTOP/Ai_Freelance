package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"github.com/ignatzorin/freelance-backend/internal/models"
	"github.com/ignatzorin/freelance-backend/internal/repository"
)

// GetConversation возвращает существующий чат между клиентом и исполнителем.
func (s *OrderService) GetConversation(ctx context.Context, orderID uuid.UUID, clientID, freelancerID uuid.UUID) (*models.Conversation, error) {
	return s.repoConversations.GetConversationByParticipants(ctx, orderID, clientID, freelancerID)
}

// GetConversationByID возвращает чат по идентификатору.
func (s *OrderService) GetConversationByID(ctx context.Context, id uuid.UUID) (*models.Conversation, error) {
	return s.repoConversations.GetConversationByID(ctx, id)
}

// GetOrderChat возвращает чат для заказа (только если есть accepted proposal).
// Для заказчика возвращает чат с принятым исполнителем.
// Для исполнителя возвращает чат, если его предложение принято.
func (s *OrderService) GetOrderChat(ctx context.Context, orderID uuid.UUID, userID uuid.UUID) (*models.Conversation, *models.Proposal, error) {
	order, err := s.repoOrders.GetByID(ctx, orderID)
	if err != nil {
		return nil, nil, err
	}

	// Получаем accepted proposal для этого заказа
	proposals, err := s.repoProposals.ListProposals(ctx, orderID)
	if err != nil {
		return nil, nil, err
	}

	var acceptedProposal *models.Proposal
	for i := range proposals {
		if proposals[i].Status == models.ProposalStatusAccepted {
			acceptedProposal = &proposals[i]
			break
		}
	}

	if acceptedProposal == nil {
		return nil, nil, fmt.Errorf("order service: для этого заказа нет принятого исполнителя")
	}

	// Проверяем доступ
	if order.ClientID != userID && acceptedProposal.FreelancerID != userID {
		return nil, nil, fmt.Errorf("order service: у вас нет доступа к этому чату")
	}

	// Получаем или создаем чат
	conversation, err := s.repoConversations.GetConversationByParticipants(ctx, orderID, order.ClientID, acceptedProposal.FreelancerID)
	if err != nil {
		if errors.Is(err, repository.ErrConversationNotFound) {
			// Создаем чат, если его нет
			conversation = &models.Conversation{
				OrderID:      &orderID,
				ClientID:     order.ClientID,
				FreelancerID: acceptedProposal.FreelancerID,
			}
			if err := s.repoConversations.CreateConversation(ctx, conversation); err != nil {
				return nil, nil, err
			}
		} else {
			return nil, nil, err
		}
	}

	return conversation, acceptedProposal, nil
}

// ListMyConversations возвращает все чаты пользователя.
func (s *OrderService) ListMyConversations(ctx context.Context, userID uuid.UUID) ([]models.Conversation, error) {
	return s.repoConversations.ListMyConversations(ctx, userID)
}

// GetLastMessageForConversation возвращает последнее сообщение в чате.
func (s *OrderService) GetLastMessageForConversation(ctx context.Context, conversationID uuid.UUID) (*models.Message, error) {
	return s.repoMessages.GetLastMessageForConversation(ctx, conversationID)
}

// CountUnreadMessages возвращает количество непрочитанных сообщений в чате для пользователя.
func (s *OrderService) CountUnreadMessages(ctx context.Context, conversationID, userID uuid.UUID) (int, error) {
	return s.repoMessages.CountUnreadMessages(ctx, conversationID, userID)
}

// GetMessageAttachments возвращает вложения сообщения.
func (s *OrderService) GetMessageAttachments(ctx context.Context, messageID uuid.UUID) ([]models.MessageAttachment, error) {
	return s.repoMessages.GetMessageAttachments(ctx, messageID)
}

// ListMessages возвращает сообщения в чате с пагинацией.
func (s *OrderService) ListMessages(ctx context.Context, conversationID uuid.UUID, limit, offset int) ([]models.Message, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	return s.repoMessages.ListMessages(ctx, conversationID, limit, offset)
}

// SendMessage добавляет сообщение в чат.
func (s *OrderService) SendMessage(ctx context.Context, conversationID, authorID uuid.UUID, content string, parentMessageID *uuid.UUID, attachmentMediaIDs []uuid.UUID) (*models.Message, *models.Conversation, error) {
	// Валидация входных данных
	if content == "" && len(attachmentMediaIDs) == 0 {
		return nil, nil, fmt.Errorf("order service: сообщение должно содержать текст или вложения")
	}
	if len(content) > 5000 {
		return nil, nil, fmt.Errorf("order service: сообщение слишком длинное (максимум 5000 символов)")
	}

	conversation, err := s.repoConversations.GetConversationByID(ctx, conversationID)
	if err != nil {
		return nil, nil, err
	}

	var authorType string
	switch {
	case conversation.ClientID == authorID:
		authorType = "client"
	case conversation.FreelancerID == authorID:
		authorType = "freelancer"
	default:
		return nil, nil, fmt.Errorf("order service: у вас нет доступа к этому чату")
	}

	// Проверяем, что parent_message_id существует и принадлежит этому чату
	if parentMessageID != nil {
		parentMessage, err := s.repoMessages.GetMessageByID(ctx, *parentMessageID)
		if err != nil {
			return nil, nil, fmt.Errorf("order service: родительское сообщение не найдено")
		}
		if parentMessage.ConversationID != conversationID {
			return nil, nil, fmt.Errorf("order service: родительское сообщение не принадлежит этому чату")
		}
	}

	message := &models.Message{
		ConversationID:  conversationID,
		AuthorType:      authorType,
		AuthorID:        &authorID,
		Content:         content,
		ParentMessageID: parentMessageID,
		AIMetadata:      json.RawMessage("null"),
	}

	if err := s.repoMessages.AddMessage(ctx, message); err != nil {
		return nil, nil, err
	}

	// Добавляем вложения, если они есть
	if len(attachmentMediaIDs) > 0 {
		if err := s.repoMessages.AddMessageAttachments(ctx, message.ID, attachmentMediaIDs); err != nil {
			return nil, nil, fmt.Errorf("order service: не удалось добавить вложения: %w", err)
		}
		// Загружаем вложения для ответа
		attachments, err := s.repoMessages.GetMessageAttachments(ctx, message.ID)
		if err == nil {
			message.Attachments = attachments
		}
	}

	return message, conversation, nil
}

// UpdateMessage обновляет содержимое сообщения.
func (s *OrderService) UpdateMessage(ctx context.Context, messageID uuid.UUID, authorID uuid.UUID, newContent string) (*models.Message, error) {
	// Валидация входных данных
	if newContent == "" {
		return nil, fmt.Errorf("order service: текст сообщения не может быть пустым")
	}
	if len(newContent) > 5000 {
		return nil, fmt.Errorf("order service: сообщение слишком длинное (максимум 5000 символов)")
	}

	message, err := s.repoMessages.GetMessageByID(ctx, messageID)
	if err != nil {
		return nil, err
	}

	// Проверка прав: только автор может редактировать
	if message.AuthorID == nil || *message.AuthorID != authorID {
		return nil, fmt.Errorf("order service: у вас нет прав на редактирование этого сообщения")
	}

	// Проверка, что сообщение не удалено
	if message.Content == "[Сообщение удалено]" {
		return nil, fmt.Errorf("order service: нельзя редактировать удалённое сообщение")
	}

	if err := s.repoMessages.UpdateMessage(ctx, messageID, newContent); err != nil {
		return nil, err
	}

	// Получаем обновлённое сообщение
	updatedMessage, err := s.repoMessages.GetMessageByID(ctx, messageID)
	if err != nil {
		return nil, err
	}

	return updatedMessage, nil
}

// DeleteMessage удаляет сообщение.
func (s *OrderService) DeleteMessage(ctx context.Context, messageID uuid.UUID, authorID uuid.UUID) error {
	message, err := s.repoMessages.GetMessageByID(ctx, messageID)
	if err != nil {
		return err
	}

	// Проверка прав: только автор может удалять
	if message.AuthorID == nil || *message.AuthorID != authorID {
		return fmt.Errorf("order service: у вас нет прав на удаление этого сообщения")
	}

	// Проверка, что сообщение ещё не удалено
	if message.Content == "[Сообщение удалено]" {
		return fmt.Errorf("order service: сообщение уже удалено")
	}

	return s.repoMessages.DeleteMessage(ctx, messageID)
}

// AddMessageReaction добавляет реакцию на сообщение.
func (s *OrderService) AddMessageReaction(ctx context.Context, messageID, userID uuid.UUID, emoji string) (*models.MessageReaction, error) {
	// Валидация emoji (базовая проверка)
	if emoji == "" || len(emoji) > 10 {
		return nil, fmt.Errorf("order service: некорректная реакция")
	}

	// Проверяем, что сообщение существует
	message, err := s.repoMessages.GetMessageByID(ctx, messageID)
	if err != nil {
		return nil, fmt.Errorf("order service: сообщение не найдено")
	}

	// Проверяем доступ к чату
	conversation, err := s.repoConversations.GetConversationByID(ctx, message.ConversationID)
	if err != nil {
		return nil, fmt.Errorf("order service: чат не найден")
	}

	if conversation.ClientID != userID && conversation.FreelancerID != userID {
		return nil, fmt.Errorf("order service: у вас нет доступа к этому чату")
	}

	return s.repoMessages.AddMessageReaction(ctx, messageID, userID, emoji)
}

// RemoveMessageReaction удаляет реакцию пользователя на сообщение.
func (s *OrderService) RemoveMessageReaction(ctx context.Context, messageID, userID uuid.UUID) error {
	// Проверяем, что сообщение существует
	message, err := s.repoMessages.GetMessageByID(ctx, messageID)
	if err != nil {
		return fmt.Errorf("order service: сообщение не найдено")
	}

	// Проверяем доступ к чату
	conversation, err := s.repoConversations.GetConversationByID(ctx, message.ConversationID)
	if err != nil {
		return fmt.Errorf("order service: чат не найден")
	}

	if conversation.ClientID != userID && conversation.FreelancerID != userID {
		return fmt.Errorf("order service: у вас нет доступа к этому чату")
	}

	return s.repoMessages.RemoveMessageReaction(ctx, messageID, userID)
}
