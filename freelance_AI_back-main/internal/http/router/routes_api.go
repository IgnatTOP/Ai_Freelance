package router

import (
	"github.com/gin-gonic/gin"

	"github.com/ignatzorin/freelance-backend/internal/http/middleware"
)

func registerSeedRoutes(api *gin.RouterGroup, d routeDeps) {
	if d.seedHandler == nil || d.cfg.Env != "development" {
		return
	}

	api.POST("/seed", d.seedHandler.Seed)
	api.GET("/seed", d.seedHandler.Seed)
	api.POST("/seed/realistic", d.seedHandler.SeedRealistic)
	api.GET("/seed/realistic", d.seedHandler.SeedRealistic)
}

func registerAuthRoutes(api *gin.RouterGroup, d routeDeps) {
	authGroup := api.Group("/auth")
	authRateLimit := middleware.RateLimitMiddleware(5, d.cfg.RateLimitPeriod)
	authGroup.Use(authRateLimit)
	{
		authGroup.POST("/register", d.newUserHandler.Register)
		authGroup.POST("/login", d.newUserHandler.Login)
		authGroup.POST("/refresh", d.newUserHandler.Refresh)
		authGroup.POST("/register-phone", d.newUserHandler.RegisterPhone)
		authGroup.POST("/login-phone", d.newUserHandler.LoginPhone)
		authGroup.POST("/verify-phone", d.newUserHandler.VerifyPhone)
		authGroup.POST("/resend-code", d.newUserHandler.ResendPhoneCode)
	}

	protectedAuth := api.Group("/auth")
	protectedAuth.Use(middleware.AuthMiddleware(d.tokenManager))
	{
		protectedAuth.GET("/sessions", d.newUserHandler.ListSessions)
		protectedAuth.DELETE("/sessions/:id", d.newUserHandler.DeleteSession)
		protectedAuth.DELETE("/sessions", d.newUserHandler.DeleteAllSessionsExcept)
	}
}

func registerPublicRoutes(api *gin.RouterGroup, d routeDeps) {
	api.GET("/orders", d.newOrderHandler.ListOrders)
	api.GET("/orders/:id", middleware.UUIDValidator("id"), d.newOrderHandler.GetOrder)
	api.GET("/ws", d.wsHandler.Handle)
	api.GET("/users/:id", middleware.UUIDValidator("id"), d.newUserHandler.GetProfile)
	api.GET("/users/by-username/:username", d.newUserHandler.GetProfileByUsername)
	api.GET("/users/:id/portfolio", middleware.UUIDValidator("id"), d.newPortfolioHandler.ListItems)
	api.GET("/users/:id/reviews", middleware.UUIDValidator("id"), d.newReviewHandler.ListReviews)

	if d.catalogHandler != nil {
		api.GET("/catalog/categories", d.catalogHandler.ListCategories)
		api.GET("/catalog/categories/popular", d.catalogHandler.ListPopularCategories)
		api.GET("/catalog/categories/:slug", d.catalogHandler.GetCategory)
		api.GET("/catalog/skills", d.catalogHandler.ListSkills)
	}

	if d.freelancerHandler != nil {
		api.GET("/freelancers/search", d.freelancerHandler.SearchFreelancers)
	}
	if d.presenceHandler != nil {
		api.GET("/presence/online-count", d.presenceHandler.GetOnlineCount)
	}
	if d.searchHandler != nil {
		api.GET("/search/global", d.searchHandler.GlobalSearch)
	}
	if d.statsHandler != nil {
		api.GET("/stats/public", d.statsHandler.GetPublicStats)
	}
}

func registerProtectedRoutes(api *gin.RouterGroup, d routeDeps) {
	protected := api.Group("/")
	protected.Use(middleware.AuthMiddleware(d.tokenManager))
	{
		protected.GET("/profile", d.newUserHandler.GetMe)
		protected.PUT("/profile", d.newUserHandler.UpdateMe)
		protected.PUT("/users/me/role", d.newUserHandler.UpdateRole)

		protected.GET("/stats", d.statsHandler.GetMyStats)
		protected.GET("/dashboard/data", d.dashboardHandler.GetDashboardData)
		protected.POST("/dashboard/cache/invalidate", d.dashboardHandler.InvalidateCache)
		if d.onboardingHandler != nil {
			protected.GET("/onboarding/state", d.onboardingHandler.GetState)
		}

		protected.GET("/proposals/my", d.newProposalHandler.ListMyProposals)

		protected.GET("/notifications", d.newNotificationHandler.ListNotifications)
		protected.GET("/notifications/unread/count", d.newNotificationHandler.CountUnread)
		protected.GET("/notifications/:id", middleware.UUIDValidator("id"), d.newNotificationHandler.GetNotification)
		protected.POST("/notifications/:id/read", middleware.UUIDValidator("id"), d.newNotificationHandler.MarkAsRead)
		protected.POST("/notifications/read-all", d.newNotificationHandler.MarkAllAsRead)
		protected.DELETE("/notifications/:id", middleware.UUIDValidator("id"), d.newNotificationHandler.DeleteNotification)

		protected.POST("/orders", d.newOrderHandler.CreateOrder)
		protected.GET("/orders/my", d.newOrderHandler.ListMyOrders)

		protected.GET("/orders/:id/my-proposal", middleware.UUIDValidator("id"), d.proposalOperationsHandler.GetMyProposal)
		protected.GET("/orders/:id/chat", middleware.UUIDValidator("id"), d.newConvHandler.GetOrderChat)
		protected.POST("/orders/:id/complete-by-freelancer", middleware.UUIDValidator("id"), d.proposalOperationsHandler.MarkOrderAsCompletedByFreelancer)

		protected.PUT("/orders/:id", middleware.UUIDValidator("id"), d.newOrderHandler.UpdateOrder)
		protected.DELETE("/orders/:id", middleware.UUIDValidator("id"), d.newOrderHandler.DeleteOrder)
		protected.POST("/orders/:id/publish", middleware.UUIDValidator("id"), d.newOrderHandler.PublishOrder)
		protected.POST("/orders/:id/proposals", middleware.UUIDValidator("id"), d.proposalOperationsHandler.CreateProposal)
		protected.GET("/orders/:id/proposals", middleware.UUIDValidator("id"), d.proposalOperationsHandler.ListProposals)
		protected.PUT("/orders/:id/proposals/:proposalId/status", middleware.UUIDValidator("id"), middleware.UUIDValidator("proposalId"), d.proposalOperationsHandler.UpdateProposalStatus)

		protected.GET("/conversations/my", d.newConvHandler.ListMyConversations)
		protected.GET("/conversations/:conversationId/messages", middleware.UUIDValidator("conversationId"), d.newConvHandler.ListMessages)
		protected.POST("/conversations/:conversationId/messages", middleware.UUIDValidator("conversationId"), d.newConvHandler.SendMessage)
		protected.PUT("/conversations/:conversationId/messages/:messageId", middleware.UUIDValidator("conversationId"), middleware.UUIDValidator("messageId"), d.newConvHandler.UpdateMessage)
		protected.DELETE("/conversations/:conversationId/messages/:messageId", middleware.UUIDValidator("conversationId"), middleware.UUIDValidator("messageId"), d.newConvHandler.DeleteMessage)
		protected.POST("/conversations/:conversationId/messages/:messageId/reactions", middleware.UUIDValidator("conversationId"), middleware.UUIDValidator("messageId"), d.newConvHandler.AddReaction)
		protected.DELETE("/conversations/:conversationId/messages/:messageId/reactions", middleware.UUIDValidator("conversationId"), middleware.UUIDValidator("messageId"), d.newConvHandler.RemoveReaction)
		if d.readReceiptHandler != nil {
			protected.POST("/conversations/:conversationId/read", middleware.UUIDValidator("conversationId"), d.readReceiptHandler.MarkConversationRead)
		}

		if d.settingsHandler != nil {
			protected.GET("/settings/notifications", d.settingsHandler.GetNotifications)
			protected.PUT("/settings/notifications", d.settingsHandler.UpdateNotifications)
			protected.GET("/settings/privacy", d.settingsHandler.GetPrivacy)
			protected.PUT("/settings/privacy", d.settingsHandler.UpdatePrivacy)
			protected.GET("/settings/ai", d.settingsHandler.GetAI)
			protected.PUT("/settings/ai", d.settingsHandler.UpdateAI)
		}
		if d.feedHandler != nil {
			protected.GET("/feed", d.feedHandler.List)
			protected.POST("/feed", d.feedHandler.Create)
			protected.PUT("/feed/:id", middleware.UUIDValidator("id"), d.feedHandler.Update)
			protected.DELETE("/feed/:id", middleware.UUIDValidator("id"), d.feedHandler.Delete)
		}
		if d.serviceMarketHandler != nil {
			protected.GET("/services", d.serviceMarketHandler.ListServices)
			protected.POST("/services", d.serviceMarketHandler.CreateService)
			protected.PUT("/services/:id", middleware.UUIDValidator("id"), d.serviceMarketHandler.UpdateService)
			protected.DELETE("/services/:id", middleware.UUIDValidator("id"), d.serviceMarketHandler.DeleteService)
			protected.GET("/service-purchases", d.serviceMarketHandler.ListPurchases)
			protected.POST("/service-purchases", d.serviceMarketHandler.CreatePurchase)
		}

		registerAIFeatureRoutes(protected, d)
		registerProtectedFeatureRoutes(protected, d)
	}
}

func registerAIFeatureRoutes(protected *gin.RouterGroup, d routeDeps) {
	protected.POST("/ai/orders/description", d.aiOrderHandler.GenerateOrderDescription)
	protected.POST("/ai/orders/description/stream", d.aiOrderHandler.StreamGenerateOrderDescription)
	protected.POST("/ai/orders/suggestions", d.aiOrderHandler.GenerateOrderSuggestions)
	protected.POST("/ai/orders/suggestions/stream", d.aiOrderHandler.StreamGenerateOrderSuggestions)
	protected.POST("/ai/orders/skills", d.aiOrderHandler.GenerateOrderSkills)
	protected.POST("/ai/orders/skills/stream", d.aiOrderHandler.StreamGenerateOrderSkills)
	protected.POST("/ai/orders/budget", d.aiOrderHandler.GenerateOrderBudget)
	protected.POST("/ai/orders/budget/stream", d.aiOrderHandler.StreamGenerateOrderBudget)
	protected.POST("/ai/welcome-message", d.aiOrderHandler.GenerateWelcomeMessage)
	protected.POST("/ai/welcome-message/stream", d.aiOrderHandler.StreamGenerateWelcomeMessage)
	protected.POST("/ai/orders/:id/proposal", middleware.UUIDValidator("id"), d.aiOrderHandler.GenerateProposal)
	protected.POST("/ai/orders/:id/proposal/stream", middleware.UUIDValidator("id"), d.aiOrderHandler.StreamGenerateProposal)
	protected.GET("/ai/orders/:id/proposals/feedback", middleware.UUIDValidator("id"), d.aiOrderHandler.GetProposalFeedback)
	protected.GET("/ai/orders/:id/proposals/feedback/stream", middleware.UUIDValidator("id"), d.aiOrderHandler.StreamProposalFeedback)
	protected.POST("/ai/orders/improve", d.aiOrderHandler.ImproveOrderDescription)
	protected.POST("/ai/orders/improve/stream", d.aiOrderHandler.StreamImproveOrderDescription)
	protected.POST("/ai/orders/:id/regenerate-summary", middleware.UUIDValidator("id"), d.aiOrderHandler.RegenerateOrderSummary)
	protected.POST("/ai/orders/:id/regenerate-summary/stream", middleware.UUIDValidator("id"), d.aiOrderHandler.StreamRegenerateOrderSummary)
	protected.GET("/ai/conversations/:conversationId/summary", middleware.UUIDValidator("conversationId"), d.aiOrderHandler.SummarizeConversation)
	protected.GET("/ai/conversations/:conversationId/summary/stream", middleware.UUIDValidator("conversationId"), d.aiOrderHandler.StreamSummarizeConversation)
	protected.GET("/ai/orders/recommended", d.aiOrderHandler.RecommendRelevantOrders)
	protected.GET("/ai/orders/recommended/stream", d.aiOrderHandler.StreamRecommendRelevantOrders)
	protected.GET("/ai/orders/:id/price-timeline", middleware.UUIDValidator("id"), d.aiOrderHandler.RecommendPriceAndTimeline)
	protected.GET("/ai/orders/:id/price-timeline/stream", middleware.UUIDValidator("id"), d.aiOrderHandler.StreamRecommendPriceAndTimeline)
	protected.GET("/ai/orders/:id/quality", middleware.UUIDValidator("id"), d.aiOrderHandler.EvaluateOrderQuality)
	protected.GET("/ai/orders/:id/quality/stream", middleware.UUIDValidator("id"), d.aiOrderHandler.StreamEvaluateOrderQuality)
	protected.GET("/ai/orders/:id/suitable-freelancers", middleware.UUIDValidator("id"), d.aiOrderHandler.FindSuitableFreelancers)
	protected.GET("/ai/orders/:id/suitable-freelancers/stream", middleware.UUIDValidator("id"), d.aiOrderHandler.StreamFindSuitableFreelancers)
	protected.POST("/ai/assistant", d.aiOrderHandler.AIChatAssistant)
	protected.POST("/ai/assistant/stream", d.aiOrderHandler.StreamAIChatAssistant)
	protected.POST("/ai/profile/improve", d.aiOrderHandler.ImproveProfile)
	protected.POST("/ai/profile/improve/stream", d.aiOrderHandler.StreamImproveProfile)
	protected.POST("/ai/portfolio/improve", d.aiOrderHandler.ImprovePortfolioItem)
	protected.POST("/ai/portfolio/improve/stream", d.aiOrderHandler.StreamImprovePortfolioItem)
}

func registerProtectedFeatureRoutes(protected *gin.RouterGroup, d routeDeps) {
	protected.GET("/portfolio", d.newPortfolioHandler.ListItems)
	protected.POST("/portfolio", d.newPortfolioHandler.CreateItem)
	protected.GET("/portfolio/:id", middleware.UUIDValidator("id"), d.newPortfolioHandler.GetItem)
	protected.PUT("/portfolio/:id", middleware.UUIDValidator("id"), d.newPortfolioHandler.UpdateItem)
	protected.DELETE("/portfolio/:id", middleware.UUIDValidator("id"), d.newPortfolioHandler.DeleteItem)

	protected.POST("/media/photos", d.mediaHandler.UploadPhoto)
	protected.DELETE("/media/:id", middleware.UUIDValidator("id"), d.mediaHandler.DeleteMedia)

	protected.GET("/payments/balance", d.newPaymentHandler.GetBalance)
	protected.POST("/payments/deposit", d.newPaymentHandler.Deposit)
	protected.POST("/payments/escrow", d.newPaymentHandler.CreateEscrow)
	protected.GET("/payments/escrow/:orderId", middleware.UUIDValidator("orderId"), d.newPaymentHandler.GetEscrow)
	protected.POST("/payments/escrow/:orderId/release", middleware.UUIDValidator("orderId"), d.newPaymentHandler.ReleaseEscrow)
	protected.POST("/payments/escrow/:orderId/refund", middleware.UUIDValidator("orderId"), d.newPaymentHandler.RefundEscrow)
	protected.GET("/payments/transactions", d.newPaymentHandler.ListTransactions)

	if d.withdrawalHandler != nil {
		protected.POST("/withdrawals", d.withdrawalHandler.CreateWithdrawal)
		protected.GET("/withdrawals", d.withdrawalHandler.ListWithdrawals)
	}

	protected.POST("/orders/:id/reviews", middleware.UUIDValidator("id"), d.newReviewHandler.CreateReview)
	protected.GET("/orders/:id/reviews", middleware.UUIDValidator("id"), d.newReviewHandler.ListOrderReviews)
	protected.GET("/orders/:id/can-review", middleware.UUIDValidator("id"), d.newReviewHandler.CanLeaveReview)

	if d.disputeHandler != nil {
		protected.POST("/orders/:id/dispute", middleware.UUIDValidator("id"), d.disputeHandler.CreateDispute)
		protected.GET("/orders/:id/dispute", middleware.UUIDValidator("id"), d.disputeHandler.GetDispute)
		protected.GET("/disputes", d.disputeHandler.ListMyDisputes)
	}

	if d.favoriteHandler != nil {
		protected.POST("/favorites", d.favoriteHandler.AddFavorite)
		protected.GET("/favorites", d.favoriteHandler.ListFavorites)
		protected.GET("/favorites/:type/:id", d.favoriteHandler.CheckFavorite)
		protected.DELETE("/favorites/:type/:id", d.favoriteHandler.RemoveFavorite)
	}

	if d.reportHandler != nil {
		protected.POST("/reports", d.reportHandler.CreateReport)
		protected.GET("/reports", d.reportHandler.ListMyReports)
	}

	if d.verificationHandler != nil {
		protected.POST("/verification/email/send", d.verificationHandler.SendEmailCode)
		protected.POST("/verification/phone/send", d.verificationHandler.SendPhoneCode)
		protected.POST("/verification/verify", d.verificationHandler.VerifyCode)
		protected.GET("/verification/status", d.verificationHandler.GetStatus)
	}

	if d.proposalTemplateHandler != nil {
		protected.POST("/proposal-templates", d.proposalTemplateHandler.CreateTemplate)
		protected.GET("/proposal-templates", d.proposalTemplateHandler.ListTemplates)
		protected.PUT("/proposal-templates/:id", middleware.UUIDValidator("id"), d.proposalTemplateHandler.UpdateTemplate)
		protected.DELETE("/proposal-templates/:id", middleware.UUIDValidator("id"), d.proposalTemplateHandler.DeleteTemplate)
	}
}
