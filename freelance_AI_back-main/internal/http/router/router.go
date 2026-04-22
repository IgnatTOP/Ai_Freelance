package router

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/ignatzorin/freelance-backend/internal/config"
	"github.com/ignatzorin/freelance-backend/internal/http/handlers"
	"github.com/ignatzorin/freelance-backend/internal/http/middleware"
	newHandler "github.com/ignatzorin/freelance-backend/internal/interface/http/handler"
	"github.com/ignatzorin/freelance-backend/internal/service"
)

func SetupRouter(
	cfg *config.Config,
	// authHandler *handlers.AuthHandler, // Helper removed
	// profileHandler *handlers.ProfileHandler, // Helper removed
	proposalOperationsHandler *handlers.ProposalOperationsHandler,
	aiOrderHandler *handlers.AIOrderHandler,
	mediaHandler *handlers.MediaHandler,
	wsHandler *handlers.WSHandler,
	statsHandler *handlers.StatsHandler,
	dashboardHandler *handlers.DashboardHandler,
	onboardingHandler *handlers.OnboardingHandler,
	// proposalHandler *handlers.ProposalHandler, // Removed
	// notificationHandler *handlers.NotificationHandler, // Removed
	// portfolioHandler *handlers.PortfolioHandler, // Removed
	healthHandler *handlers.HealthHandler,
	seedHandler *handlers.SeedHandler,
	tokenManager *service.TokenManager,
	// Новые handlers (Clean Architecture)
	newOrderHandler *newHandler.OrderHandler,
	newProposalHandler *newHandler.ProposalHandler,
	newConvHandler *newHandler.ConversationHandler,
	newUserHandler *newHandler.UserHandler,
	newPaymentHandler *newHandler.PaymentHandler,
	newReviewHandler *newHandler.ReviewHandler,
	newNotificationHandler *newHandler.NotificationHandler,
	newPortfolioHandler *newHandler.PortfolioHandler,
	settingsHandler *newHandler.SettingsHandler,
	presenceHandler *newHandler.PresenceHandler,
	searchHandler *newHandler.SearchHandler,
	feedHandler *newHandler.FeedHandler,
	serviceMarketHandler *newHandler.ServiceMarketHandler,
	readReceiptHandler *newHandler.ReadReceiptHandler,
	// Платежи и отзывы
	// paymentHandler *handlers.PaymentHandler, // Removed
	// reviewHandler *handlers.ReviewHandler, // Removed
	// Каталог
	catalogHandler *handlers.CatalogHandler,
	// Дополнительные фичи
	withdrawalHandler *handlers.WithdrawalHandler,
	favoriteHandler *handlers.FavoriteHandler,
	reportHandler *handlers.ReportHandler,
	disputeHandler *handlers.DisputeHandler,
	verificationHandler *handlers.VerificationHandler,
	proposalTemplateHandler *handlers.ProposalTemplateHandler,
	freelancerHandler *handlers.FreelancerHandler,
) *gin.Engine {
	d := routeDeps{
		cfg:                       cfg,
		tokenManager:              tokenManager,
		healthHandler:             healthHandler,
		seedHandler:               seedHandler,
		wsHandler:                 wsHandler,
		mediaHandler:              mediaHandler,
		statsHandler:              statsHandler,
		dashboardHandler:          dashboardHandler,
		onboardingHandler:         onboardingHandler,
		proposalOperationsHandler: proposalOperationsHandler,
		aiOrderHandler:            aiOrderHandler,
		catalogHandler:            catalogHandler,
		withdrawalHandler:         withdrawalHandler,
		favoriteHandler:           favoriteHandler,
		reportHandler:             reportHandler,
		disputeHandler:            disputeHandler,
		verificationHandler:       verificationHandler,
		proposalTemplateHandler:   proposalTemplateHandler,
		freelancerHandler:         freelancerHandler,
		newOrderHandler:           newOrderHandler,
		newProposalHandler:        newProposalHandler,
		newConvHandler:            newConvHandler,
		newUserHandler:            newUserHandler,
		newPaymentHandler:         newPaymentHandler,
		newReviewHandler:          newReviewHandler,
		newNotificationHandler:    newNotificationHandler,
		newPortfolioHandler:       newPortfolioHandler,
		settingsHandler:           settingsHandler,
		presenceHandler:           presenceHandler,
		searchHandler:             searchHandler,
		feedHandler:               feedHandler,
		serviceMarketHandler:      serviceMarketHandler,
		readReceiptHandler:        readReceiptHandler,
	}

	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()
	r.Use(middleware.ErrorHandler())
	r.Use(middleware.CORSMiddleware(cfg.AllowedOrigins))

	r.GET("/health", d.healthHandler.Health)
	r.StaticFS("/media", http.Dir(cfg.MediaStoragePath))

	api := r.Group("/api")
	registerSeedRoutes(api, d)
	registerAuthRoutes(api, d)
	registerPublicRoutes(api, d)
	registerProtectedRoutes(api, d)

	return r
}
