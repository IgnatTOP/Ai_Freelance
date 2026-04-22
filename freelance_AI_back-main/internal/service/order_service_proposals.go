package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/ignatzorin/freelance-backend/internal/models"
)

// CreateProposal создаёт отклик и может сформировать чат.
func (s *OrderService) CreateProposal(ctx context.Context, in ProposalInput) (*models.Proposal, error) {
	// Валидация входных данных
	if in.CoverLetter == "" {
		return nil, fmt.Errorf("order service: сопроводительное письмо не может быть пустым")
	}

	order, err := s.repoOrders.GetByID(ctx, in.OrderID)
	if err != nil {
		return nil, fmt.Errorf("order service: не найден заказ: %w", err)
	}

	// Проверка, что заказ доступен для предложений
	if order.Status != models.OrderStatusPublished {
		return nil, fmt.Errorf("order service: нельзя создать предложение для заказа со статусом %s", order.Status)
	}

	// Проверка, что фрилансер не является клиентом
	if order.ClientID == in.FreelancerID {
		return nil, fmt.Errorf("order service: нельзя создать предложение на свой заказ")
	}

	normalizedBudget, err := normalizeProposalBudget(order, in)
	if err != nil {
		return nil, err
	}

	// Проверка на дублирование предложений
	existingProposals, err := s.repoProposals.ListProposals(ctx, in.OrderID)
	if err == nil {
		for _, p := range existingProposals {
			if p.FreelancerID == in.FreelancerID && p.Status != models.ProposalStatusRejected {
				return nil, fmt.Errorf("order service: вы уже отправили предложение на этот заказ")
			}
		}
	}

	proposal := &models.Proposal{
		OrderID:        in.OrderID,
		FreelancerID:   in.FreelancerID,
		CoverLetter:    in.CoverLetter,
		ProposedAmount: in.Amount,
		ProposedBudget: &normalizedBudget,
		EstimatedDays:  in.EstimatedDays,
		Status:         models.ProposalStatusPending,
	}

	// Не генерируем feedback для исполнителя при создании отклика
	// Анализ для заказчика будет генерироваться при получении списка откликов

	if err := s.repoProposals.CreateProposal(ctx, proposal); err != nil {
		return nil, err
	}

	conv := &models.Conversation{
		OrderID:      &order.ID,
		ClientID:     order.ClientID,
		FreelancerID: in.FreelancerID,
	}

	// Пытаемся создать conversation, но не критично, если он уже существует
	if err := s.repoConversations.CreateConversation(ctx, conv); err != nil {
		// Если conversation уже существует, это не ошибка
		// Проверяем, существует ли conversation
		existingConv, checkErr := s.repoConversations.GetConversationByParticipants(ctx, order.ID, order.ClientID, in.FreelancerID)
		if checkErr != nil || existingConv == nil {
			// Если conversation не существует и не удалось создать, возвращаем ошибку
			return nil, fmt.Errorf("order service: не удалось создать диалог: %w", err)
		}
		// Conversation существует, продолжаем
	}

	return proposal, nil
}

func normalizeProposalBudget(order *models.Order, in ProposalInput) (float64, error) {
	var budget float64
	switch {
	case in.ProposedBudget != nil:
		budget = *in.ProposedBudget
	case in.Amount != nil:
		budget = *in.Amount
	default:
		return 0, fmt.Errorf("order service: необходимо указать сумму отклика")
	}

	if budget <= 0 {
		return 0, fmt.Errorf("order service: сумма отклика должна быть больше 0")
	}
	if budget > 100000000 {
		return 0, fmt.Errorf("order service: сумма отклика не может превышать 100000000")
	}

	var minBudget float64
	if order.BudgetMin != nil {
		minBudget = *order.BudgetMin
	}
	var maxBudget float64
	if order.BudgetMax != nil {
		maxBudget = *order.BudgetMax
	}

	if minBudget <= 0 || maxBudget <= 0 {
		return 0, fmt.Errorf("order service: у заказа не задан корректный диапазон бюджета")
	}
	if budget < minBudget || budget > maxBudget {
		return 0, fmt.Errorf("order service: предложенная сумма должна быть в диапазоне бюджета заказа")
	}

	return budget, nil
}

// BestRecommendation содержит рекомендацию лучшего исполнителя.
type BestRecommendation struct {
	ProposalID    *uuid.UUID `json:"proposal_id,omitempty"`
	Justification string     `json:"justification,omitempty"`
}

// ListProposalsResult содержит список откликов и рекомендацию лучшего.
type ListProposalsResult struct {
	Proposals          []models.Proposal   `json:"proposals"`
	BestRecommendation *BestRecommendation `json:"best_recommendation,omitempty"`
}

// ListProposals возвращает отклики по заказу.
// Если вызывается заказчиком, возвращает кэшированные AI анализы и запускает асинхронную регенерацию при необходимости.
func (s *OrderService) ListProposals(ctx context.Context, orderID uuid.UUID, clientID *uuid.UUID) (*ListProposalsResult, error) {
	proposals, err := s.repoProposals.ListProposals(ctx, orderID)
	if err != nil {
		return nil, err
	}

	result := &ListProposalsResult{
		Proposals: proposals,
	}

	// Если вызывается заказчиком и есть AI сервис
	if clientID != nil && s.aiProposal != nil && s.profile != nil && len(proposals) > 0 {
		order, err := s.repoOrders.GetByID(ctx, orderID)
		if err == nil && order != nil && order.ClientID == *clientID {
			// Используем кэшированные данные если они есть
			if order.BestRecommendationProposalID != nil && order.BestRecommendationJustification != nil {
				result.BestRecommendation = &BestRecommendation{
					ProposalID:    order.BestRecommendationProposalID,
					Justification: *order.BestRecommendationJustification,
				}
			}

			// Проверяем, нужно ли регенерировать анализ
			needsRegeneration := s.needsAIRegeneration(ctx, orderID, order)

			if needsRegeneration {
				// Запускаем асинхронную генерацию в фоне
				go func() {
					bgCtx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
					defer cancel()
					s.generateAIAnalysisAsync(bgCtx, orderID, *clientID, order, proposals)
				}()
			}
		}
	}

	return result, nil
}

// needsAIRegeneration проверяет, нужно ли регенерировать AI анализ.
func (s *OrderService) needsAIRegeneration(ctx context.Context, orderID uuid.UUID, order *models.Order) bool {
	// Если анализа еще не было, нужно сгенерировать
	if order.AIAnalysisUpdatedAt == nil {
		return true
	}

	// Проверяем, были ли изменения в откликах после последней генерации
	proposalsLastUpdate, err := s.repoAICache.GetProposalsLastUpdateTime(ctx, orderID)
	if err != nil || proposalsLastUpdate == nil {
		return true
	}

	// Если отклики обновлялись после генерации анализа, нужно регенерировать
	if proposalsLastUpdate.After(*order.AIAnalysisUpdatedAt) {
		return true
	}

	// Проверяем, был ли обновлен заказ после генерации анализа
	if order.UpdatedAt.After(*order.AIAnalysisUpdatedAt) {
		return true
	}

	return false
}

// generateAIAnalysisAsync генерирует AI анализ асинхронно в фоне.
func (s *OrderService) generateAIAnalysisAsync(ctx context.Context, orderID uuid.UUID, clientID uuid.UUID, order *models.Order, proposals []models.Proposal) {
	// Получаем требования заказа
	requirements, err := s.repoOrders.ListRequirements(ctx, orderID)
	if err != nil {
		requirements = []models.OrderRequirement{}
	}

	// Собираем профили всех исполнителей
	freelancerProfiles := make(map[uuid.UUID]*models.Profile)
	proposalPointers := make([]*models.Proposal, len(proposals))

	// Генерируем анализ для каждого отклика
	for i := range proposals {
		proposalPointers[i] = &proposals[i]

		// Получаем профиль исполнителя
		freelancerProfile, err := s.profile.GetProfile(ctx, proposals[i].FreelancerID)
		if err != nil || freelancerProfile == nil {
			// Если профиль не найден, создаём минимальный
			freelancerProfile = &models.Profile{
				UserID:          proposals[i].FreelancerID,
				DisplayName:     "Исполнитель",
				ExperienceLevel: "middle",
				Skills:          []string{},
			}
		}
		freelancerProfiles[proposals[i].FreelancerID] = freelancerProfile

		// Формируем список других откликов для сравнения
		otherProposals := make([]*models.Proposal, 0)
		for j := range proposals {
			if i != j {
				otherProposals = append(otherProposals, &proposals[j])
			}
		}

		// Готовим данные портфолио исполнителя для AI (если есть репозиторий)
		var portfolioForAI []models.PortfolioItemForAI
		if s.portfolio != nil {
			if items, err := s.portfolio.List(ctx, proposals[i].FreelancerID); err == nil {
				portfolioForAI = make([]models.PortfolioItemForAI, len(items))
				for idx, it := range items {
					var description string
					if it.Description != nil {
						description = *it.Description
					}
					portfolioForAI[idx] = models.PortfolioItemForAI{
						Title:       it.Title,
						Description: description,
						AITags:      it.AITags,
					}
				}
			}
		}

		// Всегда пересчитываем клиентский анализ при запуске регенерации.
		// Это защищает от кейсов, когда в ai_feedback уже лежит временный/старый текст.
		if analysis, err := s.aiProposal.ProposalAnalysisForClient(ctx, order, &proposals[i], freelancerProfile, requirements, portfolioForAI, otherProposals); err == nil && analysis != "" {
			// Сохраняем в кэш
			_ = s.repoAICache.UpdateProposalAIFeedback(ctx, proposals[i].ID, analysis)
		}
	}

	// Генерируем (или пересчитываем) рекомендацию лучшего исполнителя,
	// если есть хотя бы 2 отклика. Решение о необходимости регенерации
	// принимается выше в needsAIRegeneration по полю AIAnalysisUpdatedAt.
	if len(proposals) >= 2 {
		if bestProposalID, justification, err := s.aiProposal.RecommendBestProposal(ctx, order, proposalPointers, freelancerProfiles, requirements); err == nil && bestProposalID != nil {
			// Сохраняем в кэш
			_ = s.repoAICache.UpdateBestRecommendation(ctx, orderID, bestProposalID, justification)
		}
	}

	// Фиксируем факт завершения актуального прогона AI-анализа даже для 1 отклика.
	// Иначе needsAIRegeneration остаётся true и анализ перезапускается циклически.
	_ = s.repoAICache.MarkAIAnalysisUpdated(ctx, orderID)

	// Отправляем уведомление через WebSocket о завершении анализа.
	if s.hub != nil {
		_ = s.hub.BroadcastToUser(clientID, "proposal.ai_analysis_ready", map[string]interface{}{
			"order_id": orderID,
			"message":  "AI анализ откликов готов",
		})
	}
}

// GetMyProposalForOrder возвращает предложение пользователя для конкретного заказа.
func (s *OrderService) GetMyProposalForOrder(ctx context.Context, orderID, freelancerID uuid.UUID) (*models.Proposal, error) {
	return s.repoProposals.GetMyProposalForOrder(ctx, orderID, freelancerID)
}

// GetProposalFeedback возвращает рекомендации по улучшению отклика для исполнителя.
func (s *OrderService) GetProposalFeedback(ctx context.Context, orderID uuid.UUID, freelancerID uuid.UUID) (string, error) {
	if s.aiProposal == nil {
		return "", fmt.Errorf("order service: AI сервис недоступен")
	}

	order, err := s.repoOrders.GetByID(ctx, orderID)
	if err != nil {
		return "", err
	}

	proposal, err := s.repoProposals.GetMyProposalForOrder(ctx, orderID, freelancerID)
	if err != nil {
		return "", err
	}

	// Проверяем, что отклик принадлежит пользователю
	if proposal.FreelancerID != freelancerID {
		return "", fmt.Errorf("order service: у вас нет доступа к этому отклику")
	}

	feedback, err := s.aiProposal.ProposalFeedback(ctx, order, proposal.CoverLetter)
	if err != nil {
		return "", err
	}

	return feedback, nil
}

// StreamProposalFeedback возвращает рекомендации по улучшению отклика потоково.
// Используется для стриминга ответа AI в реальном времени.
func (s *OrderService) StreamProposalFeedback(
	ctx context.Context,
	orderID uuid.UUID,
	freelancerID uuid.UUID,
	onDelta func(chunk string) error,
) error {
	if s.aiProposal == nil {
		return fmt.Errorf("order service: AI сервис недоступен")
	}

	order, err := s.repoOrders.GetByID(ctx, orderID)
	if err != nil {
		return err
	}

	proposal, err := s.repoProposals.GetMyProposalForOrder(ctx, orderID, freelancerID)
	if err != nil {
		return err
	}

	// Проверяем, что отклик принадлежит пользователю
	if proposal.FreelancerID != freelancerID {
		return fmt.Errorf("order service: у вас нет доступа к этому отклику")
	}

	return s.aiProposal.StreamProposalFeedback(ctx, order, proposal.CoverLetter, onDelta)
}
