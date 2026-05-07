package handler

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	httpresp "github.com/ignatzorin/freelance-backend/internal/interface/http/response"
	"github.com/ignatzorin/freelance-backend/internal/pkg/apperror"
	"github.com/ignatzorin/freelance-backend/internal/usecase/user"
)

// UserHandler handles user-related HTTP requests.
type UserHandler struct {
	registerUC            *user.RegisterUserUseCase
	loginUC               *user.LoginUserUseCase
	getProfileUC          *user.GetProfileUseCase
	updateProfileUC       *user.UpdateProfileUseCase
	refreshSessionUC      *user.RefreshSessionUseCase
	listSessionsUC        *user.ListSessionsUseCase
	deleteSessionUC       *user.DeleteSessionUseCase
	deleteOtherSessionsUC *user.DeleteOtherSessionsUseCase
	updateRoleUC          *user.UpdateRoleUseCase
	devPhoneVerifyBypass  bool
}

type PublicProfileByUsernameResponse struct {
	UserID                uuid.UUID  `json:"user_id"`
	Username              string     `json:"username"`
	DisplayName           string     `json:"display_name"`
	Bio                   *string    `json:"bio,omitempty"`
	HourlyRate            *float64   `json:"hourly_rate,omitempty"`
	ExperienceLevel       string     `json:"experience_level"`
	Skills                []string   `json:"skills"`
	Location              *string    `json:"location,omitempty"`
	PhotoID               *uuid.UUID `json:"photo_id,omitempty"`
	AISummary             *string    `json:"ai_summary,omitempty"`
	Phone                 *string    `json:"phone,omitempty"`
	Telegram              *string    `json:"telegram,omitempty"`
	Website               *string    `json:"website,omitempty"`
	CompanyName           *string    `json:"company_name,omitempty"`
	INN                   *string    `json:"inn,omitempty"`
	OnboardingCompletedAt *string    `json:"onboarding_completed_at,omitempty"`
	UpdatedAt             string     `json:"updated_at"`
}

func buildPublicProfileResponse(foundUser *entity.User, profile *entity.Profile) PublicProfileByUsernameResponse {
	var onboardingCompletedAt *string
	if profile.OnboardingCompletedAt != nil {
		value := profile.OnboardingCompletedAt.Format("2006-01-02T15:04:05Z07:00")
		onboardingCompletedAt = &value
	}

	return PublicProfileByUsernameResponse{
		UserID:                profile.UserID,
		Username:              foundUser.Username,
		DisplayName:           profile.DisplayName,
		Bio:                   profile.Bio,
		HourlyRate:            profile.HourlyRate,
		ExperienceLevel:       profile.ExperienceLevel,
		Skills:                profile.Skills,
		Location:              profile.Location,
		PhotoID:               profile.PhotoID,
		AISummary:             profile.AISummary,
		Phone:                 profile.Phone,
		Telegram:              profile.Telegram,
		Website:               profile.Website,
		CompanyName:           profile.CompanyName,
		INN:                   profile.INN,
		OnboardingCompletedAt: onboardingCompletedAt,
		UpdatedAt:             profile.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// NewUserHandler creates a new UserHandler.
func NewUserHandler(
	registerUC *user.RegisterUserUseCase,
	loginUC *user.LoginUserUseCase,
	getProfileUC *user.GetProfileUseCase,
	updateProfileUC *user.UpdateProfileUseCase,
	refreshSessionUC *user.RefreshSessionUseCase,
	listSessionsUC *user.ListSessionsUseCase,
	deleteSessionUC *user.DeleteSessionUseCase,
	deleteOtherSessionsUC *user.DeleteOtherSessionsUseCase,
	updateRoleUC *user.UpdateRoleUseCase,
	devPhoneVerifyBypass bool,
) *UserHandler {
	return &UserHandler{
		registerUC:            registerUC,
		loginUC:               loginUC,
		getProfileUC:          getProfileUC,
		updateProfileUC:       updateProfileUC,
		refreshSessionUC:      refreshSessionUC,
		listSessionsUC:        listSessionsUC,
		deleteSessionUC:       deleteSessionUC,
		deleteOtherSessionsUC: deleteOtherSessionsUC,
		updateRoleUC:          updateRoleUC,
		devPhoneVerifyBypass:  devPhoneVerifyBypass,
	}
}

type phoneAuthRequest struct {
	Phone    string `json:"phone" binding:"required"`
	Password string `json:"password" binding:"required,min=8"`
	Role     string `json:"role,omitempty" binding:"omitempty,oneof=client freelancer"`
}

func normalizePhone(raw string) string {
	re := regexp.MustCompile(`\D`)
	return re.ReplaceAllString(strings.TrimSpace(raw), "")
}

func phoneToEmail(phone string) string {
	return fmt.Sprintf("%s@phone.local", phone)
}

func phoneToUsername(phone string) string {
	if len(phone) <= 10 {
		return "u_" + phone
	}
	return "u_" + phone[len(phone)-10:]
}

// RegisterPhone handles phone-first registration.
func (h *UserHandler) RegisterPhone(c *gin.Context) {
	var req phoneAuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpresp.BadRequest(c, err.Error())
		return
	}

	phone := normalizePhone(req.Phone)
	if len(phone) < 10 {
		httpresp.BadRequest(c, "invalid phone")
		return
	}

	role := req.Role
	if role == "" {
		role = "freelancer"
	}

	result, err := h.registerUC.Run(c.Request.Context(), user.RegisterUserInput{
		Email:    phoneToEmail(phone),
		Username: phoneToUsername(phone),
		Password: req.Password,
		Role:     role,
	})
	if err != nil {
		httpresp.Error(c, err)
		return
	}

	httpresp.Created(c, result)
}

// LoginPhone handles phone-first login.
func (h *UserHandler) LoginPhone(c *gin.Context) {
	var req phoneAuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpresp.BadRequest(c, err.Error())
		return
	}

	phone := normalizePhone(req.Phone)
	if len(phone) < 10 {
		httpresp.BadRequest(c, "invalid phone")
		return
	}

	result, err := h.loginUC.Run(c.Request.Context(), user.LoginUserInput{
		Email:    phoneToEmail(phone),
		Password: req.Password,
	})
	if err != nil {
		httpresp.Unauthorized(c, err.Error())
		return
	}

	httpresp.Success(c, result)
}

// VerifyPhone validates sms code. In development any 6-digit code is accepted.
func (h *UserHandler) VerifyPhone(c *gin.Context) {
	var req struct {
		Phone string `json:"phone" binding:"required"`
		Code  string `json:"code" binding:"required,len=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		httpresp.BadRequest(c, err.Error())
		return
	}

	if !h.devPhoneVerifyBypass {
		httpresp.BadRequest(c, "phone verification provider is not configured in clean auth flow yet")
		return
	}

	httpresp.Success(c, gin.H{"verified": true})
}

// ResendPhoneCode keeps the phone-first dev flow usable while the clean auth
// stack accepts any six-digit code in non-production environments.
func (h *UserHandler) ResendPhoneCode(c *gin.Context) {
	var req struct {
		Phone string `json:"phone" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		httpresp.BadRequest(c, err.Error())
		return
	}

	phone := normalizePhone(req.Phone)
	if len(phone) < 10 {
		httpresp.BadRequest(c, "invalid phone")
		return
	}

	if !h.devPhoneVerifyBypass {
		httpresp.BadRequest(c, "phone verification provider is not configured in clean auth flow yet")
		return
	}

	httpresp.Success(c, gin.H{"sent": true})
}

// Register handles user registration.
func (h *UserHandler) Register(c *gin.Context) {
	var input user.RegisterUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		httpresp.BadRequest(c, err.Error())
		return
	}

	result, err := h.registerUC.Run(c.Request.Context(), input)
	if err != nil {
		httpresp.Error(c, err)
		return
	}

	httpresp.Created(c, result)
}

// Login handles user login.
func (h *UserHandler) Login(c *gin.Context) {
	var input user.LoginUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		httpresp.BadRequest(c, err.Error())
		return
	}

	result, err := h.loginUC.Run(c.Request.Context(), input)
	if err != nil {
		httpresp.Unauthorized(c, err.Error())
		return
	}

	httpresp.Success(c, result)
}

// Refresh handles token refresh.
func (h *UserHandler) Refresh(c *gin.Context) {
	var input struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		httpresp.BadRequest(c, err.Error())
		return
	}

	result, err := h.refreshSessionUC.Run(c.Request.Context(), input.RefreshToken)
	if err != nil {
		httpresp.Unauthorized(c, err.Error())
		return
	}

	httpresp.Success(c, result)
}

// GetMe handles getting the current user's profile.
func (h *UserHandler) GetMe(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}

	foundUser, profile, err := h.getProfileUC.RunWithUserID(c.Request.Context(), userID)
	if err != nil {
		httpresp.NotFound(c, "profile not found")
		return
	}

	httpresp.Success(c, buildPublicProfileResponse(foundUser, profile))
}

// UpdateMe handles updating the current user's profile.
func (h *UserHandler) UpdateMe(c *gin.Context) {
	var input user.UpdateProfileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		httpresp.BadRequest(c, err.Error())
		return
	}

	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}
	input.UserID = userID

	profile, err := h.updateProfileUC.Run(c.Request.Context(), input)
	if err != nil {
		httpresp.Error(c, err)
		return
	}

	httpresp.Success(c, profile)
}

// ListSessions handles listing user sessions.
func (h *UserHandler) ListSessions(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}

	sessions, err := h.listSessionsUC.Run(c.Request.Context(), userID)
	if err != nil {
		httpresp.Error(c, err)
		return
	}

	httpresp.Success(c, sessions)
}

// DeleteSession handles deleting a session.
func (h *UserHandler) DeleteSession(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}

	sessionIDStr := c.Param("id")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		httpresp.BadRequest(c, "invalid session id")
		return
	}

	if err := h.deleteSessionUC.Run(c.Request.Context(), userID, sessionID); err != nil {
		if apperror.IsForbidden(err) {
			httpresp.Forbidden(c, "session does not belong to current user")
			return
		}
		httpresp.Error(c, err)
		return
	}

	httpresp.Success(c, gin.H{"message": "session deleted"})
}

// DeleteAllSessionsExcept handles deleting all other sessions.
func (h *UserHandler) DeleteAllSessionsExcept(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}

	// Get refresh token from body or header
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		req.RefreshToken = c.GetHeader("X-Refresh-Token")
	}

	if req.RefreshToken == "" {
		httpresp.BadRequest(c, "refresh_token required")
		return
	}

	if err := h.deleteOtherSessionsUC.Run(c.Request.Context(), userID, req.RefreshToken); err != nil {
		httpresp.Error(c, err)
		return
	}

	httpresp.Success(c, gin.H{"message": "other sessions deleted"})
}

// GetProfile handles getting a user profile.
func (h *UserHandler) GetProfile(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		httpresp.BadRequest(c, "invalid user id")
		return
	}

	foundUser, profile, err := h.getProfileUC.RunWithUserID(c.Request.Context(), userID)
	if err != nil {
		httpresp.NotFound(c, "profile not found")
		return
	}

	httpresp.Success(c, buildPublicProfileResponse(foundUser, profile))
}

// GetProfileByUsername handles getting a public user profile by username.
func (h *UserHandler) GetProfileByUsername(c *gin.Context) {
	username := c.Param("username")
	if username == "" {
		httpresp.BadRequest(c, "username is required")
		return
	}

	foundUser, profile, err := h.getProfileUC.RunByUsername(c.Request.Context(), username)
	if err != nil {
		httpresp.NotFound(c, "profile not found")
		return
	}

	httpresp.Success(c, buildPublicProfileResponse(foundUser, profile))
}

// UpdateProfile handles updating a user profile.
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	var input user.UpdateProfileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		httpresp.BadRequest(c, err.Error())
		return
	}

	// Get user ID from context (auth middleware)
	// For now assuming it's passed or extracted
	if uid, err := getUserID(c); err == nil {
		input.UserID = uid
	}

	// If input.UserID is still empty, try param or fail
	if input.UserID == uuid.Nil {
		userIDStrParam := c.Param("id")
		if userIDStrParam != "" {
			uid, err := uuid.Parse(userIDStrParam)
			if err == nil {
				input.UserID = uid
			}
		}
	}

	profile, err := h.updateProfileUC.Run(c.Request.Context(), input)
	if err != nil {
		httpresp.Error(c, err)
		return
	}

	httpresp.Success(c, profile)
}

// UpdateRole handles updating the user role.
func (h *UserHandler) UpdateRole(c *gin.Context) {
	var input struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		httpresp.BadRequest(c, err.Error())
		return
	}

	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}

	user, err := h.updateRoleUC.Run(c.Request.Context(), userID, input.Role)
	if err != nil {
		httpresp.Error(c, err)
		return
	}

	httpresp.Success(c, user)
}
