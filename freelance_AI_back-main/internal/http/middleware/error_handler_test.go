package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/ignatzorin/freelance-backend/internal/pkg/apperror"
	"github.com/ignatzorin/freelance-backend/internal/repository"
)

func TestErrorHandler_AppErrorProducesStructuredEnvelope(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.Use(ErrorHandler())
	r.GET("/test", func(c *gin.Context) {
		_ = c.Error(apperror.ErrForbidden)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %s", rec.Code, rec.Body.String())
	}

	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if body["success"] != false {
		t.Fatalf("expected success=false, got %v", body["success"])
	}
	errObj, ok := body["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected structured error object, got %v", body["error"])
	}
	if errObj["code"] != string(apperror.ErrCodeForbidden) {
		t.Fatalf("expected code %s, got %v", apperror.ErrCodeForbidden, errObj["code"])
	}
}

func TestErrorHandler_LegacySentinelStillWorks(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.Use(ErrorHandler())
	r.GET("/test", func(c *gin.Context) {
		_ = c.Error(repository.ErrOrderNotFound)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", rec.Code, rec.Body.String())
	}
}
