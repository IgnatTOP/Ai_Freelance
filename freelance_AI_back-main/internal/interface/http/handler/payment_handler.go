package handler

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	httpresp "github.com/ignatzorin/freelance-backend/internal/interface/http/response"
	"github.com/ignatzorin/freelance-backend/internal/usecase/payment"
	"github.com/ignatzorin/freelance-backend/internal/ws"
)

// PaymentHandler handles payment related requests.
type PaymentHandler struct {
	getBalanceUC       *payment.GetBalanceUseCase
	depositUC          *payment.DepositUseCase
	createEscrowUC     *payment.CreateEscrowUseCase
	releaseEscrowUC    *payment.ReleaseEscrowUseCase
	refundEscrowUC     *payment.RefundEscrowUseCase
	getEscrowUC        *payment.GetEscrowByOrderUseCase
	listTransactionsUC *payment.ListTransactionsUseCase
	broadcaster        ws.RealtimeBroadcaster
}

// NewPaymentHandler creates a new PaymentHandler.
func NewPaymentHandler(
	getBalanceUC *payment.GetBalanceUseCase,
	depositUC *payment.DepositUseCase,
	createEscrowUC *payment.CreateEscrowUseCase,
	releaseEscrowUC *payment.ReleaseEscrowUseCase,
	refundEscrowUC *payment.RefundEscrowUseCase,
	getEscrowUC *payment.GetEscrowByOrderUseCase,
	listTransactionsUC *payment.ListTransactionsUseCase,
) *PaymentHandler {
	return &PaymentHandler{
		getBalanceUC:       getBalanceUC,
		depositUC:          depositUC,
		createEscrowUC:     createEscrowUC,
		releaseEscrowUC:    releaseEscrowUC,
		refundEscrowUC:     refundEscrowUC,
		getEscrowUC:        getEscrowUC,
		listTransactionsUC: listTransactionsUC,
	}
}

func (h *PaymentHandler) SetBroadcaster(broadcaster ws.RealtimeBroadcaster) {
	h.broadcaster = broadcaster
}

// GetBalance handles GET /balance
func (h *PaymentHandler) GetBalance(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}

	balance, err := h.getBalanceUC.Run(c.Request.Context(), userID)
	if err != nil {
		httpresp.Error(c, err)
		return
	}

	httpresp.Success(c, balance)
}

// Deposit handles POST /deposit
func (h *PaymentHandler) Deposit(c *gin.Context) {
	var input struct {
		Amount float64 `json:"amount"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		httpresp.BadRequest(c, err.Error())
		return
	}

	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}

	depositInput := payment.DepositInput{
		UserID: userID,
		Amount: input.Amount,
	}

	balance, err := h.depositUC.Run(c.Request.Context(), depositInput)
	if err != nil {
		if strings.Contains(err.Error(), "amount must be positive") {
			httpresp.BadRequest(c, "amount must be positive")
			return
		}
		httpresp.Error(c, err)
		return
	}

	if h.broadcaster != nil {
		_ = h.broadcaster.EmitToUser(userID, "balance.updated", gin.H{
			"available": balance.Available,
			"frozen":    balance.Frozen,
		})
		_ = h.broadcaster.EmitToUser(userID, "transaction.created", gin.H{
			"type":   "deposit",
			"amount": input.Amount,
		})
	}

	httpresp.Success(c, balance)
}

// CreateEscrow handles POST /escrow (internal or admin or triggered by order)
// Usually triggered by order acceptance, but for testing or manual:
func (h *PaymentHandler) CreateEscrow(c *gin.Context) {
	var input payment.CreateEscrowInput
	if err := c.ShouldBindJSON(&input); err != nil {
		httpresp.BadRequest(c, err.Error())
		return
	}

	escrow, err := h.createEscrowUC.Run(c.Request.Context(), input)
	if err != nil {
		httpresp.Error(c, err)
		return
	}

	h.emitEscrowRealtime(c, escrow, "hold")

	httpresp.Created(c, escrow)
}

// ReleaseEscrow handles POST /escrow/:orderID/release
func (h *PaymentHandler) ReleaseEscrow(c *gin.Context) {
	orderID, ok := parseUUIDParam(c, "orderId", "invalid order id")
	if !ok {
		return
	}

	escrow, err := h.releaseEscrowUC.Run(c.Request.Context(), orderID)
	if err != nil {
		httpresp.Error(c, err)
		return
	}

	h.emitEscrowRealtime(c, escrow, "release")

	httpresp.Success(c, escrow)
}

// RefundEscrow handles POST /escrow/:orderID/refund
func (h *PaymentHandler) RefundEscrow(c *gin.Context) {
	orderID, ok := parseUUIDParam(c, "orderId", "invalid order id")
	if !ok {
		return
	}

	escrow, err := h.refundEscrowUC.Run(c.Request.Context(), orderID)
	if err != nil {
		httpresp.Error(c, err)
		return
	}

	h.emitEscrowRealtime(c, escrow, "refund")

	httpresp.Success(c, escrow)
}

// GetEscrow handles GET /escrow/:orderID
func (h *PaymentHandler) GetEscrow(c *gin.Context) {
	orderID, ok := parseUUIDParam(c, "orderId", "invalid order id")
	if !ok {
		return
	}

	escrow, err := h.getEscrowUC.Run(c.Request.Context(), orderID)
	if err != nil {
		httpresp.Error(c, err)
		return
	}

	httpresp.Success(c, escrow)
}

// ListTransactions handles GET /payments/transactions
func (h *PaymentHandler) ListTransactions(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}

	limit := parseIntQuery(c, "limit", 10)
	offset := parseIntQuery(c, "offset", 0)

	txs, err := h.listTransactionsUC.Run(c.Request.Context(), userID, limit, offset)
	if err != nil {
		httpresp.Error(c, err)
		return
	}

	total := offset + len(txs)
	hasMore := limit > 0 && len(txs) == limit
	if hasMore {
		total++
	}
	httpresp.Paginated(c, txs, total, limit, offset)
}

func (h *PaymentHandler) emitEscrowRealtime(c *gin.Context, escrow *entity.Escrow, txType string) {
	if h.broadcaster == nil || escrow == nil {
		return
	}

	_ = h.broadcaster.EmitToUsers([]uuid.UUID{escrow.ClientID, escrow.FreelancerID}, "order.updated", gin.H{
		"order_id": escrow.OrderID.String(),
	})

	_ = h.broadcaster.EmitToUser(escrow.ClientID, "transaction.created", gin.H{
		"type":     txType,
		"order_id": escrow.OrderID.String(),
		"amount":   escrow.Amount,
	})
	_ = h.broadcaster.EmitToUser(escrow.FreelancerID, "transaction.created", gin.H{
		"type":     txType,
		"order_id": escrow.OrderID.String(),
		"amount":   escrow.Amount,
	})

	h.emitBalanceUpdate(c, escrow.ClientID)
	h.emitBalanceUpdate(c, escrow.FreelancerID)
}

func (h *PaymentHandler) emitBalanceUpdate(c *gin.Context, userID uuid.UUID) {
	balance, err := h.getBalanceUC.Run(c.Request.Context(), userID)
	if err != nil {
		return
	}

	_ = h.broadcaster.EmitToUser(userID, "balance.updated", gin.H{
		"available": balance.Available,
		"frozen":    balance.Frozen,
	})
}
