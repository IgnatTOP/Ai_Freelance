package service

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/ignatzorin/freelance-backend/internal/models"
	"github.com/ignatzorin/freelance-backend/internal/repository"
)

type OrderRepositoryOrdersFacet interface {
	Create(ctx context.Context, order *models.Order, requirements []models.OrderRequirement, attachmentIDs []uuid.UUID) error
	List(ctx context.Context, params repository.ListFilterParams) (*repository.ListResult, error)
	ListMyOrders(ctx context.Context, userID uuid.UUID) ([]models.Order, []models.Order, error)
	Update(ctx context.Context, order *models.Order, requirements []models.OrderRequirement, attachmentIDs []uuid.UUID) error
	Delete(ctx context.Context, id uuid.UUID, clientID uuid.UUID) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.Order, error)
	GetByIDWithDetails(ctx context.Context, id uuid.UUID) (*models.Order, []models.OrderRequirement, []models.OrderAttachment, error)
	ListRequirements(ctx context.Context, orderID uuid.UUID) ([]models.OrderRequirement, error)
	ListAttachments(ctx context.Context, orderID uuid.UUID) ([]models.OrderAttachment, error)
}

type OrderRepositoryProposalsFacet interface {
	GetProposalByID(ctx context.Context, id uuid.UUID) (*models.Proposal, error)
	UpdateProposalStatus(ctx context.Context, id uuid.UUID, status string) (*models.Proposal, error)
	CreateProposal(ctx context.Context, proposal *models.Proposal) error
	ListProposals(ctx context.Context, orderID uuid.UUID) ([]models.Proposal, error)
	GetMyProposalForOrder(ctx context.Context, orderID, freelancerID uuid.UUID) (*models.Proposal, error)
	ListMyProposals(ctx context.Context, freelancerID uuid.UUID) ([]models.Proposal, error)
}

type OrderRepositoryConversationsFacet interface {
	CreateConversation(ctx context.Context, conv *models.Conversation) error
	GetConversationByParticipants(ctx context.Context, orderID uuid.UUID, clientID, freelancerID uuid.UUID) (*models.Conversation, error)
	GetConversationByID(ctx context.Context, id uuid.UUID) (*models.Conversation, error)
	ListMyConversations(ctx context.Context, userID uuid.UUID) ([]models.Conversation, error)
}

type OrderRepositoryMessagesFacet interface {
	AddMessage(ctx context.Context, msg *models.Message) error
	GetLastMessageForConversation(ctx context.Context, conversationID uuid.UUID) (*models.Message, error)
	ListMessages(ctx context.Context, conversationID uuid.UUID, limit, offset int) ([]models.Message, error)
	GetMessageByID(ctx context.Context, messageID uuid.UUID) (*models.Message, error)
	UpdateMessage(ctx context.Context, messageID uuid.UUID, newContent string) error
	DeleteMessage(ctx context.Context, messageID uuid.UUID) error
	AddMessageAttachments(ctx context.Context, messageID uuid.UUID, mediaIDs []uuid.UUID) error
	GetMessageAttachments(ctx context.Context, messageID uuid.UUID) ([]models.MessageAttachment, error)
	AddMessageReaction(ctx context.Context, messageID, userID uuid.UUID, emoji string) (*models.MessageReaction, error)
	RemoveMessageReaction(ctx context.Context, messageID, userID uuid.UUID) error
	GetMessageReactions(ctx context.Context, messageID uuid.UUID) ([]models.MessageReaction, error)
	CountUnreadMessages(ctx context.Context, conversationID, userID uuid.UUID) (int, error)
}

type OrderRepositoryAICacheFacet interface {
	UpdateAISummary(ctx context.Context, orderID uuid.UUID, clientID uuid.UUID, summary string) error
	UpdateProposalAIFeedback(ctx context.Context, proposalID uuid.UUID, feedback string) error
	UpdateBestRecommendation(ctx context.Context, orderID uuid.UUID, proposalID *uuid.UUID, justification string) error
	MarkAIAnalysisUpdated(ctx context.Context, orderID uuid.UUID) error
	GetProposalsLastUpdateTime(ctx context.Context, orderID uuid.UUID) (*time.Time, error)
}

// OrderRepository описывает взаимодействие сервиса с хранилищем заказов.
// Пока сохраняем общий контракт для совместимости, но внутри он разложен на фасеты.
type OrderRepository interface {
	OrderRepositoryOrdersFacet
	OrderRepositoryProposalsFacet
	OrderRepositoryConversationsFacet
	OrderRepositoryMessagesFacet
	OrderRepositoryAICacheFacet
}

// ProfileRepository описывает взаимодействие с профилями пользователей.
type ProfileRepository interface {
	GetProfile(ctx context.Context, userID uuid.UUID) (*models.Profile, error)
}

// PortfolioRepositoryForAI описывает минимальный контракт для получения работ портфолио.
type PortfolioRepositoryForAI interface {
	List(ctx context.Context, userID uuid.UUID) ([]models.PortfolioItem, error)
}

// UserRepositoryForAI описывает минимальный контракт для получения пользователей.
type UserRepositoryForAI interface {
	ListFreelancers(ctx context.Context, limit, offset int) ([]*models.User, error)
	CountFreelancers(ctx context.Context) (int, error)
}

type AIHelperOrderSummaryFacet interface {
	SummarizeOrder(ctx context.Context, title, description string) (string, error)
	StreamSummarizeOrder(ctx context.Context, title, description string, onDelta func(chunk string) error) error
	ImproveOrderDescription(ctx context.Context, title, description string) (string, error)
	StreamImproveOrderDescription(ctx context.Context, title, description string, onDelta func(chunk string) error) error
	GenerateOrderDescription(ctx context.Context, title, briefDescription string, skills []string) (string, error)
	StreamGenerateOrderDescription(ctx context.Context, title, briefDescription string, skills []string, onDelta func(chunk string) error) error
	GenerateOrderSuggestions(ctx context.Context, title, description string) (map[string]interface{}, error)
	StreamGenerateOrderSuggestions(ctx context.Context, title, description string, onDelta func(chunk string) error) error
	GenerateOrderSkills(ctx context.Context, title, description string) ([]string, error)
	StreamGenerateOrderSkills(ctx context.Context, title, description string, onDelta func(chunk string) error) error
	GenerateOrderBudget(ctx context.Context, title, description string) (map[string]interface{}, error)
	StreamGenerateOrderBudget(ctx context.Context, title, description string, onDelta func(chunk string) error) error
	GenerateWelcomeMessage(ctx context.Context, userRole string) (string, error)
	StreamGenerateWelcomeMessage(ctx context.Context, userRole string, onDelta func(chunk string) error) error
	EvaluateOrderQuality(ctx context.Context, order *models.Order, requirements []models.OrderRequirement) (*models.OrderQualityEvaluation, error)
	StreamEvaluateOrderQuality(ctx context.Context, order *models.Order, requirements []models.OrderRequirement, onDelta func(chunk string) error, onComplete func(evaluation *models.OrderQualityEvaluation) error) error
}

type AIHelperProposalFacet interface {
	ProposalFeedback(ctx context.Context, order *models.Order, coverLetter string) (string, error)
	StreamProposalFeedback(ctx context.Context, order *models.Order, coverLetter string, onDelta func(chunk string) error) error
	ProposalAnalysisForClient(ctx context.Context, order *models.Order, proposal *models.Proposal, freelancerProfile *models.Profile, requirements []models.OrderRequirement, portfolioItems interface{}, otherProposals []*models.Proposal) (string, error)
	RecommendBestProposal(ctx context.Context, order *models.Order, proposals []*models.Proposal, freelancerProfiles map[uuid.UUID]*models.Profile, requirements []models.OrderRequirement) (*uuid.UUID, string, error)
	GenerateProposal(ctx context.Context, order *models.Order, requirements []models.OrderRequirement, userSkills []string, userExperience string, portfolioItems interface{}) (string, error)
	StreamGenerateProposal(ctx context.Context, order *models.Order, requirements []models.OrderRequirement, userSkills []string, userExperience string, portfolioItems interface{}, onDelta func(chunk string) error) error
	RecommendPriceAndTimeline(ctx context.Context, order *models.Order, requirements []models.OrderRequirement, freelancerProfile *models.Profile, otherProposals []*models.Proposal) (*models.PriceTimelineRecommendation, error)
	StreamRecommendPriceAndTimeline(ctx context.Context, order *models.Order, requirements []models.OrderRequirement, freelancerProfile *models.Profile, otherProposals []*models.Proposal, onDelta func(chunk string) error, onComplete func(recommendation *models.PriceTimelineRecommendation) error) error
}

type AIHelperConversationFacet interface {
	SummarizeConversation(ctx context.Context, messages []models.Message, orderTitle string) (*models.ChatSummary, error)
	StreamSummarizeConversation(ctx context.Context, messages []models.Message, orderTitle string, onDelta func(chunk string) error) error
	AIChatAssistant(ctx context.Context, userMessage string, userRole string, contextData map[string]interface{}) (string, error)
	StreamAIChatAssistant(ctx context.Context, userMessage string, userRole string, contextData map[string]interface{}, onDelta func(chunk string) error) error
}

type AIHelperRecommendationsFacet interface {
	RecommendRelevantOrders(ctx context.Context, freelancerProfile *models.Profile, portfolioItems []models.PortfolioItemForAI, orders []models.Order) ([]models.RecommendedOrder, string, error)
	StreamRecommendRelevantOrders(ctx context.Context, freelancerProfile *models.Profile, portfolioItems []models.PortfolioItemForAI, orders []models.Order, onDelta func(chunk string) error, onComplete func(recommendedOrders []models.RecommendedOrder, generalExplanation string) error) error
	FindSuitableFreelancers(ctx context.Context, order *models.Order, requirements []models.OrderRequirement, freelancerProfiles []*models.Profile, freelancerPortfolios map[uuid.UUID][]models.PortfolioItemForAI) ([]models.SuitableFreelancer, error)
	StreamFindSuitableFreelancers(ctx context.Context, order *models.Order, requirements []models.OrderRequirement, freelancerProfiles []*models.Profile, freelancerPortfolios map[uuid.UUID][]models.PortfolioItemForAI, onDelta func(chunk string) error, onComplete func(data []models.SuitableFreelancer) error) error
}

type AIHelperProfileFacet interface {
	ImproveProfile(ctx context.Context, currentBio string, skills []string, experienceLevel string) (string, error)
	StreamImproveProfile(ctx context.Context, currentBio string, skills []string, experienceLevel string, onDelta func(chunk string) error) error
	ImprovePortfolioItem(ctx context.Context, title, description string, aiTags []string) (string, error)
	StreamImprovePortfolioItem(ctx context.Context, title, description string, aiTags []string, onDelta func(chunk string) error) error
}

// AIHelper описывает упрощённый контракт с AI подсистемой.
type AIHelper interface {
	AIHelperOrderSummaryFacet
	AIHelperProposalFacet
	AIHelperConversationFacet
	AIHelperRecommendationsFacet
	AIHelperProfileFacet
}

// WSNotifier интерфейс для отправки WebSocket уведомлений.
type WSNotifier interface {
	BroadcastToUser(userID uuid.UUID, event string, data interface{}) error
}

// PaymentRepositoryForOrders описывает контракт для работы с платежами в заказах.
type PaymentRepositoryForOrders interface {
	GetBalance(ctx context.Context, userID uuid.UUID) (*models.UserBalance, error)
	CreateEscrow(ctx context.Context, orderID, clientID, freelancerID uuid.UUID, amount float64) (*models.Escrow, error)
	ReleaseEscrow(ctx context.Context, orderID uuid.UUID) (*models.Escrow, error)
	RefundEscrow(ctx context.Context, orderID uuid.UUID) (*models.Escrow, error)
	GetEscrowByOrderID(ctx context.Context, orderID uuid.UUID) (*models.Escrow, error)
}
