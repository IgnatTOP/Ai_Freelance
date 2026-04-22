package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/usecase/user"
)

type userHandlerTestRepo struct {
	user    *entity.User
	profile *entity.Profile
}

func (r *userHandlerTestRepo) Create(_ context.Context, _ *entity.User) error { return nil }
func (r *userHandlerTestRepo) Update(_ context.Context, _ *entity.User) error { return nil }
func (r *userHandlerTestRepo) GetByID(_ context.Context, id uuid.UUID) (*entity.User, error) {
	if r.user != nil && r.user.ID == id {
		return r.user, nil
	}
	return nil, errNotFound
}
func (r *userHandlerTestRepo) GetByEmail(_ context.Context, _ string) (*entity.User, error) {
	return nil, errNotFound
}
func (r *userHandlerTestRepo) GetByUsername(_ context.Context, username string) (*entity.User, error) {
	if r.user != nil && strings.EqualFold(r.user.Username, username) {
		return r.user, nil
	}
	return nil, errNotFound
}
func (r *userHandlerTestRepo) GetProfile(_ context.Context, userID uuid.UUID) (*entity.Profile, error) {
	if r.profile != nil && r.profile.UserID == userID {
		return r.profile, nil
	}
	return nil, errNotFound
}
func (r *userHandlerTestRepo) UpdateProfile(_ context.Context, _ *entity.Profile) error { return nil }
func (r *userHandlerTestRepo) CreateSession(_ context.Context, _ *entity.Session) error { return nil }
func (r *userHandlerTestRepo) GetSessionByRefreshToken(_ context.Context, _ string) (*entity.Session, error) {
	return nil, errNotFound
}
func (r *userHandlerTestRepo) DeleteSession(_ context.Context, _ uuid.UUID) error { return nil }
func (r *userHandlerTestRepo) DeleteSessionByUser(_ context.Context, _ uuid.UUID, _ uuid.UUID) error {
	return nil
}
func (r *userHandlerTestRepo) DeleteAllSessions(_ context.Context, _ uuid.UUID) error {
	return nil
}
func (r *userHandlerTestRepo) DeleteAllSessionsExcept(_ context.Context, _ uuid.UUID, _ uuid.UUID) error {
	return nil
}
func (r *userHandlerTestRepo) ListSessions(_ context.Context, _ uuid.UUID) ([]entity.Session, error) {
	return []entity.Session{}, nil
}

var errNotFound = errors.New("not found")

func TestUserHandler_GetProfileByUsername(t *testing.T) {
	gin.SetMode(gin.TestMode)

	userID := uuid.New()
	bio := "Senior engineer"
	now := time.Now().UTC().Truncate(time.Second)
	repo := &userHandlerTestRepo{
		user: &entity.User{
			ID:       userID,
			Username: "John_Doe",
		},
		profile: &entity.Profile{
			UserID:          userID,
			DisplayName:     "John Doe",
			Bio:             &bio,
			ExperienceLevel: "senior",
			Skills:          []string{"Go", "React"},
			UpdatedAt:       now,
		},
	}

	getProfileUC := user.NewGetProfileUseCase(repo)
	h := NewUserHandler(nil, nil, getProfileUC, nil, nil, nil, nil, nil, nil, true)

	r := gin.New()
	r.GET("/users/by-username/:username", h.GetProfileByUsername)

	req := httptest.NewRequest(http.MethodGet, "/users/by-username/john_doe", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	data, ok := body["data"].(map[string]any)
	if !ok {
		t.Fatalf("expected response envelope with data, got %v", body)
	}

	if data["username"] != "John_Doe" {
		t.Fatalf("expected username John_Doe, got %v", data["username"])
	}
	if data["display_name"] != "John Doe" {
		t.Fatalf("expected display_name John Doe, got %v", data["display_name"])
	}
	if data["user_id"] == nil {
		t.Fatalf("expected user_id to be present")
	}
}

func TestUserHandler_GetProfileByUsername_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &userHandlerTestRepo{}
	getProfileUC := user.NewGetProfileUseCase(repo)
	h := NewUserHandler(nil, nil, getProfileUC, nil, nil, nil, nil, nil, nil, true)

	r := gin.New()
	r.GET("/users/by-username/:username", h.GetProfileByUsername)

	req := httptest.NewRequest(http.MethodGet, "/users/by-username/missing_user", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestUserHandler_UpdateMe_BindsSnakeCaseFields(t *testing.T) {
	gin.SetMode(gin.TestMode)

	userID := uuid.New()
	repo := &userHandlerTestRepo{
		user: &entity.User{
			ID:       userID,
			Username: "ignat",
		},
		profile: &entity.Profile{
			UserID:          userID,
			DisplayName:     "Old Name",
			ExperienceLevel: "junior",
			Skills:          []string{"Go"},
			UpdatedAt:       time.Now().UTC(),
		},
	}

	updateProfileUC := user.NewUpdateProfileUseCase(repo)
	h := NewUserHandler(nil, nil, nil, updateProfileUC, nil, nil, nil, nil, nil, true)

	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("userID", userID.String())
		c.Next()
	})
	r.PUT("/profile", h.UpdateMe)

	body := `{
		"display_name":"Зорин Игнат",
		"bio":"Новый bio",
		"hourly_rate":1400,
		"experience_level":"senior",
		"skills":["Go","React"],
		"location":"Москва",
		"company_name":"ООО ЯНДЕКС"
	}`

	req := httptest.NewRequest(http.MethodPut, "/profile", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var envelope struct {
		Data entity.Profile `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	got := envelope.Data

	if got.DisplayName != "Зорин Игнат" {
		t.Fatalf("expected display_name to be updated, got %q", got.DisplayName)
	}
	if got.ExperienceLevel != "senior" {
		t.Fatalf("expected experience_level senior, got %q", got.ExperienceLevel)
	}
	if got.HourlyRate == nil || *got.HourlyRate != 1400 {
		t.Fatalf("expected hourly_rate 1400, got %+v", got.HourlyRate)
	}
	if got.CompanyName == nil || *got.CompanyName != "ООО ЯНДЕКС" {
		t.Fatalf("expected company_name to be updated, got %+v", got.CompanyName)
	}
}
