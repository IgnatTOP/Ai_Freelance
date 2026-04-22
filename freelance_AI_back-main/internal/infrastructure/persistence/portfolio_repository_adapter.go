package persistence

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/pkg/apperror"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

// PortfolioRepositoryAdapter implements PortfolioRepository interface.
type PortfolioRepositoryAdapter struct {
	db *sqlx.DB
}

// NewPortfolioRepositoryAdapter creates a new portfolio repository adapter.
func NewPortfolioRepositoryAdapter(db *sqlx.DB) *PortfolioRepositoryAdapter {
	return &PortfolioRepositoryAdapter{db: db}
}

// Create creates a new portfolio item.
func (r *PortfolioRepositoryAdapter) Create(ctx context.Context, item *entity.PortfolioItem) error {
	tx, err := r.db.BeginTxx(ctx, &sql.TxOptions{})
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to begin transaction")
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	query := `
		INSERT INTO portfolio_items (id, user_id, title, description, cover_media_id, ai_tags, external_link, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err = tx.ExecContext(ctx, query,
		item.ID,
		item.UserID,
		item.Title,
		item.Description,
		item.CoverMediaID,
		pq.Array(item.AITags),
		item.ExternalLink,
		item.CreatedAt,
	)
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to create portfolio item")
	}

	if len(item.MediaIDs) > 0 {
		mediaQuery := `INSERT INTO portfolio_media (portfolio_id, media_id, position) VALUES `
		mediaValues := make([]interface{}, 0, len(item.MediaIDs)*3)

		for i, mediaID := range item.MediaIDs {
			if i > 0 {
				mediaQuery += ", "
			}
			mediaQuery += fmt.Sprintf("($%d, $%d, $%d)", i*3+1, i*3+2, i*3+3)
			mediaValues = append(mediaValues, item.ID, mediaID, i)
		}
		mediaQuery += " ON CONFLICT DO NOTHING"

		if _, err = tx.ExecContext(ctx, mediaQuery, mediaValues...); err != nil {
			return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to insert portfolio media")
		}
	}

	if err = tx.Commit(); err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to commit transaction")
	}

	return nil
}

// Update updates a portfolio item.
func (r *PortfolioRepositoryAdapter) Update(ctx context.Context, item *entity.PortfolioItem) error {
	tx, err := r.db.BeginTxx(ctx, &sql.TxOptions{})
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to begin transaction")
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	query := `
		UPDATE portfolio_items
		SET title = $1, description = $2, cover_media_id = $3, ai_tags = $4, external_link = $5
		WHERE id = $6
	`
	res, err := tx.ExecContext(ctx, query,
		item.Title,
		item.Description,
		item.CoverMediaID,
		pq.Array(item.AITags),
		item.ExternalLink,
		item.ID,
	)
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to update portfolio item")
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return apperror.Wrap(sql.ErrNoRows, apperror.ErrCodeNotFound, "portfolio item not found")
	}

	// Update Media
	if _, err = tx.ExecContext(ctx, `DELETE FROM portfolio_media WHERE portfolio_id = $1`, item.ID); err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to clear old media")
	}

	if len(item.MediaIDs) > 0 {
		mediaQuery := `INSERT INTO portfolio_media (portfolio_id, media_id, position) VALUES `
		mediaValues := make([]interface{}, 0, len(item.MediaIDs)*3)

		for i, mediaID := range item.MediaIDs {
			if i > 0 {
				mediaQuery += ", "
			}
			mediaQuery += fmt.Sprintf("($%d, $%d, $%d)", i*3+1, i*3+2, i*3+3)
			mediaValues = append(mediaValues, item.ID, mediaID, i)
		}
		mediaQuery += " ON CONFLICT DO NOTHING"

		if _, err = tx.ExecContext(ctx, mediaQuery, mediaValues...); err != nil {
			return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to insert new portfolio media")
		}
	}

	if err = tx.Commit(); err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to commit transaction")
	}
	return nil
}

// Delete deletes a portfolio item.
func (r *PortfolioRepositoryAdapter) Delete(ctx context.Context, id uuid.UUID) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM portfolio_items WHERE id = $1`, id)
	if err != nil {
		return apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to delete portfolio item")
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return apperror.Wrap(sql.ErrNoRows, apperror.ErrCodeNotFound, "portfolio item not found")
	}
	return nil
}

// GetByID retrieves a portfolio item by ID.
func (r *PortfolioRepositoryAdapter) GetByID(ctx context.Context, id uuid.UUID) (*entity.PortfolioItem, error) {
	var item entity.PortfolioItem
	var aiTags pq.StringArray

	query := `
		SELECT id, user_id, title, description, cover_media_id, ai_tags, external_link, created_at
		FROM portfolio_items
		WHERE id = $1
	`
	if err := r.db.QueryRowxContext(ctx, query, id).Scan(
		&item.ID, &item.UserID, &item.Title, &item.Description, &item.CoverMediaID, &aiTags, &item.ExternalLink, &item.CreatedAt,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, apperror.Wrap(err, apperror.ErrCodeNotFound, "portfolio item not found")
		}
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to get portfolio item")
	}
	item.AITags = []string(aiTags)

	// Get Media IDs
	mediaQuery := `SELECT media_id FROM portfolio_media WHERE portfolio_id = $1 ORDER BY position`
	var mediaIDs []uuid.UUID
	if err := r.db.SelectContext(ctx, &mediaIDs, mediaQuery, id); err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to get media ids")
	}
	item.MediaIDs = mediaIDs

	return &item, nil
}

// ListByUserID retrieves portfolio items for a user.
func (r *PortfolioRepositoryAdapter) ListByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]entity.PortfolioItem, error) {
	var items []entity.PortfolioItem
	query := `
		SELECT id, user_id, title, description, cover_media_id, ai_tags, external_link, created_at
		FROM portfolio_items
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.QueryxContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to list portfolio items")
	}
	defer rows.Close()

	for rows.Next() {
		var item entity.PortfolioItem
		var aiTags pq.StringArray
		if err := rows.Scan(
			&item.ID, &item.UserID, &item.Title, &item.Description, &item.CoverMediaID, &aiTags, &item.ExternalLink, &item.CreatedAt,
		); err != nil {
			return nil, apperror.Wrap(err, apperror.ErrCodeDatabaseError, "failed to scan portfolio item")
		}
		item.AITags = []string(aiTags)
		items = append(items, item)
	}

	// Fetch media IDs for each item? Or just lazy load?
	// For list, maybe we don't need all media IDs or maybe just cover?
	// The entity has MediaIDs. Let's populate it. N+1 query but simple for now.
	// Or use IN clause.

	for i := range items {
		mediaQuery := `SELECT media_id FROM portfolio_media WHERE portfolio_id = $1 ORDER BY position`
		var mediaIDs []uuid.UUID
		_ = r.db.SelectContext(ctx, &mediaIDs, mediaQuery, items[i].ID)
		items[i].MediaIDs = mediaIDs
	}

	return items, nil
}
