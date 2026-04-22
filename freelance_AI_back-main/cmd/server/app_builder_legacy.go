package main

import (
	"context"
	"fmt"
	"log"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/ignatzorin/freelance-backend/internal/ai"
	"github.com/ignatzorin/freelance-backend/internal/config"
	httpHandlers "github.com/ignatzorin/freelance-backend/internal/http/handlers"
	"github.com/ignatzorin/freelance-backend/internal/models"
	"github.com/ignatzorin/freelance-backend/internal/service"
	"github.com/ignatzorin/freelance-backend/internal/storage"
	"github.com/ignatzorin/freelance-backend/internal/ws"
)

func buildLegacyCompatStack(
	ctx context.Context,
	cfg *config.Config,
	dbConn *sqlx.DB,
	repos repoBundle,
	photoStorage *storage.PhotoStorage,
	cacheService *service.CacheService,
) (legacyCompatBundle, error) {
	legacyServices, err := buildLegacyServices(ctx, cfg, dbConn, repos)
	if err != nil {
		return legacyCompatBundle{}, err
	}
	return buildLegacyHandlers(cfg, dbConn, repos, photoStorage, cacheService, legacyServices), nil
}

func buildLegacyServices(
	ctx context.Context,
	cfg *config.Config,
	dbConn *sqlx.DB,
	repos repoBundle,
) (legacyServicesBundle, error) {
	legacyTokenManager := service.NewTokenManager(cfg.JWTSecret, cfg.RefreshSecret, cfg.AccessTokenTTL, cfg.RefreshTokenTTL)

	notificationService := service.NewNotificationService(repos.notificationRepo)
	seedService := service.NewSeedService(repos.userRepo, repos.orderRepo)
	extendedSeedService := service.NewExtendedSeedService(
		dbConn, repos.userRepo, repos.orderRepo, repos.mediaRepo, repos.portfolioRepo, repos.notificationRepo,
		repos.paymentRepo, repos.reviewRepo, repos.favoriteRepo, repos.withdrawalRepo, repos.disputeRepo,
		repos.reportRepo, repos.verificationRepo, repos.catalogRepo, repos.proposalTemplateRepo,
	)
	withdrawalService := service.NewWithdrawalService(repos.withdrawalRepo)
	favoriteService := service.NewFavoriteService(repos.favoriteRepo)
	reportService := service.NewReportService(repos.reportRepo)
	disputeService := service.NewDisputeService(repos.disputeRepo, repos.paymentRepo)

	verificationService, err := buildLegacyVerificationService(cfg, repos)
	if err != nil {
		return legacyServicesBundle{}, err
	}
	proposalTemplateService := service.NewProposalTemplateService(repos.proposalTemplateRepo)

	orderService, hub := buildLegacyOrderRuntime(ctx, cfg, repos, notificationService)

	return legacyServicesBundle{
		legacyTokenManager:      legacyTokenManager,
		seedService:             seedService,
		extendedSeedService:     extendedSeedService,
		withdrawalService:       withdrawalService,
		favoriteService:         favoriteService,
		reportService:           reportService,
		disputeService:          disputeService,
		verificationService:     verificationService,
		proposalTemplateService: proposalTemplateService,
		orderService:            orderService,
		hub:                     hub,
	}, nil
}

func buildLegacyVerificationService(cfg *config.Config, repos repoBundle) (*service.VerificationService, error) {
	verificationEmailSender, err := buildVerificationEmailSender(cfg)
	if err != nil {
		return nil, fmt.Errorf("инициализация email verification sender: %w", err)
	}
	verificationSMSSender, err := buildVerificationSMSSender(cfg)
	if err != nil {
		return nil, fmt.Errorf("инициализация sms verification sender: %w", err)
	}

	return service.NewVerificationService(
		repos.verificationRepo,
		verificationEmailSender,
		verificationSMSSender,
		buildVerificationPolicy(cfg),
	), nil
}

func buildLegacyOrderRuntime(
	ctx context.Context,
	cfg *config.Config,
	repos repoBundle,
	notificationService *service.NotificationService,
) (*service.OrderService, *ws.Hub) {
	orderService := service.NewOrderService(repos.orderRepo, repos.userRepo, repos.portfolioRepo, repos.userRepo, ai.NewClient(cfg.AIBaseURL, cfg.AIModel))
	orderService.SetPaymentRepository(repos.paymentRepo)

	hub := ws.NewHub(ctx)
	var rtStore ws.RTStateStore = ws.NewMemoryRTStateStore()
	if cfg.RTRedisEnabled && cfg.RedisURL != "" {
		if redisStore, err := ws.NewRedisRTStateStore(ctx, cfg.RedisURL); err == nil {
			rtStore = redisStore
		} else {
			log.Printf("ws: redis unavailable, using in-memory RT store: %v", err)
		}
	}
	hub.SetRTStateStore(rtStore, cfg.RTPresenceTTL, cfg.RTTypingTTL)
	hub.SetNotificationSaver(ws.NewNotificationServiceAdapter(notificationService))
	hub.SetCommandHandler(ws.NewDefaultCommandHandler(ws.CommandDependencies{
		MarkNotificationRead: func(ctx context.Context, userID, notificationID uuid.UUID) error {
			return notificationService.MarkAsRead(ctx, notificationID, userID)
		},
		MarkAllNotificationsRead: func(ctx context.Context, userID uuid.UUID) error {
			return notificationService.MarkAllAsRead(ctx, userID)
		},
		CountUnreadNotifications: func(ctx context.Context, userID uuid.UUID) (int, error) {
			return notificationService.CountUnread(ctx, userID)
		},
		UpsertMessageRead: func(ctx context.Context, userID, conversationID, messageID uuid.UUID) error {
			return repos.orderRepo.UpsertMessageRead(ctx, userID, conversationID, messageID)
		},
		GetConversationByID: func(ctx context.Context, conversationID uuid.UUID) (*models.Conversation, error) {
			return repos.orderRepo.GetConversationByID(ctx, conversationID)
		},
		GetMessageByID: func(ctx context.Context, messageID uuid.UUID) (*models.Message, error) {
			return repos.orderRepo.GetMessageByID(ctx, messageID)
		},
	}))
	go hub.Run()
	orderService.SetHub(hub)

	return orderService, hub
}

func buildLegacyHandlers(
	cfg *config.Config,
	dbConn *sqlx.DB,
	repos repoBundle,
	photoStorage *storage.PhotoStorage,
	cacheService *service.CacheService,
	legacyServices legacyServicesBundle,
) legacyCompatBundle {
	bundle := legacyCompatBundle{
		legacyTokenManager: legacyServices.legacyTokenManager,
		hub:                legacyServices.hub,
	}

	buildLegacyRealtimeAndAIHandlers(&bundle, cfg, repos, photoStorage, legacyServices)
	buildLegacyOpsAndAdminHandlers(&bundle, dbConn, repos, cacheService, legacyServices)
	buildLegacyCatalogAndSupportHandlers(&bundle, repos, legacyServices)

	return bundle
}

func buildLegacyRealtimeAndAIHandlers(
	bundle *legacyCompatBundle,
	cfg *config.Config,
	repos repoBundle,
	photoStorage *storage.PhotoStorage,
	legacyServices legacyServicesBundle,
) {
	bundle.proposalOperationsHandler = httpHandlers.NewProposalOperationsHandler(legacyServices.orderService, repos.userRepo, repos.mediaRepo, legacyServices.hub)
	bundle.aiOrderHandler = httpHandlers.NewAIOrderHandler(legacyServices.orderService, repos.userRepo, repos.mediaRepo, legacyServices.hub)
	bundle.mediaHandler = httpHandlers.NewMediaHandler(repos.mediaRepo, photoStorage)
	bundle.wsHandler = httpHandlers.NewWSHandler(legacyServices.hub, legacyServices.legacyTokenManager, cfg.AllowedOrigins)
}

func buildLegacyOpsAndAdminHandlers(
	bundle *legacyCompatBundle,
	dbConn *sqlx.DB,
	repos repoBundle,
	cacheService *service.CacheService,
	legacyServices legacyServicesBundle,
) {
	bundle.statsHandler = httpHandlers.NewStatsHandler(repos.orderRepo, repos.userRepo)
	bundle.dashboardHandler = httpHandlers.NewDashboardHandler(repos.orderRepo, repos.userRepo, repos.notificationRepo, legacyServices.orderService, cacheService)
	bundle.onboardingHandler = httpHandlers.NewOnboardingHandler(dbConn)
	bundle.healthHandler = httpHandlers.NewHealthHandler(dbConn)
	bundle.seedHandler = httpHandlers.NewSeedHandler(legacyServices.seedService, legacyServices.extendedSeedService)
	bundle.withdrawalHandler = httpHandlers.NewWithdrawalHandler(legacyServices.withdrawalService)
	bundle.favoriteHandler = httpHandlers.NewFavoriteHandler(legacyServices.favoriteService)
	bundle.reportHandler = httpHandlers.NewReportHandler(legacyServices.reportService)
	bundle.disputeHandler = httpHandlers.NewDisputeHandler(legacyServices.disputeService)
	bundle.verificationHandler = httpHandlers.NewVerificationHandler(legacyServices.verificationService)
}

func buildLegacyCatalogAndSupportHandlers(
	bundle *legacyCompatBundle,
	repos repoBundle,
	legacyServices legacyServicesBundle,
) {
	bundle.catalogHandler = httpHandlers.NewCatalogHandler(repos.catalogRepo)
	bundle.proposalTemplateHandler = httpHandlers.NewProposalTemplateHandler(legacyServices.proposalTemplateService)
	bundle.freelancerHandler = httpHandlers.NewFreelancerHandler(repos.userRepo)
}
