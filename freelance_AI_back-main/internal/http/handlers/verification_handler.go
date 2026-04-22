package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/ignatzorin/freelance-backend/internal/http/handlers/common"
	"github.com/ignatzorin/freelance-backend/internal/service"
)

type VerificationHandler struct {
	svc *service.VerificationService
}

func NewVerificationHandler(s *service.VerificationService) *VerificationHandler {
	return &VerificationHandler{svc: s}
}

// SendEmailCode POST /verification/email/send
func (h *VerificationHandler) SendEmailCode(c *gin.Context) {
	userID, err := common.CurrentUserID(c)
	if err != nil {
		common.RespondUnauthorized(c, "")
		return
	}

	code, err := h.svc.SendEmailCode(c.Request.Context(), userID)
	if err != nil {
		h.respondSendCodeError(c, err)
		return
	}

	payload := gin.H{"message": "code sent"}
	if code != "" && h.svc.ExposeCodeInResponse() {
		payload["code"] = code
	}
	common.RespondJSON(c, http.StatusOK, payload)
}

// SendPhoneCode POST /verification/phone/send
func (h *VerificationHandler) SendPhoneCode(c *gin.Context) {
	userID, err := common.CurrentUserID(c)
	if err != nil {
		common.RespondUnauthorized(c, "")
		return
	}

	code, err := h.svc.SendPhoneCode(c.Request.Context(), userID)
	if err != nil {
		h.respondSendCodeError(c, err)
		return
	}

	payload := gin.H{"message": "code sent"}
	if code != "" && h.svc.ExposeCodeInResponse() {
		payload["code"] = code
	}
	common.RespondJSON(c, http.StatusOK, payload)
}

// VerifyCode POST /verification/verify
func (h *VerificationHandler) VerifyCode(c *gin.Context) {
	userID, err := common.CurrentUserID(c)
	if err != nil {
		common.RespondUnauthorized(c, "")
		return
	}

	var req struct {
		Type string `json:"type" binding:"required,oneof=email phone"`
		Code string `json:"code" binding:"required,len=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.RespondBadRequest(c, "invalid verification payload")
		return
	}

	ok, err := h.svc.VerifyCode(c.Request.Context(), userID, req.Type, req.Code)
	if err != nil {
		if errors.Is(err, service.ErrVerificationInvalidCode) {
			common.RespondBadRequest(c, "invalid verification code")
			return
		}
		common.RespondInternalError(c, "failed to verify code")
		return
	}
	if !ok {
		common.RespondBadRequest(c, "invalid or expired code")
		return
	}

	common.RespondJSON(c, http.StatusOK, gin.H{"verified": true})
}

// GetStatus GET /verification/status
func (h *VerificationHandler) GetStatus(c *gin.Context) {
	userID, err := common.CurrentUserID(c)
	if err != nil {
		common.RespondUnauthorized(c, "")
		return
	}

	status, err := h.svc.GetStatus(c.Request.Context(), userID)
	if err != nil {
		common.RespondInternalError(c, "failed to load verification status")
		return
	}

	common.RespondJSON(c, http.StatusOK, status)
}

func (h *VerificationHandler) respondSendCodeError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrVerificationAlreadyCompleted):
		common.RespondError(c, http.StatusConflict, "verification already completed")
	case errors.Is(err, service.ErrVerificationTargetMissing), errors.Is(err, service.ErrVerificationTargetInvalid):
		common.RespondBadRequest(c, "verification target is not available")
	case errors.Is(err, service.ErrVerificationSendCooldown), errors.Is(err, service.ErrVerificationSendLimitReached):
		common.RespondError(c, http.StatusTooManyRequests, "verification send limit exceeded")
	default:
		common.RespondInternalError(c, "failed to send verification code")
	}
}
