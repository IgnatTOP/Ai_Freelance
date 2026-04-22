package main

import (
	"context"
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"

	"github.com/ignatzorin/freelance-backend/internal/config"
	httpRouter "github.com/ignatzorin/freelance-backend/internal/http/router"
	newHandler "github.com/ignatzorin/freelance-backend/internal/interface/http/handler"
	"github.com/ignatzorin/freelance-backend/internal/service"
	"github.com/ignatzorin/freelance-backend/internal/storage"
	"github.com/ignatzorin/freelance-backend/internal/ws"
)

func buildEngine(ctx context.Context, cfg *config.Config, dbConn *sqlx.DB) (*gin.Engine, error) {
	cacheService := service.NewCacheService()
	photoStorage, err := storage.NewPhotoStorage(cfg.MediaStoragePath, cfg.MaxUploadSizeMB)
	if err != nil {
		return nil, fmt.Errorf("не удалось подготовить файловое хранилище: %w", err)
	}

	repos := buildRepos(dbConn)
	cleanHandlers := buildCleanStack(cfg, repos)
	legacyCompat, err := buildLegacyCompatStack(ctx, cfg, dbConn, repos, photoStorage, cacheService)
	if err != nil {
		return nil, err
	}
	if legacyCompat.proposalOperationsHandler != nil {
		legacyCompat.proposalOperationsHandler.SetEnforceTopDomainEnvelope(cfg.APIEnvelopeEnforceTopRT)
	}
	if cfg.RTCleanBridgeEnabled {
		hubBroadcaster := ws.NewHubBroadcaster(legacyCompat.hub)
		cleanHandlers.newOrderHandler.SetBroadcaster(hubBroadcaster)
		cleanHandlers.newPaymentHandler.SetBroadcaster(hubBroadcaster)
		cleanHandlers.newNotificationHandler.SetBroadcaster(hubBroadcaster)
		cleanHandlers.newConvHandler.SetBroadcaster(hubBroadcaster)
	}

	engine := httpRouter.SetupRouter(
		cfg,
		legacyCompat.proposalOperationsHandler,
		legacyCompat.aiOrderHandler,
		legacyCompat.mediaHandler,
		legacyCompat.wsHandler,
		legacyCompat.statsHandler,
		legacyCompat.dashboardHandler,
		legacyCompat.onboardingHandler,
		legacyCompat.healthHandler,
		legacyCompat.seedHandler,
		legacyCompat.legacyTokenManager,
		cleanHandlers.newOrderHandler,
		cleanHandlers.newProposalHandler,
		cleanHandlers.newConvHandler,
		cleanHandlers.newUserHandler,
		cleanHandlers.newPaymentHandler,
		cleanHandlers.newReviewHandler,
		cleanHandlers.newNotificationHandler,
		cleanHandlers.newPortfolioHandler,
		cleanHandlers.settingsHandler,
		newHandler.NewPresenceHandler(legacyCompat.hub),
		cleanHandlers.searchHandler,
		cleanHandlers.feedHandler,
		cleanHandlers.serviceMarketHandler,
		cleanHandlers.readReceiptHandler,
		legacyCompat.catalogHandler,
		legacyCompat.withdrawalHandler,
		legacyCompat.favoriteHandler,
		legacyCompat.reportHandler,
		legacyCompat.disputeHandler,
		legacyCompat.verificationHandler,
		legacyCompat.proposalTemplateHandler,
		legacyCompat.freelancerHandler,
	)

	return engine, nil
}
