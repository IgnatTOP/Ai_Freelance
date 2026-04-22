package handler

import (
	"log"
	"strings"

	"github.com/gin-gonic/gin"
	httpresp "github.com/ignatzorin/freelance-backend/internal/interface/http/response"
	"github.com/jmoiron/sqlx"
)

type SearchHandler struct {
	db *sqlx.DB
}

func NewSearchHandler(db *sqlx.DB) *SearchHandler {
	return &SearchHandler{db: db}
}

type OrderSearchResult struct {
	ID          string  `db:"id" json:"id"`
	Title       string  `db:"title" json:"title"`
	Description string  `db:"description" json:"description"`
	Status      string  `db:"status" json:"status"`
	BudgetMin   float64 `db:"budget_min" json:"budget_min"`
	BudgetMax   float64 `db:"budget_max" json:"budget_max"`
}

type UserSearchResult struct {
	ID       string `db:"id" json:"id"`
	Name     string `db:"name" json:"name"`
	Username string `db:"username" json:"username"`
	Role     string `db:"role" json:"role"`
}

type ChatSearchResult struct {
	ID        string `db:"id" json:"id"`
	Title     string `db:"title" json:"title"`
	OrderName string `db:"order_name" json:"order_name"`
}

func (h *SearchHandler) GlobalSearch(c *gin.Context) {
	query := strings.TrimSpace(c.Query("q"))
	if query == "" {
		httpresp.Success(c, gin.H{
			"query": query,
			"groups": gin.H{
				"orders": []interface{}{},
				"users":  []interface{}{},
				"chats":  []interface{}{},
			},
		})
		return
	}

	searchToken := "%" + query + "%"

	// Orders search
	var orders []OrderSearchResult
	err := h.db.Select(&orders, `
		SELECT id, title, description, status, budget_min, budget_max
		FROM orders
		WHERE title ILIKE $1 OR description ILIKE $1
		LIMIT 5
	`, searchToken)
	if err != nil {
		log.Printf("global search orders query failed: %v", err)
		orders = []OrderSearchResult{}
	}

	// Users search
	var users []UserSearchResult
	err = h.db.Select(&users, `
		SELECT id, name, username, role 
		FROM users
		WHERE name ILIKE $1 OR username ILIKE $1
		LIMIT 5
	`, searchToken)
	if err != nil {
		log.Printf("global search users query failed: %v", err)
		users = []UserSearchResult{}
	}

	// Chats search
	// Usually conversations are linked to orders. We search conversations by order title or participant name natively later.
	// We'll leave it empty unless we know the exact schema of conversations.
	var chats = []ChatSearchResult{}

	httpresp.Success(c, gin.H{
		"query": query,
		"groups": gin.H{
			"orders": orders,
			"users":  users,
			"chats":  chats,
		},
	})
}
