package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/ignatzorin/freelance-backend/internal/logger"
	"github.com/ignatzorin/freelance-backend/internal/models"
	"github.com/ignatzorin/freelance-backend/internal/repository"
)

// OrderService содержит бизнес-логику работы с заказами.
type OrderService struct {
	repo              OrderRepository
	repoOrders        OrderRepositoryOrdersFacet
	repoProposals     OrderRepositoryProposalsFacet
	repoConversations OrderRepositoryConversationsFacet
	repoMessages      OrderRepositoryMessagesFacet
	repoAICache       OrderRepositoryAICacheFacet
	profile           ProfileRepository
	portfolio         PortfolioRepositoryForAI
	users             UserRepositoryForAI
	ai                AIHelper
	aiOrderSummary    AIHelperOrderSummaryFacet
	aiProposal        AIHelperProposalFacet
	aiConversation    AIHelperConversationFacet
	aiRecommendations AIHelperRecommendationsFacet
	aiProfile         AIHelperProfileFacet
	hub               WSNotifier
	payment           PaymentRepositoryForOrders
}

// NewOrderService создаёт новый сервис заказов.
func NewOrderService(repo OrderRepository, profile ProfileRepository, portfolio PortfolioRepositoryForAI, users UserRepositoryForAI, ai AIHelper) *OrderService {
	return &OrderService{
		repo:              repo,
		repoOrders:        repo,
		repoProposals:     repo,
		repoConversations: repo,
		repoMessages:      repo,
		repoAICache:       repo,
		profile:           profile,
		portfolio:         portfolio,
		users:             users,
		ai:                ai,
		aiOrderSummary:    ai,
		aiProposal:        ai,
		aiConversation:    ai,
		aiRecommendations: ai,
		aiProfile:         ai,
	}
}

// SetPaymentRepository устанавливает репозиторий платежей.
func (s *OrderService) SetPaymentRepository(payment PaymentRepositoryForOrders) {
	s.payment = payment
}

// SetHub устанавливает WebSocket hub для отправки уведомлений.
func (s *OrderService) SetHub(hub WSNotifier) {
	s.hub = hub
}

// getStringPtrValue безопасно извлекает значение из указателя на строку.
func getStringPtrValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// CreateOrder создаёт заказ и возвращает его.
func (s *OrderService) CreateOrder(ctx context.Context, in CreateOrderInput) (*models.Order, error) {
	// Валидация входных данных
	if in.Title == "" {
		return nil, fmt.Errorf("order service: заголовок заказа не может быть пустым")
	}
	if in.Description == "" {
		return nil, fmt.Errorf("order service: описание заказа не может быть пустым")
	}
	if in.BudgetMin != nil && in.BudgetMax != nil && *in.BudgetMin > *in.BudgetMax {
		return nil, fmt.Errorf("order service: минимальный бюджет не может быть больше максимального")
	}
	if in.DeadlineAt != nil && in.DeadlineAt.Before(time.Now()) {
		return nil, fmt.Errorf("order service: дедлайн не может быть в прошлом")
	}

	order := &models.Order{
		ClientID:    in.ClientID,
		Title:       in.Title,
		Description: in.Description,
		Status:      models.OrderStatusPublished,
		BudgetMin:   in.BudgetMin,
		BudgetMax:   in.BudgetMax,
		DeadlineAt:  in.DeadlineAt,
	}

	if s.aiOrderSummary != nil {
		if summary, err := s.aiOrderSummary.SummarizeOrder(ctx, in.Title, in.Description); err == nil {
			order.AISummary = &summary
		}
	}

	if err := s.repoOrders.Create(ctx, order, in.Requirements, in.AttachmentIDs); err != nil {
		return nil, err
	}

	return order, nil
}

// ListOrders возвращает список заказов с фильтрацией и поиском.
func (s *OrderService) ListOrders(ctx context.Context, params repository.ListFilterParams) (*repository.ListResult, error) {
	if params.Limit <= 0 || params.Limit > 100 {
		params.Limit = 20
	}
	if params.Offset < 0 {
		params.Offset = 0
	}

	return s.repoOrders.List(ctx, params)
}

// UpdateOrder обновляет существующий заказ.
func (s *OrderService) UpdateOrder(ctx context.Context, in UpdateOrderInput) (*models.Order, error) {
	existing, err := s.repoOrders.GetByID(ctx, in.OrderID)
	if err != nil {
		return nil, err
	}

	if existing.ClientID != in.ClientID {
		return nil, fmt.Errorf("order service: у вас нет прав на изменение заказа")
	}

	// Валидация статуса
	if in.Status != "" {
		if _, ok := models.ValidOrderStatuses[in.Status]; !ok {
			return nil, fmt.Errorf("order service: некорректный статус заказа")
		}
		// Проверка на возможность изменения статуса
		if existing.Status == models.OrderStatusCompleted && in.Status != models.OrderStatusCompleted {
			return nil, fmt.Errorf("order service: нельзя изменить статус завершённого заказа")
		}
		if existing.Status == models.OrderStatusCancelled && in.Status != models.OrderStatusCancelled {
			return nil, fmt.Errorf("order service: нельзя изменить статус отменённого заказа")
		}
	}

	// Валидация бюджета
	if in.BudgetMin != nil && in.BudgetMax != nil && *in.BudgetMin > *in.BudgetMax {
		return nil, fmt.Errorf("order service: минимальный бюджет не может быть больше максимального")
	}

	// Валидация дедлайна
	if in.DeadlineAt != nil && in.DeadlineAt.Before(time.Now()) {
		return nil, fmt.Errorf("order service: дедлайн не может быть в прошлом")
	}

	// Валидация входных данных
	if in.Title == "" {
		return nil, fmt.Errorf("order service: заголовок заказа не может быть пустым")
	}
	if in.Description == "" {
		return nil, fmt.Errorf("order service: описание заказа не может быть пустым")
	}

	needsResummary := existing.Title != in.Title || existing.Description != in.Description

	existing.Title = in.Title
	existing.Description = in.Description
	existing.BudgetMin = in.BudgetMin
	existing.BudgetMax = in.BudgetMax
	if in.Status != "" {
		existing.Status = in.Status
	}
	existing.DeadlineAt = in.DeadlineAt

	// Обработка escrow при изменении статуса
	if in.Status != "" && s.payment != nil {
		if in.Status == models.OrderStatusCompleted {
			// Освобождаем средства в пользу фрилансера
			if _, err := s.payment.ReleaseEscrow(ctx, existing.ID); err != nil {
				// Логируем ошибку, но не блокируем завершение заказа если escrow не найден
				if logger.Log != nil {
					logger.Log.WithFields(map[string]interface{}{
						"order_id": existing.ID,
						"error":    err.Error(),
					}).Warn("order service: не удалось освободить escrow")
				}
			}
		} else if in.Status == models.OrderStatusCancelled {
			// Возвращаем средства заказчику
			if _, err := s.payment.RefundEscrow(ctx, existing.ID); err != nil {
				// Логируем ошибку, но не блокируем отмену заказа если escrow не найден
				if logger.Log != nil {
					logger.Log.WithFields(map[string]interface{}{
						"order_id": existing.ID,
						"error":    err.Error(),
					}).Warn("order service: не удалось вернуть escrow")
				}
			}
		}
	}

	if s.aiOrderSummary != nil && needsResummary {
		if summary, err := s.aiOrderSummary.SummarizeOrder(ctx, existing.Title, existing.Description); err == nil {
			existing.AISummary = &summary
		}
	}

	if err := s.repoOrders.Update(ctx, existing, in.Requirements, in.AttachmentIDs); err != nil {
		return nil, err
	}

	return existing, nil
}

// DeleteOrder удаляет заказ.
func (s *OrderService) DeleteOrder(ctx context.Context, orderID uuid.UUID, clientID uuid.UUID) error {
	// Проверяем, что заказ существует и принадлежит клиенту
	order, err := s.repoOrders.GetByID(ctx, orderID)
	if err != nil {
		return err
	}

	if order.ClientID != clientID {
		return fmt.Errorf("order service: у вас нет прав на удаление этого заказа")
	}

	// Проверяем, можно ли удалить заказ (не должен быть в статусе in_progress или completed)
	if order.Status == models.OrderStatusInProgress {
		return fmt.Errorf("order service: нельзя удалить заказ в процессе выполнения")
	}

	return s.repoOrders.Delete(ctx, orderID, clientID)
}
