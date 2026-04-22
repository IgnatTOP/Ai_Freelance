package main

import (
	httpHandlers "github.com/ignatzorin/freelance-backend/internal/http/handlers"
	"github.com/ignatzorin/freelance-backend/internal/infrastructure/persistence"
	"github.com/ignatzorin/freelance-backend/internal/infrastructure/security"
	newHandler "github.com/ignatzorin/freelance-backend/internal/interface/http/handler"
	"github.com/ignatzorin/freelance-backend/internal/repository"
	"github.com/ignatzorin/freelance-backend/internal/service"
	"github.com/ignatzorin/freelance-backend/internal/ws"
	"github.com/jmoiron/sqlx"
)

type repoBundle struct {
	db                   *sqlx.DB
	userRepo             *repository.UserRepository
	orderRepo            *repository.OrderRepository
	mediaRepo            *repository.MediaRepository
	notificationRepo     *repository.NotificationRepository
	portfolioRepo        *repository.PortfolioRepository
	paymentRepo          *repository.PaymentRepository
	reviewRepo           *repository.ReviewRepository
	catalogRepo          *repository.CatalogRepository
	withdrawalRepo       *repository.WithdrawalRepository
	favoriteRepo         *repository.FavoriteRepository
	reportRepo           *repository.ReportRepository
	disputeRepo          *repository.DisputeRepository
	verificationRepo     *repository.VerificationRepository
	proposalTemplateRepo *repository.ProposalTemplateRepository

	newOrderRepo        *persistence.OrderRepositoryAdapter
	newProposalRepo     *persistence.ProposalRepositoryAdapter
	newConvRepo         *persistence.ConversationRepositoryAdapter
	newMsgRepo          *persistence.MessageRepositoryAdapter
	newUserRepo         *persistence.UserRepositoryAdapter
	newPaymentRepo      *persistence.PaymentRepositoryAdapter
	newReviewRepo       *persistence.ReviewRepositoryAdapter
	newNotificationRepo *persistence.NotificationRepositoryAdapter
	newPortfolioRepo    *persistence.PortfolioRepositoryAdapter
}

type cleanHandlersBundle struct {
	tokenManager           *security.TokenManager
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

type legacyCompatBundle struct {
	legacyTokenManager        *service.TokenManager
	proposalOperationsHandler *httpHandlers.ProposalOperationsHandler
	aiOrderHandler            *httpHandlers.AIOrderHandler
	mediaHandler              *httpHandlers.MediaHandler
	wsHandler                 *httpHandlers.WSHandler
	statsHandler              *httpHandlers.StatsHandler
	dashboardHandler          *httpHandlers.DashboardHandler
	onboardingHandler         *httpHandlers.OnboardingHandler
	healthHandler             *httpHandlers.HealthHandler
	seedHandler               *httpHandlers.SeedHandler
	catalogHandler            *httpHandlers.CatalogHandler
	withdrawalHandler         *httpHandlers.WithdrawalHandler
	favoriteHandler           *httpHandlers.FavoriteHandler
	reportHandler             *httpHandlers.ReportHandler
	disputeHandler            *httpHandlers.DisputeHandler
	verificationHandler       *httpHandlers.VerificationHandler
	proposalTemplateHandler   *httpHandlers.ProposalTemplateHandler
	freelancerHandler         *httpHandlers.FreelancerHandler
	hub                       *ws.Hub
}

type legacyServicesBundle struct {
	legacyTokenManager      *service.TokenManager
	seedService             *service.SeedService
	extendedSeedService     *service.ExtendedSeedService
	withdrawalService       *service.WithdrawalService
	favoriteService         *service.FavoriteService
	reportService           *service.ReportService
	disputeService          *service.DisputeService
	verificationService     *service.VerificationService
	proposalTemplateService *service.ProposalTemplateService
	orderService            *service.OrderService
	hub                     *ws.Hub
}
