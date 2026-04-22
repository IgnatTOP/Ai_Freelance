package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"github.com/ignatzorin/freelance-backend/internal/models"
	"github.com/ignatzorin/freelance-backend/internal/repository"
)

// GenerateOrderDescription генерирует описание заказа с помощью AI.
func (s *OrderService) GenerateOrderDescription(ctx context.Context, title, briefDescription string, skills []string) (string, error) {
	if s.aiOrderSummary == nil {
		return "", fmt.Errorf("order service: AI сервис недоступен")
	}
	return s.aiOrderSummary.GenerateOrderDescription(ctx, title, briefDescription, skills)
}

// StreamGenerateOrderDescription генерирует описание заказа потоково через AI.
func (s *OrderService) StreamGenerateOrderDescription(ctx context.Context, title, briefDescription string, skills []string, onDelta func(chunk string) error) error {
	if s.aiOrderSummary == nil {
		return fmt.Errorf("order service: AI сервис недоступен")
	}
	return s.aiOrderSummary.StreamGenerateOrderDescription(ctx, title, briefDescription, skills, onDelta)
}

// GenerateOrderSuggestions генерирует предложения для создания заказа (навыки, бюджет, сроки и т.д.)
func (s *OrderService) GenerateOrderSuggestions(ctx context.Context, title, description string) (map[string]interface{}, error) {
	if s.aiOrderSummary == nil {
		return nil, fmt.Errorf("order service: AI сервис недоступен")
	}
	return s.aiOrderSummary.GenerateOrderSuggestions(ctx, title, description)
}

// StreamGenerateOrderSuggestions генерирует предложения для создания заказа потоково
func (s *OrderService) StreamGenerateOrderSuggestions(ctx context.Context, title, description string, onDelta func(chunk string) error) error {
	if s.aiOrderSummary == nil {
		return fmt.Errorf("order service: AI сервис недоступен")
	}
	return s.aiOrderSummary.StreamGenerateOrderSuggestions(ctx, title, description, onDelta)
}

// GenerateOrderSkills генерирует список навыков для заказа
func (s *OrderService) GenerateOrderSkills(ctx context.Context, title, description string) ([]string, error) {
	if s.aiOrderSummary == nil {
		return nil, fmt.Errorf("order service: AI сервис недоступен")
	}
	return s.aiOrderSummary.GenerateOrderSkills(ctx, title, description)
}

// StreamGenerateOrderSkills генерирует список навыков для заказа потоково
func (s *OrderService) StreamGenerateOrderSkills(ctx context.Context, title, description string, onDelta func(chunk string) error) error {
	if s.aiOrderSummary == nil {
		return fmt.Errorf("order service: AI сервис недоступен")
	}
	return s.aiOrderSummary.StreamGenerateOrderSkills(ctx, title, description, onDelta)
}

// GenerateOrderBudget генерирует предложение бюджета для заказа
func (s *OrderService) GenerateOrderBudget(ctx context.Context, title, description string) (map[string]interface{}, error) {
	if s.aiOrderSummary == nil {
		return nil, fmt.Errorf("order service: AI сервис недоступен")
	}
	return s.aiOrderSummary.GenerateOrderBudget(ctx, title, description)
}

// StreamGenerateOrderBudget генерирует предложение бюджета для заказа потоково
func (s *OrderService) StreamGenerateOrderBudget(ctx context.Context, title, description string, onDelta func(chunk string) error) error {
	if s.aiOrderSummary == nil {
		return fmt.Errorf("order service: AI сервис недоступен")
	}
	return s.aiOrderSummary.StreamGenerateOrderBudget(ctx, title, description, onDelta)
}

// GenerateWelcomeMessage генерирует приветственное сообщение для нового пользователя
func (s *OrderService) GenerateWelcomeMessage(ctx context.Context, userRole string) (string, error) {
	if s.aiOrderSummary == nil {
		return "", fmt.Errorf("order service: AI сервис недоступен")
	}
	return s.aiOrderSummary.GenerateWelcomeMessage(ctx, userRole)
}

// StreamGenerateWelcomeMessage генерирует приветственное сообщение потоково
func (s *OrderService) StreamGenerateWelcomeMessage(ctx context.Context, userRole string, onDelta func(chunk string) error) error {
	if s.aiOrderSummary == nil {
		return fmt.Errorf("order service: AI сервис недоступен")
	}
	return s.aiOrderSummary.StreamGenerateWelcomeMessage(ctx, userRole, onDelta)
}

// GenerateProposal генерирует отклик на заказ с помощью AI.
func (s *OrderService) GenerateProposal(ctx context.Context, orderID uuid.UUID, userID uuid.UUID, overrideSkills []string, overrideExperience string, overrideBio string, portfolioItems []models.PortfolioItemForAI) (string, error) {
	if s.aiProposal == nil {
		return "", fmt.Errorf("order service: AI сервис недоступен")
	}

	order, err := s.repoOrders.GetByID(ctx, orderID)
	if err != nil {
		return "", err
	}

	// Получаем требования заказа
	requirements, err := s.repoOrders.ListRequirements(ctx, orderID)
	if err != nil {
		// Не критично, если не удалось получить требования
		requirements = []models.OrderRequirement{}
	}

	// Получаем профиль пользователя для использования его данных
	var userSkills []string
	var userExperience string
	var userBio string

	if s.profile != nil {
		profile, err := s.profile.GetProfile(ctx, userID)
		if err == nil && profile != nil {
			// Используем данные из профиля, если они есть
			userSkills = profile.Skills
			userExperience = profile.ExperienceLevel
			if profile.Bio != nil {
				userBio = *profile.Bio
			}
		}
	}

	// Переданные параметры имеют приоритет (переопределяют данные профиля)
	if len(overrideSkills) > 0 {
		userSkills = overrideSkills
	}
	if overrideExperience != "" {
		userExperience = overrideExperience
	}
	if overrideBio != "" {
		userBio = overrideBio
	}

	// Если портфолио не передано, загружаем из БД
	if len(portfolioItems) == 0 && s.portfolio != nil {
		dbPortfolio, err := s.portfolio.List(ctx, userID)
		if err == nil && len(dbPortfolio) > 0 {
			portfolioItems = make([]models.PortfolioItemForAI, len(dbPortfolio))
			for i, item := range dbPortfolio {
				portfolioItems[i] = models.PortfolioItemForAI{
					Title:       item.Title,
					Description: getStringPtrValue(item.Description),
					AITags:      item.AITags,
				}
			}
		}
	}

	// Используем bio как дополнительный контекст для AI
	experienceStr := userExperience
	if userBio != "" {
		if experienceStr != "" {
			experienceStr += ". " + userBio
		} else {
			experienceStr = userBio
		}
	}

	// Преобразуем service.PortfolioItemForAI в структуру для AI клиента
	// Оба типа имеют одинаковую структуру, поэтому можем просто передать как interface{}
	// и преобразовать в AI клиенте
	aiItems := make([]struct {
		Title       string
		Description string
		AITags      []string
	}, len(portfolioItems))
	for i, item := range portfolioItems {
		aiItems[i] = struct {
			Title       string
			Description string
			AITags      []string
		}{
			Title:       item.Title,
			Description: item.Description,
			AITags:      item.AITags,
		}
	}

	return s.aiProposal.GenerateProposal(ctx, order, requirements, userSkills, experienceStr, aiItems)
}

// StreamGenerateProposal генерирует отклик на заказ с помощью AI потоково.
func (s *OrderService) StreamGenerateProposal(
	ctx context.Context,
	orderID uuid.UUID,
	userID uuid.UUID,
	overrideSkills []string,
	overrideExperience string,
	overrideBio string,
	portfolioItems []models.PortfolioItemForAI,
	onDelta func(chunk string) error,
) error {
	if s.aiProposal == nil {
		return fmt.Errorf("order service: AI сервис недоступен")
	}

	order, err := s.repoOrders.GetByID(ctx, orderID)
	if err != nil {
		return err
	}

	// Получаем требования заказа
	requirements, err := s.repoOrders.ListRequirements(ctx, orderID)
	if err != nil {
		requirements = []models.OrderRequirement{}
	}

	// Получаем профиль пользователя для использования его данных
	var userSkills []string
	var userExperience string
	var userBio string

	if s.profile != nil {
		profile, err := s.profile.GetProfile(ctx, userID)
		if err == nil && profile != nil {
			userSkills = profile.Skills
			userExperience = profile.ExperienceLevel
			if profile.Bio != nil {
				userBio = *profile.Bio
			}
		}
	}

	if len(overrideSkills) > 0 {
		userSkills = overrideSkills
	}
	if overrideExperience != "" {
		userExperience = overrideExperience
	}
	if overrideBio != "" {
		userBio = overrideBio
	}

	experienceStr := userExperience
	if userBio != "" {
		if experienceStr != "" {
			experienceStr += ". " + userBio
		} else {
			experienceStr = userBio
		}
	}

	aiItems := make([]struct {
		Title       string
		Description string
		AITags      []string
	}, len(portfolioItems))
	for i, item := range portfolioItems {
		aiItems[i] = struct {
			Title       string
			Description string
			AITags      []string
		}{
			Title:       item.Title,
			Description: item.Description,
			AITags:      item.AITags,
		}
	}

	return s.aiProposal.StreamGenerateProposal(ctx, order, requirements, userSkills, experienceStr, aiItems, onDelta)
}

// ImproveOrderDescription улучшает описание заказа с помощью AI.
func (s *OrderService) ImproveOrderDescription(ctx context.Context, title, description string) (string, error) {
	if s.aiOrderSummary == nil {
		return "", fmt.Errorf("order service: AI сервис недоступен")
	}
	return s.aiOrderSummary.ImproveOrderDescription(ctx, title, description)
}

// StreamImproveOrderDescription улучшает описание заказа потоково через AI.
func (s *OrderService) StreamImproveOrderDescription(ctx context.Context, title, description string, onDelta func(chunk string) error) error {
	if s.aiOrderSummary == nil {
		return fmt.Errorf("order service: AI сервис недоступен")
	}
	return s.aiOrderSummary.StreamImproveOrderDescription(ctx, title, description, onDelta)
}

// RegenerateOrderSummary регенерирует AI summary для заказа.
func (s *OrderService) RegenerateOrderSummary(ctx context.Context, orderID uuid.UUID, clientID uuid.UUID) (*models.Order, error) {
	if s.aiOrderSummary == nil {
		return nil, fmt.Errorf("order service: AI сервис недоступен")
	}

	order, err := s.repoOrders.GetByID(ctx, orderID)
	if err != nil {
		return nil, err
	}

	if order.ClientID != clientID {
		return nil, fmt.Errorf("order service: у вас нет прав на изменение этого заказа")
	}

	// Генерируем новый summary
	summary, err := s.aiOrderSummary.SummarizeOrder(ctx, order.Title, order.Description)
	if err != nil {
		return nil, fmt.Errorf("order service: не удалось сгенерировать summary: %w", err)
	}

	// Обновляем только ai_summary в базе
	if err := s.repoAICache.UpdateAISummary(ctx, orderID, clientID, summary); err != nil {
		return nil, err
	}

	order.AISummary = &summary

	return order, nil
}

// StreamRegenerateOrderSummary регенерирует AI summary для заказа потоково.
func (s *OrderService) StreamRegenerateOrderSummary(
	ctx context.Context,
	orderID uuid.UUID,
	clientID uuid.UUID,
	onDelta func(chunk string) error,
) (*models.Order, error) {
	if s.aiOrderSummary == nil {
		return nil, fmt.Errorf("order service: AI сервис недоступен")
	}

	order, err := s.repoOrders.GetByID(ctx, orderID)
	if err != nil {
		return nil, err
	}

	if order.ClientID != clientID {
		return nil, fmt.Errorf("order service: у вас нет прав на изменение этого заказа")
	}

	// Стримим новый summary
	var finalSummary string
	err = s.aiOrderSummary.StreamSummarizeOrder(ctx, order.Title, order.Description, func(chunk string) error {
		finalSummary += chunk
		return onDelta(chunk)
	})
	if err != nil {
		return nil, fmt.Errorf("order service: не удалось сгенерировать summary (stream): %w", err)
	}

	// После завершения сохраняем полный summary в базе
	if finalSummary != "" {
		if err := s.repoAICache.UpdateAISummary(ctx, orderID, clientID, finalSummary); err != nil {
			return nil, err
		}
		order.AISummary = &finalSummary
	}

	return order, nil
}

// SummarizeConversation создаёт резюме переписки в чате.
func (s *OrderService) SummarizeConversation(ctx context.Context, conversationID uuid.UUID, userID uuid.UUID) (*models.ChatSummary, error) {
	if s.aiConversation == nil {
		return nil, fmt.Errorf("order service: AI сервис недоступен")
	}

	// Получаем чат
	conversation, err := s.repoConversations.GetConversationByID(ctx, conversationID)
	if err != nil {
		return nil, err
	}

	// Проверяем права доступа
	if conversation.ClientID != userID && conversation.FreelancerID != userID {
		return nil, fmt.Errorf("order service: у вас нет доступа к этому чату")
	}

	// Получаем все сообщения
	messages, err := s.repoMessages.ListMessages(ctx, conversationID, 1000, 0)
	if err != nil {
		return nil, err
	}

	// Получаем название заказа
	orderTitle := "Чат"
	if conversation.OrderID != nil {
		order, err := s.repoOrders.GetByID(ctx, *conversation.OrderID)
		if err == nil && order != nil {
			orderTitle = order.Title
		}
	}

	return s.aiConversation.SummarizeConversation(ctx, messages, orderTitle)
}

// StreamSummarizeConversation создаёт резюме переписки потоково.
func (s *OrderService) StreamSummarizeConversation(
	ctx context.Context,
	conversationID uuid.UUID,
	userID uuid.UUID,
	onDelta func(chunk string) error,
) error {
	if s.aiConversation == nil {
		return fmt.Errorf("order service: AI сервис недоступен")
	}

	conversation, err := s.repoConversations.GetConversationByID(ctx, conversationID)
	if err != nil {
		return err
	}

	if conversation.ClientID != userID && conversation.FreelancerID != userID {
		return fmt.Errorf("order service: у вас нет доступа к этому чату")
	}

	messages, err := s.repoMessages.ListMessages(ctx, conversationID, 1000, 0)
	if err != nil {
		return err
	}

	orderTitle := "Чат"
	if conversation.OrderID != nil {
		order, err := s.repoOrders.GetByID(ctx, *conversation.OrderID)
		if err == nil && order != nil {
			orderTitle = order.Title
		}
	}

	return s.aiConversation.StreamSummarizeConversation(ctx, messages, orderTitle, onDelta)
}

// RecommendRelevantOrders рекомендует подходящие заказы для фрилансера.
// УЛУЧШЕНО: Теперь исключает заказы, на которые фрилансер уже откликнулся.
func (s *OrderService) RecommendRelevantOrders(ctx context.Context, freelancerID uuid.UUID, limit int) ([]models.RecommendedOrder, string, error) {
	if s.aiRecommendations == nil {
		return nil, "", fmt.Errorf("order service: AI сервис недоступен")
	}

	// Получаем профиль фрилансера
	profile, err := s.profile.GetProfile(ctx, freelancerID)
	if err != nil {
		return nil, "", err
	}

	// Получаем портфолио
	portfolioItems, err := s.portfolio.List(ctx, freelancerID)
	if err != nil {
		return nil, "", err
	}

	// Преобразуем портфолио в формат для AI
	aiPortfolio := make([]models.PortfolioItemForAI, 0, len(portfolioItems))
	for _, item := range portfolioItems {
		desc := ""
		if item.Description != nil {
			desc = *item.Description
		}
		aiPortfolio = append(aiPortfolio, models.PortfolioItemForAI{
			Title:       item.Title,
			Description: desc,
			AITags:      item.AITags,
		})
	}

	// Получаем список всех опубликованных заказов (берем больше для лучшего выбора)
	searchLimit := limit * 5 // Берем в 5 раз больше заказов для анализа
	if searchLimit > 200 {
		searchLimit = 200 // Но не более 200
	}

	params := repository.ListFilterParams{
		Status: models.OrderStatusPublished,
		Limit:  searchLimit,
		Offset: 0,
	}
	result, err := s.repoOrders.List(ctx, params)
	if err != nil {
		return nil, "", err
	}

	if len(result.Orders) == 0 {
		// Fallback: возвращаем пустой список с объяснением
		return []models.RecommendedOrder{}, "Нет доступных заказов на платформе", nil
	}

	// Получаем список заказов, на которые фрилансер уже откликнулся
	myProposals, err := s.repoProposals.ListMyProposals(ctx, freelancerID)
	if err != nil {
		// Если не удалось получить, продолжаем без фильтрации
		myProposals = []models.Proposal{}
	}

	// Собираем ID заказов, на которые уже откликнулся
	alreadyRespondedOrders := make(map[uuid.UUID]bool)
	for _, proposal := range myProposals {
		alreadyRespondedOrders[proposal.OrderID] = true
	}

	// Фильтруем заказы: исключаем те, на которые уже откликнулся
	filteredOrders := make([]models.Order, 0, len(result.Orders))
	for _, order := range result.Orders {
		// Пропускаем заказы, на которые уже откликнулся
		if alreadyRespondedOrders[order.ID] {
			continue
		}
		// Пропускаем заказы, где уже выбран исполнитель
		if order.Status == models.OrderStatusInProgress || order.Status == models.OrderStatusCompleted {
			continue
		}
		filteredOrders = append(filteredOrders, order)
	}

	if len(filteredOrders) == 0 {
		// Fallback: если все заказы уже просмотрены, возвращаем популярные заказы
		// Берем топ заказов по количеству откликов
		fallbackParams := repository.ListFilterParams{
			Status:    models.OrderStatusPublished,
			Limit:     limit,
			Offset:    0,
			SortBy:    "proposals",
			SortOrder: "desc",
		}
		fallbackResult, err := s.repoOrders.List(ctx, fallbackParams)
		if err == nil && len(fallbackResult.Orders) > 0 {
			fallbackOrders := make([]models.RecommendedOrder, 0, len(fallbackResult.Orders))
			for _, order := range fallbackResult.Orders {
				// Пропускаем заказы, на которые уже откликнулся
				if alreadyRespondedOrders[order.ID] {
					continue
				}
				// Базовый match_score на основе популярности
				matchScore := 6.5 // Базовый score для популярных заказов
				if order.ProposalsCount != nil && *order.ProposalsCount > 0 {
					// Чем больше откликов, тем выше score (но не выше 7.5)
					matchScore = 6.5 + float64(*order.ProposalsCount)*0.1
					if matchScore > 7.5 {
						matchScore = 7.5
					}
				}
				fallbackOrders = append(fallbackOrders, models.RecommendedOrder{
					OrderID:     order.ID,
					MatchScore:  matchScore,
					Explanation: "Популярный заказ на платформе",
				})
				if len(fallbackOrders) >= limit {
					break
				}
			}
			if len(fallbackOrders) > 0 {
				return fallbackOrders, "Популярные заказы на платформе", nil
			}
		}
		return []models.RecommendedOrder{}, "Нет новых заказов для рекомендации", nil
	}

	// Передаем отфильтрованные заказы в AI для анализа
	recommendedOrders, explanation, err := s.aiRecommendations.RecommendRelevantOrders(ctx, profile, aiPortfolio, filteredOrders)

	// Fallback: если AI не вернул рекомендаций или вернул мало, добавляем популярные заказы
	if err != nil || len(recommendedOrders) < limit {
		// Если AI вернул рекомендации, используем их
		if len(recommendedOrders) > 0 {
			// Дополняем до limit популярными заказами
			recommendedOrderIDs := make(map[uuid.UUID]bool)
			for _, rec := range recommendedOrders {
				recommendedOrderIDs[rec.OrderID] = true
			}

			// Ищем дополнительные заказы по навыкам или популярности
			fallbackParams := repository.ListFilterParams{
				Status:    models.OrderStatusPublished,
				Limit:     limit * 2,
				Offset:    0,
				SortBy:    "proposals",
				SortOrder: "desc",
			}

			// Если у фрилансера есть навыки, ищем заказы по навыкам
			if len(profile.Skills) > 0 {
				fallbackParams.Skills = profile.Skills
			}

			fallbackResult, err := s.repoOrders.List(ctx, fallbackParams)
			// Если с фильтром по навыкам заказов нет, пробуем без фильтра навыков
			if err == nil && len(fallbackResult.Orders) == 0 && len(fallbackParams.Skills) > 0 {
				fallbackParams.Skills = nil
				fallbackResult, err = s.repoOrders.List(ctx, fallbackParams)
			}
			if err == nil && len(fallbackResult.Orders) > 0 {
				for _, order := range fallbackResult.Orders {
					// Пропускаем уже рекомендованные
					if recommendedOrderIDs[order.ID] {
						continue
					}
					// Пропускаем заказы, на которые уже откликнулся
					if alreadyRespondedOrders[order.ID] {
						continue
					}
					// Пропускаем заказы, где уже выбран исполнитель
					if order.Status == models.OrderStatusInProgress || order.Status == models.OrderStatusCompleted {
						continue
					}

					// Базовый match_score
					matchScore := 6.0
					explanationText := "Заказ на основе ваших навыков"

					// Проверяем соответствие навыков - получаем требования отдельно
					if len(profile.Skills) > 0 {
						requirements, err := s.repoOrders.ListRequirements(ctx, order.ID)
						if err == nil && len(requirements) > 0 {
							orderSkills := make(map[string]bool)
							for _, req := range requirements {
								orderSkills[req.Skill] = true
							}
							matchingSkills := 0
							for _, skill := range profile.Skills {
								if orderSkills[skill] {
									matchingSkills++
								}
							}
							if matchingSkills > 0 {
								matchScore = 6.5 + float64(matchingSkills)*0.3
								if matchScore > 7.0 {
									matchScore = 7.0
								}
								explanationText = fmt.Sprintf("Соответствует %d вашим навыкам", matchingSkills)
							}
						}
					}

					recommendedOrders = append(recommendedOrders, models.RecommendedOrder{
						OrderID:     order.ID,
						MatchScore:  matchScore,
						Explanation: explanationText,
					})

					if len(recommendedOrders) >= limit {
						break
					}
				}
			}
		} else {
			// Если AI вообще не вернул рекомендаций, используем fallback полностью
			fallbackParams := repository.ListFilterParams{
				Status:    models.OrderStatusPublished,
				Limit:     limit,
				Offset:    0,
				SortBy:    "proposals",
				SortOrder: "desc",
			}

			// Если у фрилансера есть навыки, ищем заказы по навыкам
			if len(profile.Skills) > 0 {
				fallbackParams.Skills = profile.Skills
			}

			fallbackResult, err := s.repoOrders.List(ctx, fallbackParams)
			// Если с фильтром по навыкам заказов нет, пробуем без фильтра навыков
			if err == nil && len(fallbackResult.Orders) == 0 && len(fallbackParams.Skills) > 0 {
				fallbackParams.Skills = nil
				fallbackResult, err = s.repoOrders.List(ctx, fallbackParams)
			}
			if err == nil && len(fallbackResult.Orders) > 0 {
				fallbackOrders := make([]models.RecommendedOrder, 0, len(fallbackResult.Orders))
				for _, order := range fallbackResult.Orders {
					// Пропускаем заказы, на которые уже откликнулся
					if alreadyRespondedOrders[order.ID] {
						continue
					}
					// Пропускаем заказы, где уже выбран исполнитель
					if order.Status == models.OrderStatusInProgress || order.Status == models.OrderStatusCompleted {
						continue
					}

					matchScore := 6.5
					explanationText := "Популярный заказ"

					// Проверяем соответствие навыков - получаем требования отдельно
					if len(profile.Skills) > 0 {
						requirements, err := s.repoOrders.ListRequirements(ctx, order.ID)
						if err == nil && len(requirements) > 0 {
							orderSkills := make(map[string]bool)
							for _, req := range requirements {
								orderSkills[req.Skill] = true
							}
							matchingSkills := 0
							for _, skill := range profile.Skills {
								if orderSkills[skill] {
									matchingSkills++
								}
							}
							if matchingSkills > 0 {
								matchScore = 6.5 + float64(matchingSkills)*0.3
								if matchScore > 7.0 {
									matchScore = 7.0
								}
								explanationText = fmt.Sprintf("Соответствует %d вашим навыкам", matchingSkills)
							}
						}
					}

					fallbackOrders = append(fallbackOrders, models.RecommendedOrder{
						OrderID:     order.ID,
						MatchScore:  matchScore,
						Explanation: explanationText,
					})

					if len(fallbackOrders) >= limit {
						break
					}
				}
				if len(fallbackOrders) > 0 {
					return fallbackOrders, "Рекомендации на основе ваших навыков и популярности заказов", nil
				}
			}
		}
	}

	// Сортируем по match_score и ограничиваем до limit
	if len(recommendedOrders) > limit {
		// Сортируем по убыванию match_score
		for i := 0; i < len(recommendedOrders)-1; i++ {
			for j := i + 1; j < len(recommendedOrders); j++ {
				if recommendedOrders[i].MatchScore < recommendedOrders[j].MatchScore {
					recommendedOrders[i], recommendedOrders[j] = recommendedOrders[j], recommendedOrders[i]
				}
			}
		}
		recommendedOrders = recommendedOrders[:limit]
	}

	// Если explanation пустой, добавляем базовое объяснение
	if explanation == "" {
		explanation = "Рекомендации на основе вашего профиля и навыков"
	}

	// Safety net: никогда не возвращаем пустой список,
	// если есть хотя бы какие-то доступные отфильтрованные заказы.
	if len(recommendedOrders) == 0 && len(filteredOrders) > 0 {
		fallbackOrders := make([]models.RecommendedOrder, 0, limit)
		for _, order := range filteredOrders {
			if alreadyRespondedOrders[order.ID] {
				continue
			}
			fallbackOrders = append(fallbackOrders, models.RecommendedOrder{
				OrderID:     order.ID,
				MatchScore:  6.0,
				Explanation: "Рекомендация на основе доступных заказов на платформе",
			})
			if len(fallbackOrders) >= limit {
				break
			}
		}
		if len(fallbackOrders) > 0 {
			return fallbackOrders, "Рекомендации на основе доступных заказов", nil
		}
	}

	return recommendedOrders, explanation, nil
}

// StreamRecommendRelevantOrders рекомендует подходящие заказы для фрилансера потоково.
func (s *OrderService) StreamRecommendRelevantOrders(
	ctx context.Context,
	freelancerID uuid.UUID,
	limit int,
	onDelta func(chunk string) error,
	onComplete func(recommendedOrders []models.RecommendedOrder, generalExplanation string) error,
) error {
	if s.aiRecommendations == nil {
		return fmt.Errorf("order service: AI сервис недоступен")
	}

	// Получаем профиль фрилансера
	profile, err := s.profile.GetProfile(ctx, freelancerID)
	if err != nil {
		return err
	}

	// Получаем портфолио
	portfolioItems, err := s.portfolio.List(ctx, freelancerID)
	if err != nil {
		return err
	}

	// Преобразуем портфолио в формат для AI
	aiPortfolio := make([]models.PortfolioItemForAI, 0, len(portfolioItems))
	for _, item := range portfolioItems {
		desc := ""
		if item.Description != nil {
			desc = *item.Description
		}
		aiPortfolio = append(aiPortfolio, models.PortfolioItemForAI{
			Title:       item.Title,
			Description: desc,
			AITags:      item.AITags,
		})
	}

	// Получаем список всех опубликованных заказов
	searchLimit := limit * 5
	if searchLimit > 200 {
		searchLimit = 200
	}

	params := repository.ListFilterParams{
		Status: models.OrderStatusPublished,
		Limit:  searchLimit,
		Offset: 0,
	}
	result, err := s.repoOrders.List(ctx, params)
	if err != nil {
		return err
	}

	// Получаем список заказов, на которые фрилансер уже откликнулся
	myProposals, err := s.repoProposals.ListMyProposals(ctx, freelancerID)
	if err != nil {
		// Если не удалось получить, продолжаем без фильтрации
		myProposals = []models.Proposal{}
	}

	// Собираем ID заказов, на которые уже откликнулся
	alreadyRespondedOrders := make(map[uuid.UUID]bool)
	for _, proposal := range myProposals {
		alreadyRespondedOrders[proposal.OrderID] = true
	}

	// Фильтруем заказы: исключаем те, на которые уже откликнулся
	filteredOrders := make([]models.Order, 0, len(result.Orders))
	for _, order := range result.Orders {
		// Пропускаем заказы, на которые уже откликнулся
		if alreadyRespondedOrders[order.ID] {
			continue
		}
		// Пропускаем заказы, где уже выбран исполнитель
		if order.Status == models.OrderStatusInProgress || order.Status == models.OrderStatusCompleted {
			continue
		}
		filteredOrders = append(filteredOrders, order)
	}

	if len(filteredOrders) == 0 {
		// Fallback: возвращаем популярные заказы
		fallbackParams := repository.ListFilterParams{
			Status:    models.OrderStatusPublished,
			Limit:     limit,
			Offset:    0,
			SortBy:    "proposals",
			SortOrder: "desc",
		}
		fallbackResult, err := s.repoOrders.List(ctx, fallbackParams)
		if err == nil && len(fallbackResult.Orders) > 0 {
			fallbackAlreadyResponded := make(map[uuid.UUID]bool)
			fallbackProposals, _ := s.repoProposals.ListMyProposals(ctx, freelancerID)
			for _, proposal := range fallbackProposals {
				fallbackAlreadyResponded[proposal.OrderID] = true
			}

			fallbackOrders := make([]models.RecommendedOrder, 0, len(fallbackResult.Orders))
			for _, order := range fallbackResult.Orders {
				if fallbackAlreadyResponded[order.ID] {
					continue
				}
				matchScore := 6.5
				if order.ProposalsCount != nil && *order.ProposalsCount > 0 {
					matchScore = 6.5 + float64(*order.ProposalsCount)*0.1
					if matchScore > 7.5 {
						matchScore = 7.5
					}
				}
				fallbackOrders = append(fallbackOrders, models.RecommendedOrder{
					OrderID:     order.ID,
					MatchScore:  matchScore,
					Explanation: "Популярный заказ на платформе",
				})
				if len(fallbackOrders) >= limit {
					break
				}
			}
			if len(fallbackOrders) > 0 {
				return onComplete(fallbackOrders, "Популярные заказы на платформе")
			}
		}
		return onComplete([]models.RecommendedOrder{}, "Нет новых заказов для рекомендации")
	}

	// Используем AI для анализа, но с fallback
	var aiRecommendedOrders []models.RecommendedOrder
	var aiExplanation string
	aiErr := s.aiRecommendations.StreamRecommendRelevantOrders(ctx, profile, aiPortfolio, filteredOrders, onDelta, func(orders []models.RecommendedOrder, expl string) error {
		aiRecommendedOrders = orders
		aiExplanation = expl
		return nil
	})

	// Если AI вернул рекомендации, используем их
	if aiErr == nil && len(aiRecommendedOrders) > 0 {
		// Дополняем до limit если нужно
		if len(aiRecommendedOrders) < limit {
			recommendedOrderIDs := make(map[uuid.UUID]bool)
			for _, rec := range aiRecommendedOrders {
				recommendedOrderIDs[rec.OrderID] = true
			}

			fallbackAlreadyResponded2 := make(map[uuid.UUID]bool)
			fallbackProposals2, _ := s.repoProposals.ListMyProposals(ctx, freelancerID)
			for _, proposal := range fallbackProposals2 {
				fallbackAlreadyResponded2[proposal.OrderID] = true
			}

			fallbackParams := repository.ListFilterParams{
				Status:    models.OrderStatusPublished,
				Limit:     limit * 2,
				Offset:    0,
				SortBy:    "proposals",
				SortOrder: "desc",
			}
			if len(profile.Skills) > 0 {
				fallbackParams.Skills = profile.Skills
			}

			fallbackResult, err := s.repoOrders.List(ctx, fallbackParams)
			if err == nil && len(fallbackResult.Orders) > 0 {
				for _, order := range fallbackResult.Orders {
					if recommendedOrderIDs[order.ID] || alreadyRespondedOrders[order.ID] {
						continue
					}
					if order.Status == models.OrderStatusInProgress || order.Status == models.OrderStatusCompleted {
						continue
					}

					matchScore := 6.0
					explanationText := "Заказ на основе ваших навыков"
					if len(profile.Skills) > 0 {
						requirements, err := s.repoOrders.ListRequirements(ctx, order.ID)
						if err == nil && len(requirements) > 0 {
							orderSkills := make(map[string]bool)
							for _, req := range requirements {
								orderSkills[req.Skill] = true
							}
							matchingSkills := 0
							for _, skill := range profile.Skills {
								if orderSkills[skill] {
									matchingSkills++
								}
							}
							if matchingSkills > 0 {
								matchScore = 6.5 + float64(matchingSkills)*0.3
								if matchScore > 7.0 {
									matchScore = 7.0
								}
								explanationText = fmt.Sprintf("Соответствует %d вашим навыкам", matchingSkills)
							}
						}
					}

					aiRecommendedOrders = append(aiRecommendedOrders, models.RecommendedOrder{
						OrderID:     order.ID,
						MatchScore:  matchScore,
						Explanation: explanationText,
					})

					if len(aiRecommendedOrders) >= limit {
						break
					}
				}
			}
		}

		// Сортируем и ограничиваем
		if len(aiRecommendedOrders) > limit {
			for i := 0; i < len(aiRecommendedOrders)-1; i++ {
				for j := i + 1; j < len(aiRecommendedOrders); j++ {
					if aiRecommendedOrders[i].MatchScore < aiRecommendedOrders[j].MatchScore {
						aiRecommendedOrders[i], aiRecommendedOrders[j] = aiRecommendedOrders[j], aiRecommendedOrders[i]
					}
				}
			}
			aiRecommendedOrders = aiRecommendedOrders[:limit]
		}

		if aiExplanation == "" {
			aiExplanation = "Рекомендации на основе вашего профиля и навыков"
		}

		return onComplete(aiRecommendedOrders, aiExplanation)
	}

	// Fallback: если AI не сработал, используем популярные заказы
	fallbackAlreadyResponded3 := make(map[uuid.UUID]bool)
	fallbackProposals3, _ := s.repoProposals.ListMyProposals(ctx, freelancerID)
	for _, proposal := range fallbackProposals3 {
		fallbackAlreadyResponded3[proposal.OrderID] = true
	}

	fallbackParams := repository.ListFilterParams{
		Status:    models.OrderStatusPublished,
		Limit:     limit,
		Offset:    0,
		SortBy:    "proposals",
		SortOrder: "desc",
	}
	if len(profile.Skills) > 0 {
		fallbackParams.Skills = profile.Skills
	}

	fallbackResult, err := s.repoOrders.List(ctx, fallbackParams)
	if err == nil && len(fallbackResult.Orders) > 0 {
		fallbackOrders := make([]models.RecommendedOrder, 0, len(fallbackResult.Orders))
		for _, order := range fallbackResult.Orders {
			if fallbackAlreadyResponded3[order.ID] {
				continue
			}
			if order.Status == models.OrderStatusInProgress || order.Status == models.OrderStatusCompleted {
				continue
			}

			matchScore := 6.5
			explanationText := "Популярный заказ"
			if len(profile.Skills) > 0 {
				requirements, err := s.repoOrders.ListRequirements(ctx, order.ID)
				if err == nil && len(requirements) > 0 {
					orderSkills := make(map[string]bool)
					for _, req := range requirements {
						orderSkills[req.Skill] = true
					}
					matchingSkills := 0
					for _, skill := range profile.Skills {
						if orderSkills[skill] {
							matchingSkills++
						}
					}
					if matchingSkills > 0 {
						matchScore = 6.5 + float64(matchingSkills)*0.3
						if matchScore > 7.0 {
							matchScore = 7.0
						}
						explanationText = fmt.Sprintf("Соответствует %d вашим навыкам", matchingSkills)
					}
				}
			}

			fallbackOrders = append(fallbackOrders, models.RecommendedOrder{
				OrderID:     order.ID,
				MatchScore:  matchScore,
				Explanation: explanationText,
			})

			if len(fallbackOrders) >= limit {
				break
			}
		}
		if len(fallbackOrders) > 0 {
			return onComplete(fallbackOrders, "Рекомендации на основе ваших навыков и популярности заказов")
		}
	}

	return onComplete([]models.RecommendedOrder{}, "Нет новых заказов для рекомендации")
}

// RecommendPriceAndTimeline рекомендует цену и сроки для отклика.
func (s *OrderService) RecommendPriceAndTimeline(
	ctx context.Context,
	orderID uuid.UUID,
	freelancerID uuid.UUID,
) (*models.PriceTimelineRecommendation, error) {
	if s.aiProposal == nil {
		return nil, fmt.Errorf("order service: AI сервис недоступен")
	}

	// Получаем заказ
	order, requirements, _, err := s.repoOrders.GetByIDWithDetails(ctx, orderID)
	if err != nil {
		return nil, err
	}

	// Получаем профиль фрилансера
	profile, err := s.profile.GetProfile(ctx, freelancerID)
	if err != nil {
		return nil, err
	}

	// Получаем другие отклики
	proposals, err := s.repoProposals.ListProposals(ctx, orderID)
	if err != nil {
		return nil, err
	}

	// Фильтруем отклики других фрилансеров
	otherProposals := make([]*models.Proposal, 0)
	for i := range proposals {
		if proposals[i].FreelancerID != freelancerID {
			otherProposals = append(otherProposals, &proposals[i])
		}
	}

	return s.aiProposal.RecommendPriceAndTimeline(ctx, order, requirements, profile, otherProposals)
}

// StreamRecommendPriceAndTimeline рекомендует цену и сроки для отклика потоково.
func (s *OrderService) StreamRecommendPriceAndTimeline(
	ctx context.Context,
	orderID uuid.UUID,
	freelancerID uuid.UUID,
	onDelta func(chunk string) error,
	onComplete func(recommendation *models.PriceTimelineRecommendation) error,
) error {
	if s.aiProposal == nil {
		return fmt.Errorf("order service: AI сервис недоступен")
	}

	// Получаем заказ
	order, requirements, _, err := s.repoOrders.GetByIDWithDetails(ctx, orderID)
	if err != nil {
		return err
	}

	// Получаем профиль фрилансера
	profile, err := s.profile.GetProfile(ctx, freelancerID)
	if err != nil {
		return err
	}

	// Получаем другие отклики
	proposals, err := s.repoProposals.ListProposals(ctx, orderID)
	if err != nil {
		return err
	}

	// Фильтруем отклики других фрилансеров
	otherProposals := make([]*models.Proposal, 0)
	for i := range proposals {
		if proposals[i].FreelancerID != freelancerID {
			otherProposals = append(otherProposals, &proposals[i])
		}
	}

	return s.aiProposal.StreamRecommendPriceAndTimeline(ctx, order, requirements, profile, otherProposals, onDelta, onComplete)
}

// EvaluateOrderQuality оценивает качество заказа.
func (s *OrderService) EvaluateOrderQuality(ctx context.Context, orderID uuid.UUID, clientID uuid.UUID) (*models.OrderQualityEvaluation, error) {
	if s.aiOrderSummary == nil {
		return nil, fmt.Errorf("order service: AI сервис недоступен")
	}

	order, requirements, _, err := s.repoOrders.GetByIDWithDetails(ctx, orderID)
	if err != nil {
		return nil, err
	}

	if order.ClientID != clientID {
		return nil, fmt.Errorf("order service: у вас нет прав на оценку этого заказа")
	}

	return s.aiOrderSummary.EvaluateOrderQuality(ctx, order, requirements)
}

// StreamEvaluateOrderQuality оценивает качество заказа потоково.
func (s *OrderService) StreamEvaluateOrderQuality(
	ctx context.Context,
	orderID uuid.UUID,
	clientID uuid.UUID,
	onDelta func(chunk string) error,
	onComplete func(evaluation *models.OrderQualityEvaluation) error,
) error {
	if s.aiOrderSummary == nil {
		return fmt.Errorf("order service: AI сервис недоступен")
	}

	order, requirements, _, err := s.repoOrders.GetByIDWithDetails(ctx, orderID)
	if err != nil {
		return err
	}

	if order.ClientID != clientID {
		return fmt.Errorf("order service: у вас нет прав на оценку этого заказа")
	}

	return s.aiOrderSummary.StreamEvaluateOrderQuality(ctx, order, requirements, onDelta, onComplete)
}

// FindSuitableFreelancers находит подходящих фрилансеров для заказа.
// ИСПРАВЛЕНО: Теперь ищет среди ВСЕХ фрилансеров на платформе, а не только тех, кто уже откликнулся.
func (s *OrderService) FindSuitableFreelancers(ctx context.Context, orderID uuid.UUID, userID uuid.UUID, userRole string, limit int) ([]models.SuitableFreelancer, error) {
	if s.aiRecommendations == nil {
		return nil, fmt.Errorf("order service: AI сервис недоступен")
	}

	if s.users == nil {
		return nil, fmt.Errorf("order service: UserRepository недоступен")
	}

	order, requirements, _, err := s.repoOrders.GetByIDWithDetails(ctx, orderID)
	if err != nil {
		return nil, fmt.Errorf("order service: не удалось получить заказ: %w", err)
	}

	// Проверка прав: только владелец заказа или admin могут искать исполнителей
	// Нормализуем роль для сравнения (на случай разных регистров)
	isAdmin := strings.ToLower(userRole) == "admin"
	isOwner := order.ClientID == userID

	if !isAdmin && !isOwner {
		return nil, fmt.Errorf("order service: у вас нет прав на поиск исполнителей для этого заказа (заказ ID: %s, владелец: %s, ваш ID: %s, ваша роль: %s)",
			orderID, order.ClientID, userID, userRole)
	}

	// Получаем список фрилансеров, которые УЖЕ откликнулись на этот заказ (чтобы исключить их опционально)
	proposals, err := s.repoProposals.ListProposals(ctx, orderID)
	if err != nil {
		return nil, err
	}

	// Собираем ID фрилансеров, которые уже откликнулись
	alreadyResponded := make(map[uuid.UUID]bool)
	for _, p := range proposals {
		alreadyResponded[p.FreelancerID] = true
	}

	// Получаем ВСЕХ активных фрилансеров с платформы
	// Используем больший лимит, чтобы AI мог выбрать лучших
	searchLimit := limit * 3 // Берем в 3 раза больше для лучшего выбора
	if searchLimit > 100 {
		searchLimit = 100 // Но не более 100
	}

	freelancerUsers, err := s.users.ListFreelancers(ctx, searchLimit, 0)
	if err != nil {
		return nil, fmt.Errorf("order service: не удалось получить список фрилансеров: %w", err)
	}

	if len(freelancerUsers) == 0 {
		return []models.SuitableFreelancer{}, nil
	}

	// Получаем профили и портфолио всех фрилансеров
	freelancerProfiles := make([]*models.Profile, 0, len(freelancerUsers))
	freelancerPortfolios := make(map[uuid.UUID][]models.PortfolioItemForAI)

	for _, user := range freelancerUsers {
		// Пропускаем тех, кто уже откликнулся (опционально - можно убрать эту проверку)
		// if alreadyResponded[user.ID] {
		// 	continue
		// }

		profile, err := s.profile.GetProfile(ctx, user.ID)
		if err != nil {
			continue // Пропускаем, если нет профиля
		}
		freelancerProfiles = append(freelancerProfiles, profile)

		portfolioItems, err := s.portfolio.List(ctx, user.ID)
		if err == nil {
			aiPortfolio := make([]models.PortfolioItemForAI, 0, len(portfolioItems))
			for _, item := range portfolioItems {
				desc := ""
				if item.Description != nil {
					desc = *item.Description
				}
				aiPortfolio = append(aiPortfolio, models.PortfolioItemForAI{
					Title:       item.Title,
					Description: desc,
					AITags:      item.AITags,
				})
			}
			freelancerPortfolios[user.ID] = aiPortfolio
		}
	}

	if len(freelancerProfiles) == 0 {
		return []models.SuitableFreelancer{}, nil
	}

	// Передаем в AI для анализа и выбора лучших
	return s.aiRecommendations.FindSuitableFreelancers(ctx, order, requirements, freelancerProfiles, freelancerPortfolios)
}

// StreamFindSuitableFreelancers находит подходящих фрилансеров для заказа потоково.
func (s *OrderService) StreamFindSuitableFreelancers(
	ctx context.Context,
	orderID uuid.UUID,
	userID uuid.UUID,
	userRole string,
	limit int,
	onDelta func(chunk string) error,
	onComplete func(data []models.SuitableFreelancer) error,
) error {
	if s.aiRecommendations == nil {
		return fmt.Errorf("order service: AI сервис недоступен")
	}

	if s.users == nil {
		return fmt.Errorf("order service: UserRepository недоступен")
	}

	order, requirements, _, err := s.repoOrders.GetByIDWithDetails(ctx, orderID)
	if err != nil {
		return fmt.Errorf("order service: не удалось получить заказ: %w", err)
	}

	// Проверка прав: только владелец заказа или admin могут искать исполнителей
	// Нормализуем роль для сравнения (на случай разных регистров)
	isAdmin := strings.ToLower(userRole) == "admin"
	isOwner := order.ClientID == userID

	if !isAdmin && !isOwner {
		return fmt.Errorf("order service: у вас нет прав на поиск исполнителей для этого заказа (заказ ID: %s, владелец: %s, ваш ID: %s, ваша роль: %s)",
			orderID, order.ClientID, userID, userRole)
	}

	// Получаем список фрилансеров, которые УЖЕ откликнулись на этот заказ
	proposals, err := s.repoProposals.ListProposals(ctx, orderID)
	if err != nil {
		return err
	}

	// Собираем ID фрилансеров, которые уже откликнулись
	alreadyResponded := make(map[uuid.UUID]bool)
	for _, p := range proposals {
		alreadyResponded[p.FreelancerID] = true
	}

	// Получаем ВСЕХ активных фрилансеров с платформы
	searchLimit := limit * 3
	if searchLimit > 100 {
		searchLimit = 100
	}

	freelancerUsers, err := s.users.ListFreelancers(ctx, searchLimit, 0)
	if err != nil {
		return fmt.Errorf("order service: не удалось получить список фрилансеров: %w", err)
	}

	if len(freelancerUsers) == 0 {
		return onComplete([]models.SuitableFreelancer{})
	}

	// Получаем профили и портфолио всех фрилансеров
	freelancerProfiles := make([]*models.Profile, 0, len(freelancerUsers))
	freelancerPortfolios := make(map[uuid.UUID][]models.PortfolioItemForAI)

	for _, user := range freelancerUsers {
		profile, err := s.profile.GetProfile(ctx, user.ID)
		if err != nil {
			continue
		}
		freelancerProfiles = append(freelancerProfiles, profile)

		portfolioItems, err := s.portfolio.List(ctx, user.ID)
		if err == nil {
			aiPortfolio := make([]models.PortfolioItemForAI, 0, len(portfolioItems))
			for _, item := range portfolioItems {
				desc := ""
				if item.Description != nil {
					desc = *item.Description
				}
				aiPortfolio = append(aiPortfolio, models.PortfolioItemForAI{
					Title:       item.Title,
					Description: desc,
					AITags:      item.AITags,
				})
			}
			freelancerPortfolios[user.ID] = aiPortfolio
		}
	}

	if len(freelancerProfiles) == 0 {
		return onComplete([]models.SuitableFreelancer{})
	}

	return s.aiRecommendations.StreamFindSuitableFreelancers(ctx, order, requirements, freelancerProfiles, freelancerPortfolios, onDelta, onComplete)
}

// AIChatAssistant обрабатывает запросы к AI помощнику.
func (s *OrderService) AIChatAssistant(
	ctx context.Context,
	userID uuid.UUID,
	userMessage string,
	userRole string,
	contextData map[string]interface{},
) (string, error) {
	if s.aiConversation == nil {
		return "", fmt.Errorf("order service: AI сервис недоступен")
	}

	return s.aiConversation.AIChatAssistant(ctx, userMessage, userRole, contextData)
}

// StreamAIChatAssistant обрабатывает запросы к AI помощнику потоково.
func (s *OrderService) StreamAIChatAssistant(
	ctx context.Context,
	userID uuid.UUID,
	userMessage string,
	userRole string,
	contextData map[string]interface{},
	onDelta func(chunk string) error,
) error {
	if s.aiConversation == nil {
		return fmt.Errorf("order service: AI сервис недоступен")
	}

	return s.aiConversation.StreamAIChatAssistant(ctx, userMessage, userRole, contextData, onDelta)
}

// ImproveProfile улучшает описание профиля с помощью AI.
func (s *OrderService) ImproveProfile(ctx context.Context, currentBio string, skills []string, experienceLevel string) (string, error) {
	if s.aiProfile == nil {
		return "", fmt.Errorf("order service: AI сервис недоступен")
	}

	return s.aiProfile.ImproveProfile(ctx, currentBio, skills, experienceLevel)
}

// StreamImproveProfile улучшает описание профиля потоково через AI.
func (s *OrderService) StreamImproveProfile(ctx context.Context, currentBio string, skills []string, experienceLevel string, onDelta func(chunk string) error) error {
	if s.aiProfile == nil {
		return fmt.Errorf("order service: AI сервис недоступен")
	}
	return s.aiProfile.StreamImproveProfile(ctx, currentBio, skills, experienceLevel, onDelta)
}

// ImprovePortfolioItem улучшает описание работы в портфолио с помощью AI.
func (s *OrderService) ImprovePortfolioItem(ctx context.Context, title, description string, aiTags []string) (string, error) {
	if s.aiProfile == nil {
		return "", fmt.Errorf("order service: AI сервис недоступен")
	}

	return s.aiProfile.ImprovePortfolioItem(ctx, title, description, aiTags)
}

// StreamImprovePortfolioItem улучшает описание работы в портфолио потоково через AI.
func (s *OrderService) StreamImprovePortfolioItem(ctx context.Context, title, description string, aiTags []string, onDelta func(chunk string) error) error {
	if s.aiProfile == nil {
		return fmt.Errorf("order service: AI сервис недоступен")
	}
	return s.aiProfile.StreamImprovePortfolioItem(ctx, title, description, aiTags, onDelta)
}
