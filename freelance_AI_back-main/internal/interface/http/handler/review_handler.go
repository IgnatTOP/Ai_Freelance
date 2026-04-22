package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	httpresp "github.com/ignatzorin/freelance-backend/internal/interface/http/response"
	"github.com/ignatzorin/freelance-backend/internal/usecase/review"
)

// ReviewHandler handles review related requests.
type ReviewHandler struct {
	createReviewUC     *review.CreateReviewUseCase
	listReviewsUC      *review.ListReviewsUseCase
	listOrderReviewsUC *review.ListOrderReviewsUseCase
	canLeaveReviewUC   *review.CanLeaveReviewUseCase
}

// NewReviewHandler creates a new ReviewHandler.
func NewReviewHandler(
	createReviewUC *review.CreateReviewUseCase,
	listReviewsUC *review.ListReviewsUseCase,
	listOrderReviewsUC *review.ListOrderReviewsUseCase,
	canLeaveReviewUC *review.CanLeaveReviewUseCase,
) *ReviewHandler {
	return &ReviewHandler{
		createReviewUC:     createReviewUC,
		listReviewsUC:      listReviewsUC,
		listOrderReviewsUC: listOrderReviewsUC,
		canLeaveReviewUC:   canLeaveReviewUC,
	}
}

// CreateReview handles POST /reviews
func (h *ReviewHandler) CreateReview(c *gin.Context) {
	var input struct {
		OrderID    string  `json:"order_id"`
		ReviewerID string  `json:"reviewer_id"` // Usually from auth context
		ReviewedID string  `json:"reviewed_id"`
		Rating     int     `json:"rating"`
		Comment    *string `json:"comment"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		httpresp.BadRequest(c, err.Error())
		return
	}

	// Extract reviewer ID from context usually
	reviewerIDStr := ""
	if reviewerID, err := getUserID(c); err == nil {
		reviewerIDStr = reviewerID.String()
	}
	if reviewerIDStr == "" {
		// If not in context, use input or fail
		if input.ReviewerID == "" {
			httpresp.Unauthorized(c, "unauthorized")
			return
		}
		reviewerIDStr = input.ReviewerID
	}

	orderID, _ := uuid.Parse(input.OrderID)
	reviewerID, _ := uuid.Parse(reviewerIDStr)
	reviewedID, _ := uuid.Parse(input.ReviewedID)

	createInput := review.CreateReviewInput{
		OrderID:    orderID,
		ReviewerID: reviewerID,
		ReviewedID: reviewedID,
		Rating:     input.Rating,
		Comment:    input.Comment,
	}

	review, err := h.createReviewUC.Run(c.Request.Context(), createInput)
	if err != nil {
		httpresp.Error(c, err)
		return
	}

	httpresp.Created(c, review)
}

// ListReviews handles GET /users/:id/reviews
func (h *ReviewHandler) ListReviews(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		httpresp.BadRequest(c, "invalid user id")
		return
	}

	limit := 10
	offset := 0
	if l := c.Query("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil {
			limit = v
		}
	}
	if o := c.Query("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil {
			offset = v
		}
	}

	reviews, avg, count, err := h.listReviewsUC.Run(c.Request.Context(), userID, limit, offset)
	if err != nil {
		httpresp.Error(c, err)
		return
	}

	httpresp.Success(c, gin.H{
		"reviews":        reviews,
		"average_rating": avg,
		"total_count":    count,
	})
}

// ListOrderReviews handles GET /orders/:id/reviews
func (h *ReviewHandler) ListOrderReviews(c *gin.Context) {
	orderIDStr := c.Param("id")
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		httpresp.BadRequest(c, "invalid order id")
		return
	}

	reviews, err := h.listOrderReviewsUC.Run(c.Request.Context(), orderID)
	if err != nil {
		httpresp.Error(c, err)
		return
	}

	httpresp.Success(c, reviews)
}

// CanLeaveReview handles GET /orders/:id/can-review
func (h *ReviewHandler) CanLeaveReview(c *gin.Context) {
	orderIDStr := c.Param("id")
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		httpresp.BadRequest(c, "invalid order id")
		return
	}

	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}

	can, err := h.canLeaveReviewUC.Run(c.Request.Context(), userID, orderID)
	if err != nil {
		httpresp.Error(c, err)
		return
	}

	httpresp.Success(c, gin.H{"can_leave_review": can})
}
