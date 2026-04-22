package router

import (
	"github.com/ignatzorin/freelance-backend/internal/config"
	"github.com/ignatzorin/freelance-backend/internal/http/handlers"
	newHandler "github.com/ignatzorin/freelance-backend/internal/interface/http/handler"
	"github.com/ignatzorin/freelance-backend/internal/service"
)

type routeDeps struct {
	cfg               *config.Config
	tokenManager      *service.TokenManager
	healthHandler     *handlers.HealthHandler
	seedHandler       *handlers.SeedHandler
	wsHandler         *handlers.WSHandler
	mediaHandler      *handlers.MediaHandler
	statsHandler      *handlers.StatsHandler
	dashboardHandler  *handlers.DashboardHandler
	onboardingHandler *handlers.OnboardingHandler

	proposalOperationsHandler *handlers.ProposalOperationsHandler
	aiOrderHandler            *handlers.AIOrderHandler

	catalogHandler          *handlers.CatalogHandler
	withdrawalHandler       *handlers.WithdrawalHandler
	favoriteHandler         *handlers.FavoriteHandler
	reportHandler           *handlers.ReportHandler
	disputeHandler          *handlers.DisputeHandler
	verificationHandler     *handlers.VerificationHandler
	proposalTemplateHandler *handlers.ProposalTemplateHandler
	freelancerHandler       *handlers.FreelancerHandler

	newOrderHandler        *newHandler.OrderHandler
	newProposalHandler     *newHandler.ProposalHandler
	newConvHandler         *newHandler.ConversationHandler
	newUserHandler         *newHandler.UserHandler
	newPaymentHandler      *newHandler.PaymentHandler
	newReviewHandler       *newHandler.ReviewHandler
	newNotificationHandler *newHandler.NotificationHandler
	newPortfolioHandler    *newHandler.PortfolioHandler
	settingsHandler        *newHandler.SettingsHandler
	presenceHandler        *newHandler.PresenceHandler
	searchHandler          *newHandler.SearchHandler
	feedHandler            *newHandler.FeedHandler
	serviceMarketHandler   *newHandler.ServiceMarketHandler
	readReceiptHandler     *newHandler.ReadReceiptHandler
}
