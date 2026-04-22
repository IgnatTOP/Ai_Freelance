package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	httpresp "github.com/ignatzorin/freelance-backend/internal/interface/http/response"
	"github.com/jmoiron/sqlx"
)

type FeedPost struct {
	ID        uuid.UUID `db:"id" json:"id"`
	AuthorID  uuid.UUID `db:"author_id" json:"author_id"`
	Text      string    `db:"text" json:"text"`
	CreatedAt string    `db:"created_at" json:"created_at"`
	UpdatedAt string    `db:"updated_at" json:"updated_at"`
}

type FeedHandler struct {
	db *sqlx.DB
}

func NewFeedHandler(db *sqlx.DB) *FeedHandler {
	return &FeedHandler{db: db}
}

func (h *FeedHandler) List(c *gin.Context) {
	var result []FeedPost
	if err := h.db.Select(&result, `SELECT id, author_id, text, created_at, updated_at FROM feed_posts ORDER BY created_at DESC LIMIT 100`); err != nil {
		httpresp.Error(c, err)
		return
	}
	httpresp.Success(c, result)
}

func (h *FeedHandler) Create(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}
	var req struct {
		Text string `json:"text" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		httpresp.BadRequest(c, err.Error())
		return
	}

	var post FeedPost
	if err := h.db.Get(&post,
		`INSERT INTO feed_posts (author_id, text) VALUES ($1, $2) RETURNING id, author_id, text, created_at, updated_at`,
		userID,
		req.Text,
	); err != nil {
		httpresp.Error(c, err)
		return
	}
	httpresp.Created(c, post)
}

func (h *FeedHandler) Update(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}
	postID, ok := parseUUIDParam(c, "id", "invalid post id")
	if !ok {
		return
	}
	var req struct {
		Text string `json:"text" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		httpresp.BadRequest(c, err.Error())
		return
	}

	var post FeedPost
	if err := h.db.Get(&post,
		`UPDATE feed_posts SET text = $3, updated_at = NOW() WHERE id = $1 AND author_id = $2 RETURNING id, author_id, text, created_at, updated_at`,
		postID,
		userID,
		req.Text,
	); err != nil {
		httpresp.Error(c, err)
		return
	}
	httpresp.Success(c, post)
}

func (h *FeedHandler) Delete(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}
	postID, ok := parseUUIDParam(c, "id", "invalid post id")
	if !ok {
		return
	}
	result, err := h.db.Exec(`DELETE FROM feed_posts WHERE id = $1 AND author_id = $2`, postID, userID)
	if err != nil {
		httpresp.Error(c, err)
		return
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		httpresp.NotFound(c, "post not found")
		return
	}
	httpresp.Success(c, gin.H{"deleted": true})
}
