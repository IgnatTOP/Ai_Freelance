package router

import (
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/ignatzorin/freelance-backend/internal/config"
	"github.com/ignatzorin/freelance-backend/internal/http/handlers"
	newHandler "github.com/ignatzorin/freelance-backend/internal/interface/http/handler"
)

func TestSetupRouter_RegistersSingleAPIWithoutV2(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cfg := &config.Config{
		Env:              "test",
		MediaStoragePath: "./storage/media",
		AllowedOrigins:   []string{"http://localhost:3000"},
		RateLimitPeriod:  time.Minute,
	}

	r := SetupRouter(
		cfg,
		&handlers.ProposalOperationsHandler{},
		&handlers.AIOrderHandler{},
		&handlers.MediaHandler{},
		&handlers.WSHandler{},
		&handlers.StatsHandler{},
		&handlers.DashboardHandler{},
		&handlers.OnboardingHandler{},
		&handlers.HealthHandler{},
		&handlers.SeedHandler{},
		nil, // token manager is not invoked during route registration
		&newHandler.OrderHandler{},
		&newHandler.ProposalHandler{},
		&newHandler.ConversationHandler{},
		&newHandler.UserHandler{},
		&newHandler.PaymentHandler{},
		&newHandler.ReviewHandler{},
		&newHandler.NotificationHandler{},
		&newHandler.PortfolioHandler{},
		&newHandler.SettingsHandler{},
		&newHandler.PresenceHandler{},
		&newHandler.SearchHandler{},
		&newHandler.FeedHandler{},
		&newHandler.ServiceMarketHandler{},
		&newHandler.ReadReceiptHandler{},
		&handlers.CatalogHandler{},
		&handlers.WithdrawalHandler{},
		&handlers.FavoriteHandler{},
		&handlers.ReportHandler{},
		&handlers.DisputeHandler{},
		&handlers.VerificationHandler{},
		&handlers.ProposalTemplateHandler{},
		&handlers.FreelancerHandler{},
	)

	routes := r.Routes()
	if len(routes) == 0 {
		t.Fatal("expected registered routes, got none")
	}

	for _, route := range routes {
		if strings.HasPrefix(route.Path, "/api/v2") {
			t.Fatalf("unexpected v2 route registered: %s %s", route.Method, route.Path)
		}
	}

	required := map[string]bool{
		"GET /health":                    false,
		"POST /api/auth/register":        false,
		"POST /api/auth/login":           false,
		"GET /api/orders":                false,
		"POST /api/orders":               false,
		"GET /api/profile":               false,
		"GET /api/conversations/my":      false,
		"GET /api/notifications":         false,
		"POST /api/ai/assistant":         false,
		"GET /api/payments/balance":      false,
		"POST /api/proposal-templates":   false,
		"GET /api/freelancers/search":    false,
		"GET /api/verification/status":   false,
		"POST /api/orders/:id/proposals": false,
		"GET /api/orders/:id/proposals":  false,
		"GET /api/orders/:id/reviews":    false,
		"GET /media/*filepath":           false,
	}

	for _, route := range routes {
		key := route.Method + " " + route.Path
		if _, ok := required[key]; ok {
			required[key] = true
		}
	}

	for key, ok := range required {
		if !ok {
			t.Fatalf("required route is missing: %s", key)
		}
	}
}
