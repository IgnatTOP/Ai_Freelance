package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/ignatzorin/freelance-backend/internal/models"
)

func (r *OrderRepository) CreateProposal(ctx context.Context, proposal *models.Proposal) error {
	query := `
		INSERT INTO proposals (order_id, freelancer_id, cover_letter, proposed_amount, proposed_budget, estimated_days, status, ai_feedback)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at
	`

	return r.db.QueryRowxContext(
		ctx,
		query,
		proposal.OrderID,
		proposal.FreelancerID,
		proposal.CoverLetter,
		proposal.ProposedAmount,
		proposal.ProposedBudget,
		proposal.EstimatedDays,
		proposal.Status,
		proposal.AIFeedback,
	).Scan(&proposal.ID, &proposal.CreatedAt, &proposal.UpdatedAt)
}

// GetProposalByID возвращает отклик по идентификатору.
func (r *OrderRepository) GetProposalByID(ctx context.Context, id uuid.UUID) (*models.Proposal, error) {
	var proposal models.Proposal
	query := `
		SELECT id, order_id, freelancer_id, cover_letter,
		       COALESCE(proposed_budget, proposed_amount) AS proposed_amount,
		       COALESCE(proposed_budget, proposed_amount) AS proposed_budget, estimated_days,
		       status, ai_feedback, ai_analysis_for_client, ai_analysis_for_client_at,
		       created_at, updated_at
		FROM proposals
		WHERE id = $1
	`
	if err := r.db.GetContext(ctx, &proposal, query, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrProposalNotFound
		}
		return nil, fmt.Errorf("order repository: get proposal %w", err)
	}
	return &proposal, nil
}

// UpdateProposalStatus меняет статус отклика.
func (r *OrderRepository) UpdateProposalStatus(ctx context.Context, id uuid.UUID, status string) (*models.Proposal, error) {
	query := `
		UPDATE proposals
		SET status = $2,
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, order_id, freelancer_id, cover_letter,
		          COALESCE(proposed_budget, proposed_amount) AS proposed_amount,
		          COALESCE(proposed_budget, proposed_amount) AS proposed_budget, estimated_days,
		          status, ai_feedback, ai_analysis_for_client, ai_analysis_for_client_at,
		          created_at, updated_at
	`

	var proposal models.Proposal
	if err := r.db.QueryRowxContext(ctx, query, id, status).StructScan(&proposal); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrProposalNotFound
		}
		return nil, fmt.Errorf("order repository: update proposal status %w", err)
	}
	return &proposal, nil
}

// ListProposals возвращает отклики по заказу.
func (r *OrderRepository) ListProposals(ctx context.Context, orderID uuid.UUID) ([]models.Proposal, error) {
	query := `
		SELECT id, order_id, freelancer_id, cover_letter,
		       COALESCE(proposed_budget, proposed_amount) AS proposed_amount,
		       COALESCE(proposed_budget, proposed_amount) AS proposed_budget, estimated_days,
		       status, ai_feedback, ai_analysis_for_client, ai_analysis_for_client_at,
		       created_at, updated_at
		FROM proposals
		WHERE order_id = $1
		ORDER BY created_at DESC
	`

	var proposals []models.Proposal
	if err := r.db.SelectContext(ctx, &proposals, query, orderID); err != nil {
		return nil, fmt.Errorf("order repository: list proposals %w", err)
	}

	return proposals, nil
}

// CreateConversation создаёт чат для заказа.
func (r *OrderRepository) CreateConversation(ctx context.Context, conv *models.Conversation) error {
	query := `
		INSERT INTO conversations (order_id, client_id, freelancer_id)
		VALUES ($1, $2, $3)
		RETURNING id, created_at
	`

	return r.db.QueryRowxContext(
		ctx,
		query,
		conv.OrderID,
		conv.ClientID,
		conv.FreelancerID,
	).Scan(&conv.ID, &conv.CreatedAt)
}

// GetConversationByParticipants возвращает чат между клиентом и исполнителем.
func (r *OrderRepository) GetConversationByParticipants(ctx context.Context, orderID uuid.UUID, clientID, freelancerID uuid.UUID) (*models.Conversation, error) {
	var conv models.Conversation
	err := r.db.GetContext(
		ctx,
		&conv,
		`SELECT * FROM conversations WHERE order_id = $1 AND client_id = $2 AND freelancer_id = $3`,
		orderID,
		clientID,
		freelancerID,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrConversationNotFound
		}
		return nil, fmt.Errorf("order repository: get conversation %w", err)
	}
	return &conv, nil
}

// GetConversationByID возвращает чат по ID.
func (r *OrderRepository) GetConversationByID(ctx context.Context, id uuid.UUID) (*models.Conversation, error) {
	var conv models.Conversation
	if err := r.db.GetContext(ctx, &conv, `SELECT * FROM conversations WHERE id = $1`, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrConversationNotFound
		}
		return nil, fmt.Errorf("order repository: get conversation by id %w", err)
	}
	return &conv, nil
}

// ListMyConversations возвращает все чаты пользователя (как клиента и как исполнителя).
// Возвращает только чаты, где есть accepted proposal (т.е. активные чаты).
func (r *OrderRepository) ListMyConversations(ctx context.Context, userID uuid.UUID) ([]models.Conversation, error) {
	query := `
		SELECT DISTINCT c.*
		FROM conversations c
		INNER JOIN proposals p ON c.order_id = p.order_id 
			AND c.freelancer_id = p.freelancer_id
			AND p.status = 'accepted'
		WHERE (c.client_id = $1 OR c.freelancer_id = $1)
		ORDER BY c.created_at DESC
	`
	var conversations []models.Conversation
	if err := r.db.SelectContext(ctx, &conversations, query, userID); err != nil {
		return nil, fmt.Errorf("order repository: list my conversations %w", err)
	}
	return conversations, nil
}

// GetLastMessageForConversation возвращает последнее сообщение в чате.
func (r *OrderRepository) GetLastMessageForConversation(ctx context.Context, conversationID uuid.UUID) (*models.Message, error) {
	var message models.Message
	query := `
		SELECT * FROM messages
		WHERE conversation_id = $1
		ORDER BY created_at DESC
		LIMIT 1
	`
	if err := r.db.GetContext(ctx, &message, query, conversationID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil // Нет сообщений - это нормально
		}
		return nil, fmt.Errorf("order repository: get last message %w", err)
	}
	return &message, nil
}

// AddMessage добавляет сообщение в чат.
func (r *OrderRepository) AddMessage(ctx context.Context, msg *models.Message) error {
	query := `
		INSERT INTO messages (conversation_id, author_type, author_id, content, parent_message_id, ai_metadata)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`

	var metadata interface{}
	if len(msg.AIMetadata) == 0 {
		metadata = nil
	} else {
		metadata = string(msg.AIMetadata)
	}

	var updatedAt time.Time
	err := r.db.QueryRowxContext(
		ctx,
		query,
		msg.ConversationID,
		msg.AuthorType,
		msg.AuthorID,
		msg.Content,
		msg.ParentMessageID,
		metadata,
	).Scan(&msg.ID, &msg.CreatedAt, &updatedAt)
	if err != nil {
		return err
	}
	msg.UpdatedAt = &updatedAt
	return nil
}

// ListMessages возвращает сообщения чата с пагинацией.
// Сообщения возвращаются в хронологическом порядке (старые первыми).
func (r *OrderRepository) ListMessages(ctx context.Context, conversationID uuid.UUID, limit, offset int) ([]models.Message, error) {
	query := `
		SELECT * FROM messages
		WHERE conversation_id = $1
		ORDER BY created_at ASC
	`
	args := []interface{}{conversationID}
	argIndex := 2

	if limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, limit)
		argIndex++
	}

	if offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", argIndex)
		args = append(args, offset)
	}

	var messages []models.Message
	if err := r.db.SelectContext(ctx, &messages, query, args...); err != nil {
		return nil, fmt.Errorf("order repository: list messages %w", err)
	}

	// Загружаем вложения и реакции для всех сообщений
	if len(messages) > 0 {
		messageIDs := make([]uuid.UUID, len(messages))
		for i := range messages {
			messageIDs[i] = messages[i].ID
		}

		// Загружаем вложения
		attachments, err := r.GetMessageAttachmentsByMessageIDs(ctx, messageIDs)
		if err == nil {
			attachmentsMap := make(map[uuid.UUID][]models.MessageAttachment)
			for _, att := range attachments {
				attachmentsMap[att.MessageID] = append(attachmentsMap[att.MessageID], att)
			}
			for i := range messages {
				messages[i].Attachments = attachmentsMap[messages[i].ID]
			}
		}

		// Загружаем реакции
		reactions, err := r.GetMessageReactionsByMessageIDs(ctx, messageIDs)
		if err == nil {
			reactionsMap := make(map[uuid.UUID][]models.MessageReaction)
			for _, react := range reactions {
				reactionsMap[react.MessageID] = append(reactionsMap[react.MessageID], react)
			}
			for i := range messages {
				messages[i].Reactions = reactionsMap[messages[i].ID]
			}
		}
	}

	return messages, nil
}

// GetMessageByID возвращает сообщение по идентификатору.
func (r *OrderRepository) GetMessageByID(ctx context.Context, messageID uuid.UUID) (*models.Message, error) {
	var message models.Message
	if err := r.db.GetContext(ctx, &message, `SELECT * FROM messages WHERE id = $1`, messageID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("order repository: message not found")
		}
		return nil, fmt.Errorf("order repository: get message by id %w", err)
	}

	// Загружаем вложения
	attachments, err := r.GetMessageAttachments(ctx, messageID)
	if err == nil {
		message.Attachments = attachments
	}

	// Загружаем реакции
	reactions, err := r.GetMessageReactions(ctx, messageID)
	if err == nil {
		message.Reactions = reactions
	}

	return &message, nil
}

// UpdateMessage обновляет содержимое сообщения.
func (r *OrderRepository) UpdateMessage(ctx context.Context, messageID uuid.UUID, newContent string) error {
	result, err := r.db.ExecContext(ctx, `UPDATE messages SET content = $1, updated_at = NOW() WHERE id = $2`, newContent, messageID)
	if err != nil {
		return fmt.Errorf("order repository: update message %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("order repository: update message rows affected %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("order repository: message not found")
	}

	return nil
}

// DeleteMessage мягко удаляет сообщение (устанавливает content в "[Сообщение удалено]").
func (r *OrderRepository) DeleteMessage(ctx context.Context, messageID uuid.UUID) error {
	result, err := r.db.ExecContext(ctx, `UPDATE messages SET content = '[Сообщение удалено]' WHERE id = $1`, messageID)
	if err != nil {
		return fmt.Errorf("order repository: delete message %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("order repository: delete message rows affected %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("order repository: message not found")
	}

	return nil
}

// ListAttachments возвращает вложения заказа.
