package main

import (
	"github.com/ignatzorin/freelance-backend/internal/config"
	"github.com/ignatzorin/freelance-backend/internal/infrastructure/security"
	newHandler "github.com/ignatzorin/freelance-backend/internal/interface/http/handler"
	convUC "github.com/ignatzorin/freelance-backend/internal/usecase/conversation"
	notificationUC "github.com/ignatzorin/freelance-backend/internal/usecase/notification"
	orderUC "github.com/ignatzorin/freelance-backend/internal/usecase/order"
	paymentUC "github.com/ignatzorin/freelance-backend/internal/usecase/payment"
	portfolioUC "github.com/ignatzorin/freelance-backend/internal/usecase/portfolio"
	proposalUC "github.com/ignatzorin/freelance-backend/internal/usecase/proposal"
	reviewUC "github.com/ignatzorin/freelance-backend/internal/usecase/review"
	userUC "github.com/ignatzorin/freelance-backend/internal/usecase/user"
)

func buildCleanStack(cfg *config.Config, repos repoBundle) cleanHandlersBundle {
	tokenManager := security.NewTokenManager(cfg.JWTSecret, cfg.RefreshSecret, cfg.AccessTokenTTL, cfg.RefreshTokenTTL)

	return cleanHandlersBundle{
		tokenManager:           tokenManager,
		newOrderHandler:        buildCleanOrderHandler(repos),
		newProposalHandler:     buildCleanProposalHandler(repos),
		newConvHandler:         buildCleanConversationHandler(repos),
		newUserHandler:         buildCleanUserHandler(cfg, repos, tokenManager),
		newPaymentHandler:      buildCleanPaymentHandler(cfg, repos),
		newReviewHandler:       buildCleanReviewHandler(repos),
		newNotificationHandler: buildCleanNotificationHandler(repos),
		newPortfolioHandler:    buildCleanPortfolioHandler(repos),
		settingsHandler:        newHandler.NewSettingsHandler(repos.db),
		searchHandler:          newHandler.NewSearchHandler(repos.db),
		feedHandler:            newHandler.NewFeedHandler(repos.db),
		serviceMarketHandler:   newHandler.NewServiceMarketHandler(repos.db),
		readReceiptHandler:     newHandler.NewReadReceiptHandler(repos.db),
	}
}

func buildCleanOrderHandler(repos repoBundle) *newHandler.OrderHandler {
	createOrderUC := orderUC.NewCreateOrderUseCase(repos.newOrderRepo)
	updateOrderUC := orderUC.NewUpdateOrderUseCase(repos.newOrderRepo)
	getOrderUC := orderUC.NewGetOrderUseCase(repos.newOrderRepo)
	listOrdersUC := orderUC.NewListOrdersUseCase(repos.newOrderRepo)
	deleteOrderUC := orderUC.NewDeleteOrderUseCase(repos.newOrderRepo)
	publishOrderUC := orderUC.NewPublishOrderUseCase(repos.newOrderRepo)
	cancelOrderUC := orderUC.NewCancelOrderUseCase(repos.newOrderRepo)
	completeOrderUC := orderUC.NewCompleteOrderUseCase(repos.newOrderRepo)
	listMyOrdersUC := orderUC.NewListMyOrdersUseCase(repos.newOrderRepo)

	return newHandler.NewOrderHandlerFull(
		createOrderUC, updateOrderUC, getOrderUC, listOrdersUC, deleteOrderUC,
		publishOrderUC, cancelOrderUC, completeOrderUC, listMyOrdersUC,
	)
}

func buildCleanProposalHandler(repos repoBundle) *newHandler.ProposalHandler {
	createProposalUC := proposalUC.NewCreateProposalUseCase(repos.newProposalRepo, repos.newOrderRepo)
	updateProposalStatusUC := proposalUC.NewUpdateProposalStatusUseCase(repos.newProposalRepo, repos.newOrderRepo)
	getProposalUC := proposalUC.NewGetProposalUseCase(repos.newProposalRepo)
	listProposalsUC := proposalUC.NewListProposalsUseCase(repos.newProposalRepo)
	listMyProposalsUC := proposalUC.NewListMyProposalsUseCase(repos.newProposalRepo)
	getMyProposalForOrderUC := proposalUC.NewGetMyProposalForOrderUseCase(repos.newProposalRepo)

	return newHandler.NewProposalHandler(createProposalUC, updateProposalStatusUC, getProposalUC, listProposalsUC, listMyProposalsUC, getMyProposalForOrderUC)
}

func buildCleanConversationHandler(repos repoBundle) *newHandler.ConversationHandler {
	getOrCreateConvUC := convUC.NewGetOrCreateConversationUseCase(repos.newConvRepo, repos.newOrderRepo)
	getOrderChatUC := convUC.NewGetOrderChatUseCase(repos.newConvRepo, repos.newOrderRepo)
	listMyConvsUC := convUC.NewListMyConversationsUseCase(repos.newConvRepo)
	sendMessageUC := convUC.NewSendMessageUseCase(repos.newConvRepo, repos.newMsgRepo)
	listMessagesUC := convUC.NewListMessagesUseCase(repos.newConvRepo, repos.newMsgRepo)
	updateMessageUC := convUC.NewUpdateMessageUseCase(repos.newMsgRepo)
	deleteMessageUC := convUC.NewDeleteMessageUseCase(repos.newMsgRepo)
	addReactionUC := convUC.NewAddReactionUseCase(repos.newMsgRepo)
	removeReactionUC := convUC.NewRemoveReactionUseCase(repos.newMsgRepo)

	return newHandler.NewConversationHandler(getOrCreateConvUC, getOrderChatUC, listMyConvsUC, sendMessageUC, listMessagesUC, updateMessageUC, deleteMessageUC, addReactionUC, removeReactionUC, repos.newMsgRepo, repos.newOrderRepo, repos.newUserRepo)
}

func buildCleanUserHandler(cfg *config.Config, repos repoBundle, tokenManager *security.TokenManager) *newHandler.UserHandler {
	registerUserUC := userUC.NewRegisterUserUseCase(repos.newUserRepo, tokenManager)
	loginUserUC := userUC.NewLoginUserUseCase(repos.newUserRepo, tokenManager)
	getProfileUC := userUC.NewGetProfileUseCase(repos.newUserRepo)
	updateProfileUC := userUC.NewUpdateProfileUseCase(repos.newUserRepo)
	refreshSessionUC := userUC.NewRefreshSessionUseCase(repos.newUserRepo, tokenManager)
	listSessionsUC := userUC.NewListSessionsUseCase(repos.newUserRepo)
	deleteSessionUC := userUC.NewDeleteSessionUseCase(repos.newUserRepo)
	deleteOtherSessionsUC := userUC.NewDeleteOtherSessionsUseCase(repos.newUserRepo)
	updateRoleUC := userUC.NewUpdateRoleUseCase(repos.newUserRepo)

	return newHandler.NewUserHandler(
		registerUserUC,
		loginUserUC,
		getProfileUC,
		updateProfileUC,
		refreshSessionUC,
		listSessionsUC,
		deleteSessionUC,
		deleteOtherSessionsUC,
		updateRoleUC,
		cfg.Env != "production",
	)
}

func buildCleanPaymentHandler(cfg *config.Config, repos repoBundle) *newHandler.PaymentHandler {
	getBalanceUC := paymentUC.NewGetBalanceUseCase(repos.newPaymentRepo)
	depositUC := paymentUC.NewDepositUseCase(repos.newPaymentRepo)
	createEscrowUC := paymentUC.NewCreateEscrowUseCase(repos.newPaymentRepo)
	releaseEscrowUC := paymentUC.NewReleaseEscrowUseCase(repos.newPaymentRepo, cfg.EscrowFeeRate)
	refundEscrowUC := paymentUC.NewRefundEscrowUseCase(repos.newPaymentRepo)
	getEscrowUC := paymentUC.NewGetEscrowByOrderUseCase(repos.newPaymentRepo)
	listTransactionsUC := paymentUC.NewListTransactionsUseCase(repos.newPaymentRepo)

	return newHandler.NewPaymentHandler(getBalanceUC, depositUC, createEscrowUC, releaseEscrowUC, refundEscrowUC, getEscrowUC, listTransactionsUC)
}

func buildCleanReviewHandler(repos repoBundle) *newHandler.ReviewHandler {
	createReviewUC := reviewUC.NewCreateReviewUseCase(repos.newReviewRepo)
	listReviewsUC := reviewUC.NewListReviewsUseCase(repos.newReviewRepo)
	listOrderReviewsUC := reviewUC.NewListOrderReviewsUseCase(repos.newReviewRepo)
	canLeaveReviewUC := reviewUC.NewCanLeaveReviewUseCase(repos.newReviewRepo, repos.newOrderRepo)

	return newHandler.NewReviewHandler(createReviewUC, listReviewsUC, listOrderReviewsUC, canLeaveReviewUC)
}

func buildCleanNotificationHandler(repos repoBundle) *newHandler.NotificationHandler {
	listNotificationsUC := notificationUC.NewListNotificationsUseCase(repos.newNotificationRepo)
	getNotificationUC := notificationUC.NewGetNotificationUseCase(repos.newNotificationRepo)
	countUnreadNotificationsUC := notificationUC.NewCountUnreadNotificationsUseCase(repos.newNotificationRepo)
	markReadUC := notificationUC.NewMarkReadUseCase(repos.newNotificationRepo)
	markAllReadUC := notificationUC.NewMarkAllReadUseCase(repos.newNotificationRepo)
	deleteNotificationUC := notificationUC.NewDeleteNotificationUseCase(repos.newNotificationRepo)

	return newHandler.NewNotificationHandler(listNotificationsUC, getNotificationUC, countUnreadNotificationsUC, markReadUC, markAllReadUC, deleteNotificationUC)
}

func buildCleanPortfolioHandler(repos repoBundle) *newHandler.PortfolioHandler {
	createPortfolioItemUC := portfolioUC.NewCreatePortfolioItemUseCase(repos.newPortfolioRepo)
	listPortfolioItemsUC := portfolioUC.NewListPortfolioItemsUseCase(repos.newPortfolioRepo)
	deletePortfolioItemUC := portfolioUC.NewDeletePortfolioItemUseCase(repos.newPortfolioRepo)
	getPortfolioItemUC := portfolioUC.NewGetPortfolioItemUseCase(repos.newPortfolioRepo)
	updatePortfolioItemUC := portfolioUC.NewUpdatePortfolioItemUseCase(repos.newPortfolioRepo)

	return newHandler.NewPortfolioHandler(createPortfolioItemUC, listPortfolioItemsUC, deletePortfolioItemUC, getPortfolioItemUC, updatePortfolioItemUC)
}
