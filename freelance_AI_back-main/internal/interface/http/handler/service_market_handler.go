package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	httpresp "github.com/ignatzorin/freelance-backend/internal/interface/http/response"
	"github.com/jmoiron/sqlx"
)

type ServiceItem struct {
	ID          uuid.UUID `db:"id" json:"id"`
	OwnerID     uuid.UUID `db:"owner_id" json:"owner_id"`
	Title       string    `db:"title" json:"title"`
	Description string    `db:"description" json:"description"`
	Price       float64   `db:"price" json:"price"`
	TermDays    int       `db:"term_days" json:"term_days"`
	CreatedAt   string    `db:"created_at" json:"created_at"`
	UpdatedAt   string    `db:"updated_at" json:"updated_at"`
}

type ServicePurchase struct {
	ID        uuid.UUID `db:"id" json:"id"`
	ServiceID uuid.UUID `db:"service_id" json:"service_id"`
	BuyerID   uuid.UUID `db:"buyer_id" json:"buyer_id"`
	CreatedAt string    `db:"created_at" json:"created_at"`
}

type ServiceMarketHandler struct {
	db *sqlx.DB
}

func NewServiceMarketHandler(db *sqlx.DB) *ServiceMarketHandler {
	return &ServiceMarketHandler{db: db}
}

func (h *ServiceMarketHandler) ListServices(c *gin.Context) {
	var result []ServiceItem
	if err := h.db.Select(&result, `SELECT id, owner_id, title, description, price, term_days, created_at, updated_at FROM freelancer_services ORDER BY created_at DESC LIMIT 100`); err != nil {
		httpresp.Error(c, err)
		return
	}
	httpresp.Success(c, result)
}

func (h *ServiceMarketHandler) CreateService(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}
	var req struct {
		Title       string  `json:"title" binding:"required"`
		Description string  `json:"description" binding:"required"`
		Price       float64 `json:"price" binding:"required"`
		TermDays    int     `json:"term_days" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		httpresp.BadRequest(c, err.Error())
		return
	}
	var item ServiceItem
	if err := h.db.Get(&item,
		`INSERT INTO freelancer_services (owner_id, title, description, price, term_days)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, owner_id, title, description, price, term_days, created_at, updated_at`,
		userID, req.Title, req.Description, req.Price, req.TermDays,
	); err != nil {
		httpresp.Error(c, err)
		return
	}
	httpresp.Created(c, item)
}

func (h *ServiceMarketHandler) UpdateService(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}
	serviceID, ok := parseUUIDParam(c, "id", "invalid service id")
	if !ok {
		return
	}
	var req struct {
		Title       string  `json:"title" binding:"required"`
		Description string  `json:"description" binding:"required"`
		Price       float64 `json:"price" binding:"required"`
		TermDays    int     `json:"term_days" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		httpresp.BadRequest(c, err.Error())
		return
	}
	var item ServiceItem
	if err := h.db.Get(&item,
		`UPDATE freelancer_services
		 SET title = $3, description = $4, price = $5, term_days = $6, updated_at = NOW()
		 WHERE id = $1 AND owner_id = $2
		 RETURNING id, owner_id, title, description, price, term_days, created_at, updated_at`,
		serviceID, userID, req.Title, req.Description, req.Price, req.TermDays,
	); err != nil {
		httpresp.Error(c, err)
		return
	}
	httpresp.Success(c, item)
}

func (h *ServiceMarketHandler) DeleteService(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}
	serviceID, ok := parseUUIDParam(c, "id", "invalid service id")
	if !ok {
		return
	}
	result, err := h.db.Exec(`DELETE FROM freelancer_services WHERE id = $1 AND owner_id = $2`, serviceID, userID)
	if err != nil {
		httpresp.Error(c, err)
		return
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		httpresp.NotFound(c, "service not found")
		return
	}
	httpresp.Success(c, gin.H{"deleted": true})
}

func (h *ServiceMarketHandler) CreatePurchase(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}
	var req struct {
		ServiceID string `json:"service_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		httpresp.BadRequest(c, err.Error())
		return
	}
	serviceID, err := uuid.Parse(req.ServiceID)
	if err != nil {
		httpresp.BadRequest(c, "invalid service_id")
		return
	}
	var purchase ServicePurchase
	if err := h.db.Get(&purchase,
		`INSERT INTO service_purchases (service_id, buyer_id)
		 VALUES ($1, $2)
		 RETURNING id, service_id, buyer_id, created_at`,
		serviceID, userID,
	); err != nil {
		httpresp.Error(c, err)
		return
	}
	httpresp.Created(c, purchase)
}

func (h *ServiceMarketHandler) ListPurchases(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}
	var purchases []ServicePurchase
	if err := h.db.Select(&purchases, `SELECT id, service_id, buyer_id, created_at FROM service_purchases WHERE buyer_id = $1 ORDER BY created_at DESC`, userID); err != nil {
		httpresp.Error(c, err)
		return
	}
	httpresp.Success(c, purchases)
}
