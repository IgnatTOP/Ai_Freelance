package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/lib/pq"

	"github.com/ignatzorin/freelance-backend/internal/models"
)

func (r *OrderRepository) AddMessageAttachments(ctx context.Context, messageID uuid.UUID, mediaIDs []uuid.UUID) error {
	if len(mediaIDs) == 0 {
		return nil
	}

	query := `INSERT INTO message_attachments (message_id, media_id) VALUES `
	values := make([]interface{}, 0, len(mediaIDs)*2)
	argIndex := 1

	for i, mediaID := range mediaIDs {
		if i > 0 {
			query += ", "
		}
		query += fmt.Sprintf("($%d, $%d)", argIndex, argIndex+1)
		values = append(values, messageID, mediaID)
		argIndex += 2
	}
	query += " ON CONFLICT DO NOTHING"

	_, err := r.db.ExecContext(ctx, query, values...)
	if err != nil {
		return fmt.Errorf("order repository: add message attachments %w", err)
	}
	return nil
}

// GetMessageAttachments возвращает вложения сообщения.
func (r *OrderRepository) GetMessageAttachments(ctx context.Context, messageID uuid.UUID) ([]models.MessageAttachment, error) {
	query := `
		SELECT
			ma.id,
			ma.message_id,
			ma.media_id,
			ma.created_at,
			mf.id,
			mf.user_id,
			mf.file_path,
			mf.file_type,
			mf.file_size,
			mf.is_public,
			mf.created_at
		FROM message_attachments ma
		JOIN media_files mf ON mf.id = ma.media_id
		WHERE ma.message_id = $1
		ORDER BY ma.created_at
	`

	rows, err := r.db.QueryxContext(ctx, query, messageID)
	if err != nil {
		return nil, fmt.Errorf("order repository: get message attachments %w", err)
	}
	defer rows.Close()

	var attachments []models.MessageAttachment
	for rows.Next() {
		var attachment models.MessageAttachment
		var media models.MediaFile
		var mediaUserID *uuid.UUID

		if err := rows.Scan(
			&attachment.ID,
			&attachment.MessageID,
			&attachment.MediaID,
			&attachment.CreatedAt,
			&media.ID,
			&mediaUserID,
			&media.FilePath,
			&media.FileType,
			&media.FileSize,
			&media.IsPublic,
			&media.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("order repository: scan message attachment %w", err)
		}

		media.UserID = mediaUserID
		attachment.Media = &media
		attachments = append(attachments, attachment)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("order repository: message attachments rows %w", err)
	}

	return attachments, nil
}

// GetMessageAttachmentsByMessageIDs возвращает вложения для нескольких сообщений.
func (r *OrderRepository) GetMessageAttachmentsByMessageIDs(ctx context.Context, messageIDs []uuid.UUID) ([]models.MessageAttachment, error) {
	if len(messageIDs) == 0 {
		return []models.MessageAttachment{}, nil
	}

	query := `
		SELECT
			ma.id,
			ma.message_id,
			ma.media_id,
			ma.created_at,
			mf.id,
			mf.user_id,
			mf.file_path,
			mf.file_type,
			mf.file_size,
			mf.is_public,
			mf.created_at
		FROM message_attachments ma
		JOIN media_files mf ON mf.id = ma.media_id
		WHERE ma.message_id = ANY($1)
		ORDER BY ma.message_id, ma.created_at
	`

	rows, err := r.db.QueryxContext(ctx, query, pq.Array(messageIDs))
	if err != nil {
		return nil, fmt.Errorf("order repository: get message attachments by ids %w", err)
	}
	defer rows.Close()

	var attachments []models.MessageAttachment
	for rows.Next() {
		var attachment models.MessageAttachment
		var media models.MediaFile
		var mediaUserID *uuid.UUID

		if err := rows.Scan(
			&attachment.ID,
			&attachment.MessageID,
			&attachment.MediaID,
			&attachment.CreatedAt,
			&media.ID,
			&mediaUserID,
			&media.FilePath,
			&media.FileType,
			&media.FileSize,
			&media.IsPublic,
			&media.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("order repository: scan message attachment %w", err)
		}

		media.UserID = mediaUserID
		attachment.Media = &media
		attachments = append(attachments, attachment)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("order repository: message attachments rows %w", err)
	}

	return attachments, nil
}

// AddMessageReaction добавляет реакцию на сообщение.
func (r *OrderRepository) AddMessageReaction(ctx context.Context, messageID, userID uuid.UUID, emoji string) (*models.MessageReaction, error) {
	query := `
		INSERT INTO message_reactions (message_id, user_id, emoji)
		VALUES ($1, $2, $3)
		ON CONFLICT (message_id, user_id) 
		DO UPDATE SET emoji = EXCLUDED.emoji, created_at = NOW()
		RETURNING id, message_id, user_id, emoji, created_at
	`

	var reaction models.MessageReaction
	if err := r.db.QueryRowxContext(ctx, query, messageID, userID, emoji).StructScan(&reaction); err != nil {
		return nil, fmt.Errorf("order repository: add message reaction %w", err)
	}

	return &reaction, nil
}

// RemoveMessageReaction удаляет реакцию пользователя на сообщение.
func (r *OrderRepository) RemoveMessageReaction(ctx context.Context, messageID, userID uuid.UUID) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2`, messageID, userID)
	if err != nil {
		return fmt.Errorf("order repository: remove message reaction %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("order repository: remove message reaction rows affected %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("order repository: reaction not found")
	}

	return nil
}

// GetMessageReactions возвращает реакции на сообщение.
func (r *OrderRepository) GetMessageReactions(ctx context.Context, messageID uuid.UUID) ([]models.MessageReaction, error) {
	query := `
		SELECT * FROM message_reactions
		WHERE message_id = $1
		ORDER BY created_at
	`

	var reactions []models.MessageReaction
	if err := r.db.SelectContext(ctx, &reactions, query, messageID); err != nil {
		return nil, fmt.Errorf("order repository: get message reactions %w", err)
	}

	return reactions, nil
}

// GetMessageReactionsByMessageIDs возвращает реакции для нескольких сообщений.
func (r *OrderRepository) GetMessageReactionsByMessageIDs(ctx context.Context, messageIDs []uuid.UUID) ([]models.MessageReaction, error) {
	if len(messageIDs) == 0 {
		return []models.MessageReaction{}, nil
	}

	query := `
		SELECT * FROM message_reactions
		WHERE message_id = ANY($1)
		ORDER BY message_id, created_at
	`

	var reactions []models.MessageReaction
	if err := r.db.SelectContext(ctx, &reactions, query, pq.Array(messageIDs)); err != nil {
		return nil, fmt.Errorf("order repository: get message reactions by ids %w", err)
	}

	return reactions, nil
}

// SetOrderFreelancer устанавливает фрилансера и итоговую сумму для заказа.
func (r *OrderRepository) SetOrderFreelancer(ctx context.Context, orderID, freelancerID uuid.UUID, finalAmount float64) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE orders SET freelancer_id = $2, final_amount = $3, updated_at = NOW() WHERE id = $1
	`, orderID, freelancerID, finalAmount)
	return err
}

// CountUnreadMessages возвращает количество непрочитанных сообщений в чате для пользователя.
func (r *OrderRepository) CountUnreadMessages(ctx context.Context, conversationID, userID uuid.UUID) (int, error) {
	var count int
	query := `
		SELECT COUNT(m.id)
		FROM messages m
		WHERE m.conversation_id = $1
		  AND m.author_id IS DISTINCT FROM $2
		  AND NOT EXISTS (
		    SELECT 1 FROM message_reads mr
		    WHERE mr.message_id = m.id AND mr.user_id = $2
		  )
	`
	if err := r.db.GetContext(ctx, &count, query, conversationID, userID); err != nil {
		return 0, fmt.Errorf("order repository: count unread messages %w", err)
	}
	return count, nil
}

// UpsertMessageRead сохраняет отметку о прочтении сообщения.
func (r *OrderRepository) UpsertMessageRead(ctx context.Context, userID, conversationID, messageID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO message_reads (conversation_id, message_id, user_id)
		VALUES ($1, $2, $3)
		ON CONFLICT (message_id, user_id) DO UPDATE SET read_at = NOW()
	`, conversationID, messageID, userID)
	if err != nil {
		return fmt.Errorf("order repository: upsert message read %w", err)
	}
	return nil
}
