package main

import (
	"github.com/jmoiron/sqlx"

	"github.com/ignatzorin/freelance-backend/internal/infrastructure/persistence"
	"github.com/ignatzorin/freelance-backend/internal/repository"
)

func buildRepos(dbConn *sqlx.DB) repoBundle {
	return repoBundle{
		db:                   dbConn,
		userRepo:             repository.NewUserRepository(dbConn),
		orderRepo:            repository.NewOrderRepository(dbConn),
		mediaRepo:            repository.NewMediaRepository(dbConn),
		notificationRepo:     repository.NewNotificationRepository(dbConn),
		portfolioRepo:        repository.NewPortfolioRepository(dbConn),
		paymentRepo:          repository.NewPaymentRepository(dbConn),
		reviewRepo:           repository.NewReviewRepository(dbConn),
		catalogRepo:          repository.NewCatalogRepository(dbConn),
		withdrawalRepo:       repository.NewWithdrawalRepository(dbConn),
		favoriteRepo:         repository.NewFavoriteRepository(dbConn),
		reportRepo:           repository.NewReportRepository(dbConn),
		disputeRepo:          repository.NewDisputeRepository(dbConn),
		verificationRepo:     repository.NewVerificationRepository(dbConn),
		proposalTemplateRepo: repository.NewProposalTemplateRepository(dbConn),
		newOrderRepo:         persistence.NewOrderRepositoryAdapter(dbConn),
		newProposalRepo:      persistence.NewProposalRepositoryAdapter(dbConn),
		newConvRepo:          persistence.NewConversationRepositoryAdapter(dbConn),
		newMsgRepo:           persistence.NewMessageRepositoryAdapter(dbConn),
		newUserRepo:          persistence.NewUserRepositoryAdapter(dbConn),
		newPaymentRepo:       persistence.NewPaymentRepositoryAdapter(dbConn),
		newReviewRepo:        persistence.NewReviewRepositoryAdapter(dbConn),
		newNotificationRepo:  persistence.NewNotificationRepositoryAdapter(dbConn),
		newPortfolioRepo:     persistence.NewPortfolioRepositoryAdapter(dbConn),
	}
}
