package service

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"

	"github.com/ignatzorin/freelance-backend/internal/models"
	"github.com/ignatzorin/freelance-backend/internal/repository"
)

// ExtendedSeedService генерирует реалистичные данные для тестирования.
type ExtendedSeedService struct {
	db                   *sqlx.DB
	userRepo             *repository.UserRepository
	orderRepo            *repository.OrderRepository
	paymentRepo          *repository.PaymentRepository
	reviewRepo           *repository.ReviewRepository
	favoriteRepo         *repository.FavoriteRepository
	proposalTemplateRepo *repository.ProposalTemplateRepository
	catalogRepo          *repository.CatalogRepository
	mediaRepo            *repository.MediaRepository
	portfolioRepo        *repository.PortfolioRepository
	notificationRepo     *repository.NotificationRepository
	withdrawalRepo       *repository.WithdrawalRepository
	disputeRepo          *repository.DisputeRepository
	reportRepo           *repository.ReportRepository
	verificationRepo     *repository.VerificationRepository
}

func NewExtendedSeedService(
	db *sqlx.DB,
	userRepo *repository.UserRepository,
	orderRepo *repository.OrderRepository,
	mediaRepo *repository.MediaRepository,
	portfolioRepo *repository.PortfolioRepository,
	notificationRepo *repository.NotificationRepository,
	paymentRepo *repository.PaymentRepository,
	reviewRepo *repository.ReviewRepository,
	favoriteRepo *repository.FavoriteRepository,
	withdrawalRepo *repository.WithdrawalRepository,
	disputeRepo *repository.DisputeRepository,
	reportRepo *repository.ReportRepository,
	verificationRepo *repository.VerificationRepository,
	catalogRepo *repository.CatalogRepository,
	proposalTemplateRepo *repository.ProposalTemplateRepository,
) *ExtendedSeedService {
	return &ExtendedSeedService{
		db:                   db,
		userRepo:             userRepo,
		orderRepo:            orderRepo,
		mediaRepo:            mediaRepo,
		portfolioRepo:        portfolioRepo,
		notificationRepo:     notificationRepo,
		paymentRepo:          paymentRepo,
		reviewRepo:           reviewRepo,
		favoriteRepo:         favoriteRepo,
		withdrawalRepo:       withdrawalRepo,
		disputeRepo:          disputeRepo,
		reportRepo:           reportRepo,
		verificationRepo:     verificationRepo,
		catalogRepo:          catalogRepo,
		proposalTemplateRepo: proposalTemplateRepo,
	}
}

type ExtendedSeedResult struct {
	Accounts             []SeedAccountInfo `json:"accounts"`
	OrdersCreated        int               `json:"orders_created"`
	ProposalsCreated     int               `json:"proposals_created"`
	ReviewsCreated       int               `json:"reviews_created"`
	MessagesCreated      int               `json:"messages_created"`
	ConversationsCreated int               `json:"conversations_created"`
	MediaCreated         int               `json:"media_created"`
	PortfolioCreated     int               `json:"portfolio_created"`
	NotificationsCreated int               `json:"notifications_created"`
	EscrowCreated        int               `json:"escrow_created"`
	WithdrawalsCreated   int               `json:"withdrawals_created"`
	DisputesCreated      int               `json:"disputes_created"`
	ReportsCreated       int               `json:"reports_created"`
}

type ExtendedSeedOptions struct {
	Reset     bool
	NumUsers  int
	NumOrders int
}

var (
	extRussianFirstNames = []string{
		"Александр", "Дмитрий", "Максим", "Сергей", "Андрей", "Алексей", "Артём", "Илья",
		"Иван", "Михаил", "Никита", "Роман", "Егор", "Павел", "Владимир", "Константин",
		"Анна", "Мария", "Елена", "Ольга", "Татьяна", "Наталья", "Ирина", "Светлана",
		"Екатерина", "Юлия", "Анастасия", "Дарья", "Виктория", "Полина", "София", "Алиса",
	}
	extRussianLastNames = []string{
		"Иванов", "Петров", "Смирнов", "Козлов", "Соколов", "Попов", "Лебедев", "Новиков",
		"Морозов", "Волков", "Соловьёв", "Васильев", "Зайцев", "Павлов", "Семёнов", "Голубев",
	}
	extRussianCities = []string{
		"Москва", "Санкт-Петербург", "Новосибирск", "Екатеринбург", "Казань", "Нижний Новгород",
		"Челябинск", "Самара", "Омск", "Ростов-на-Дону", "Уфа", "Красноярск", "Воронеж",
	}
	extTechSkills = []string{
		"JavaScript", "TypeScript", "React", "Vue.js", "Angular", "Node.js", "Python", "Go",
		"Java", "PHP", "PostgreSQL", "MySQL", "MongoDB", "Docker", "AWS", "Git",
	}
	extDesignSkills    = []string{"Figma", "Adobe XD", "Photoshop", "UI/UX Design", "Web Design"}
	extMarketingSkills = []string{"SEO", "SMM", "Контекстная реклама", "Копирайтинг"}
)

var freelancerBios = []string{
	"Full-stack разработчик с 5+ годами опыта. Специализируюсь на React и Node.js. Создаю качественные веб-приложения под ключ.",
	"Backend разработчик, работаю с Go и Python. Опыт построения высоконагруженных систем и микросервисной архитектуры.",
	"Frontend разработчик, эксперт в React/TypeScript. Создаю современные, быстрые и отзывчивые интерфейсы.",
	"Мобильный разработчик (iOS/Android). Работаю с React Native и Flutter. Более 20 опубликованных приложений.",
	"DevOps инженер. Настройка CI/CD, Docker, Kubernetes, AWS. Автоматизация всех процессов разработки.",
	"UI/UX дизайнер с опытом 7 лет. Создаю интуитивные интерфейсы, которые любят пользователи.",
	"Data Scientist. Машинное обучение, анализ данных, Python. Помогу извлечь ценность из ваших данных.",
	"WordPress разработчик. Создание сайтов, интернет-магазинов, кастомных плагинов и тем.",
	"QA инженер. Ручное и автоматизированное тестирование. Selenium, Cypress, Jest.",
	"SEO специалист. Продвижение сайтов в поисковых системах, аудит, оптимизация.",
}

var clientBios = []string{
	"Владелец интернет-магазина. Ищу надёжных исполнителей для развития бизнеса.",
	"Стартап в сфере EdTech. Создаём платформу онлайн-обучения.",
	"Маркетинговое агентство. Регулярно ищем фрилансеров для проектов клиентов.",
	"IT компания. Аутсорсим часть задач на фриланс.",
	"Предприниматель. Развиваю несколько онлайн-проектов.",
}

var orderTitles = []string{
	"Разработка интернет-магазина на React",
	"Создание мобильного приложения для доставки",
	"Дизайн лендинга для стартапа",
	"Разработка CRM системы",
	"Настройка CI/CD для проекта",
	"Создание Telegram бота",
	"Редизайн корпоративного сайта",
	"Разработка REST API",
	"Интеграция платёжной системы",
	"Создание админ-панели",
	"Оптимизация производительности сайта",
	"Разработка системы бронирования",
	"Создание дашборда аналитики",
	"Миграция на новый сервер",
	"Разработка чат-бота поддержки",
}

var orderDescriptions = []string{
	"Нужен современный интернет-магазин с каталогом товаров, корзиной, личным кабинетом и интеграцией с платёжными системами. Дизайн уже есть в Figma.",
	"Требуется разработать мобильное приложение для iOS и Android. Основной функционал: авторизация, каталог, корзина, отслеживание заказа на карте.",
	"Нужен продающий лендинг для нового продукта. Требуется адаптивный дизайн, анимации, форма заявки с интеграцией в CRM.",
	"Разработка CRM для отдела продаж: управление клиентами, сделками, задачами. Интеграция с телефонией и почтой.",
	"Настроить автоматическую сборку, тестирование и деплой проекта. Стек: Node.js, PostgreSQL, Docker.",
	"Создать Telegram бота для автоматизации работы с клиентами. Приём заявок, ответы на FAQ, уведомления.",
	"Полный редизайн корпоративного сайта. Нужен современный вид, улучшенная навигация, мобильная версия.",
	"Разработать REST API для мобильного приложения. Авторизация JWT, CRUD операции, документация Swagger.",
	"Интегрировать Stripe и ЮKassa в существующий сайт. Обработка платежей, подписки, возвраты.",
	"Создать админ-панель для управления контентом сайта. Редактирование страниц, загрузка медиа, статистика.",
}

var proposalTexts = []string{
	"Здравствуйте! Внимательно изучил ваше ТЗ. Имею большой опыт в подобных проектах. Готов приступить сразу после обсуждения деталей.",
	"Добрый день! Заинтересовал ваш проект. Работал над похожими задачами, могу показать примеры. Предлагаю созвониться для обсуждения.",
	"Приветствую! Это именно тот тип проектов, в которых я специализируюсь. Гарантирую качественный результат в срок.",
	"Здравствуйте! Готов взяться за ваш проект. Есть релевантный опыт и все необходимые навыки. Давайте обсудим детали.",
	"Добрый день! Проект интересный, готов предложить оптимальное решение. Работаю по договору, даю гарантию на код.",
}

var reviewComments = []string{
	"Отличная работа! Всё сделано качественно и в срок. Рекомендую!",
	"Профессиональный подход, хорошая коммуникация. Буду обращаться ещё.",
	"Выполнил всё по ТЗ, оперативно вносил правки. Спасибо!",
	"Хороший специалист, разбирается в своём деле. Результатом доволен.",
	"Работа выполнена на высоком уровне. Всегда на связи, отвечает быстро.",
	"Рекомендую данного исполнителя. Качественно, быстро, по адекватной цене.",
	"Всё супер! Проект сдан раньше срока, качество отличное.",
	"Приятно работать с профессионалом. Обязательно обращусь снова.",
}

var chatMessages = []string{
	"Здравствуйте! Готов обсудить детали проекта.",
	"Добрый день! Когда удобно созвониться?",
	"Отправил макеты на согласование, посмотрите пожалуйста.",
	"Сделал первую версию, жду обратную связь.",
	"Внёс правки по вашим комментариям.",
	"Как продвигается работа?",
	"Всё идёт по плану, завтра покажу результат.",
	"Отлично, спасибо за оперативность!",
	"Есть пара вопросов по ТЗ, можем обсудить?",
	"Да, конечно, слушаю.",
	"Проект готов, можете проверять.",
	"Проверил, всё отлично! Принимаю работу.",
}

var proposalTemplates = []struct {
	Title   string
	Content string
}{
	{"Стандартный отклик", "Здравствуйте!\n\nВнимательно изучил ваш проект. Имею релевантный опыт и готов приступить к работе.\n\nПредлагаю обсудить детали в личных сообщениях.\n\nС уважением"},
	{"Для срочных проектов", "Добрый день!\n\nВижу, что проект срочный. Могу начать работу сегодня и уложиться в ваши сроки.\n\nДавайте обсудим детали."},
	{"С портфолио", "Здравствуйте!\n\nЗаинтересовал ваш проект. Работал над похожими задачами, вот примеры моих работ: [ссылки]\n\nГотов обсудить детали и ответить на вопросы."},
}

func (s *ExtendedSeedService) SeedRealisticData(ctx context.Context) (*ExtendedSeedResult, error) {
	return s.SeedRealisticDataWithOptions(ctx, ExtendedSeedOptions{
		Reset:     true,
		NumUsers:  40,
		NumOrders: 120,
	})
}

func (s *ExtendedSeedService) SeedRealisticDataWithOptions(ctx context.Context, opts ExtendedSeedOptions) (*ExtendedSeedResult, error) {
	rand.Seed(time.Now().UnixNano())
	result := &ExtendedSeedResult{}

	if opts.Reset {
		if err := s.resetData(ctx); err != nil {
			return nil, fmt.Errorf("reset data: %w", err)
		}
	}

	categories, _ := s.catalogRepo.ListCategories(ctx)
	skills, _ := s.catalogRepo.ListSkills(ctx)
	skillNames := make([]string, 0, len(skills))
	skillsByCategory := make(map[uuid.UUID][]models.Skill, 16)
	for _, sk := range skills {
		skillNames = append(skillNames, sk.Name)
		if sk.CategoryID != nil {
			skillsByCategory[*sk.CategoryID] = append(skillsByCategory[*sk.CategoryID], sk)
		}
	}

	systemMediaIDs, mediaCreated := s.createSystemMedia(ctx)
	result.MediaCreated += mediaCreated

	users, accounts, usersMediaCreated, err := s.createUsers(ctx, opts.NumUsers, skillNames, systemMediaIDs)
	if err != nil {
		return nil, fmt.Errorf("create users: %w", err)
	}
	result.Accounts = accounts
	result.MediaCreated += usersMediaCreated

	var clients, freelancers []*models.User
	for _, u := range users {
		if u.Role == "client" {
			clients = append(clients, u)
		} else {
			freelancers = append(freelancers, u)
		}
	}

	for _, client := range clients {
		amount := float64(rand.Intn(250000) + 50000)
		if _, err := s.paymentRepo.Deposit(ctx, client.ID, amount, "Пополнение баланса"); err == nil {
			result.NotificationsCreated += s.createNotification(ctx, client.ID, map[string]any{
				"type":        "balance_deposit",
				"amount":      amount,
				"description": "Пополнение баланса",
			})
		}
	}

	for _, f := range freelancers {
		for _, tmpl := range proposalTemplates {
			t := &models.ProposalTemplate{UserID: f.ID, Title: tmpl.Title, Content: tmpl.Content}
			_ = s.proposalTemplateRepo.Create(ctx, t)
		}
	}

	portfolioCreated, portfolioMediaCreated := s.createPortfolios(ctx, freelancers, systemMediaIDs)
	result.PortfolioCreated = portfolioCreated
	result.MediaCreated += portfolioMediaCreated

	orders, err := s.createOrders(ctx, clients, opts.NumOrders, categories, skillsByCategory, systemMediaIDs)
	if err != nil {
		return nil, fmt.Errorf("create orders: %w", err)
	}
	result.OrdersCreated = len(orders)

	proposalCount, accepted, err := s.createProposalsAndAccept(ctx, orders, freelancers)
	if err != nil {
		return nil, fmt.Errorf("create proposals: %w", err)
	}
	result.ProposalsCreated = proposalCount

	convCount, msgCount := s.createConversationsAndMessages(ctx, accepted, systemMediaIDs)
	result.ConversationsCreated = convCount
	result.MessagesCreated = msgCount

	escrowCreated, disputesCreated := s.createEscrowAndDisputes(ctx, accepted)
	result.EscrowCreated = escrowCreated
	result.DisputesCreated = disputesCreated

	reviewCount, err := s.completeOrdersAndReview(ctx, orders, freelancers)
	if err != nil {
		return nil, fmt.Errorf("complete orders: %w", err)
	}
	result.ReviewsCreated = reviewCount

	withdrawalsCreated := s.createWithdrawals(ctx, freelancers)
	result.WithdrawalsCreated = withdrawalsCreated

	s.createFavorites(ctx, users, orders, freelancers)

	result.ReportsCreated = s.createReports(ctx, users, orders)

	result.NotificationsCreated += s.createNotifications(ctx, users, orders)

	return result, nil
}

func (s *ExtendedSeedService) createUsers(ctx context.Context, count int, skillNames []string, systemMediaIDs []uuid.UUID) ([]*models.User, []SeedAccountInfo, int, error) {
	var users []*models.User
	var accounts []SeedAccountInfo
	mediaCreated := 0
	passwordHash, _ := bcrypt.GenerateFromPassword([]byte("Password123"), bcrypt.DefaultCost)
	domains := []string{"gmail.com", "yandex.ru", "mail.ru"}

	for i := 0; i < count; i++ {
		firstName := extRussianFirstNames[rand.Intn(len(extRussianFirstNames))]
		lastName := extRussianLastNames[rand.Intn(len(extRussianLastNames))]
		username := fmt.Sprintf("%s_%s_%d", toLatin(firstName), toLatin(lastName), rand.Intn(1000))
		email := fmt.Sprintf("%s.%s%d@%s", toLatin(firstName), toLatin(lastName), rand.Intn(100), domains[rand.Intn(len(domains))])

		role := "freelancer"
		if i < maxInt(5, count/6) {
			role = "client"
		}

		user := &models.User{
			Email:        email,
			Username:     username,
			PasswordHash: string(passwordHash),
			Role:         role,
			IsActive:     true,
		}
		if err := s.userRepo.Create(ctx, user); err != nil {
			continue // пропускаем дубликаты
		}

		// Профиль
		displayName := fmt.Sprintf("%s %s", firstName, lastName)
		location := extRussianCities[rand.Intn(len(extRussianCities))]
		var bio string
		var skills []string
		var hourlyRate *float64
		var photoID *uuid.UUID
		var phone *string
		var telegram *string
		var website *string
		var companyName *string

		if role == "freelancer" {
			bio = freelancerBios[rand.Intn(len(freelancerBios))]
			skills = s.randomStringsFromPool(skillNames, 5, 10)
			rate := float64(1000 + rand.Intn(4000))
			hourlyRate = &rate
		} else {
			bio = clientBios[rand.Intn(len(clientBios))]
			skills = s.randomStringsFromPool(skillNames, 0, 2)
			if rand.Intn(2) == 0 {
				co := []string{"ООО «Север»", "ИП Иванов", "ООО «Лаборатория»", "Startup Studio"}
				v := co[rand.Intn(len(co))]
				companyName = &v
			}
		}

		expLevels := []string{"junior", "middle", "senior"}
		if len(systemMediaIDs) > 0 && rand.Intn(100) < 85 {
			photoID = &systemMediaIDs[0]
		}
		if rand.Intn(100) < 70 {
			v := fmt.Sprintf("+7%09d", rand.Intn(1_000_000_000))
			phone = &v
		}
		if rand.Intn(100) < 60 {
			v := fmt.Sprintf("@%s", username)
			telegram = &v
		}
		if rand.Intn(100) < 40 {
			v := fmt.Sprintf("https://%s.dev", username)
			website = &v
		}

		profile := &models.Profile{
			UserID:          user.ID,
			DisplayName:     displayName,
			Bio:             &bio,
			Location:        &location,
			Skills:          skills,
			HourlyRate:      hourlyRate,
			ExperienceLevel: expLevels[rand.Intn(len(expLevels))],
			PhotoID:         photoID,
			Phone:           phone,
			Telegram:        telegram,
			Website:         website,
			CompanyName:     companyName,
		}
		s.userRepo.UpsertProfile(ctx, profile)

		emailCode := fmt.Sprintf("%06d", rand.Intn(1_000_000))
		_, _ = s.verificationRepo.CreateCode(ctx, user.ID, models.VerificationTypeEmail, emailCode, time.Now().Add(72*time.Hour))
		_, _ = s.verificationRepo.VerifyCode(ctx, user.ID, models.VerificationTypeEmail, emailCode)
		if rand.Intn(100) < 55 {
			phoneCode := fmt.Sprintf("%06d", rand.Intn(1_000_000))
			_, _ = s.verificationRepo.CreateCode(ctx, user.ID, models.VerificationTypePhone, phoneCode, time.Now().Add(72*time.Hour))
			_, _ = s.verificationRepo.VerifyCode(ctx, user.ID, models.VerificationTypePhone, phoneCode)
		}
		if rand.Intn(100) < 25 {
			_, _ = s.db.ExecContext(ctx, `UPDATE users SET identity_verified = TRUE WHERE id = $1`, user.ID)
		}

		users = append(users, user)
		accounts = append(accounts, SeedAccountInfo{
			Email:    email,
			Username: username,
			Password: "Password123",
			Role:     role,
		})
	}
	return users, accounts, mediaCreated, nil
}

func (s *ExtendedSeedService) randomStringsFromPool(pool []string, min, max int) []string {
	if len(pool) == 0 {
		return nil
	}
	if max < min {
		max = min
	}
	count := min
	if max > min {
		count = min + rand.Intn(max-min+1)
	}
	if count <= 0 {
		return nil
	}
	if count > len(pool) {
		count = len(pool)
	}
	indices := rand.Perm(len(pool))[:count]
	out := make([]string, 0, count)
	for _, idx := range indices {
		out = append(out, pool[idx])
	}
	return out
}

func (s *ExtendedSeedService) createOrders(ctx context.Context, clients []*models.User, count int, categories []models.Category, skillsByCategory map[uuid.UUID][]models.Skill, systemMediaIDs []uuid.UUID) ([]*models.Order, error) {
	var orders []*models.Order
	statuses := []string{models.OrderStatusPublished, models.OrderStatusPublished, models.OrderStatusPublished, models.OrderStatusInProgress, models.OrderStatusCompleted}
	categoryIDs := make([]uuid.UUID, 0, len(categories))
	for _, c := range categories {
		categoryIDs = append(categoryIDs, c.ID)
	}

	for i := 0; i < count; i++ {
		client := clients[rand.Intn(len(clients))]
		title := orderTitles[rand.Intn(len(orderTitles))]
		desc := orderDescriptions[rand.Intn(len(orderDescriptions))]

		budgetMin := float64(10000 + rand.Intn(40000))
		budgetMax := budgetMin + float64(rand.Intn(30000))
		deadline := time.Now().Add(time.Duration(7+rand.Intn(30)) * 24 * time.Hour)

		order := &models.Order{
			ClientID:    client.ID,
			Title:       title,
			Description: desc,
			BudgetMin:   &budgetMin,
			BudgetMax:   &budgetMax,
			Status:      statuses[rand.Intn(len(statuses))],
			DeadlineAt:  &deadline,
		}

		if len(categoryIDs) > 0 && rand.Intn(100) < 92 {
			cid := categoryIDs[rand.Intn(len(categoryIDs))]
			order.CategoryID = &cid
		}

		var reqs []models.OrderRequirement
		var chosenSkills []string
		if order.CategoryID != nil {
			if byCat, ok := skillsByCategory[*order.CategoryID]; ok && len(byCat) > 0 {
				max := minInt(6, len(byCat))
				n := 2 + rand.Intn(max-1)
				rand.Shuffle(len(byCat), func(i, j int) { byCat[i], byCat[j] = byCat[j], byCat[i] })
				for _, sk := range byCat[:n] {
					chosenSkills = append(chosenSkills, sk.Name)
				}
			}
		}
		if len(chosenSkills) == 0 {
			chosenSkills = s.randomStringsFromPool(extTechSkills, 2, 5)
		}
		for _, sk := range chosenSkills {
			reqs = append(reqs, models.OrderRequirement{Skill: sk, Level: "middle"})
		}

		var attachmentIDs []uuid.UUID
		if len(systemMediaIDs) > 0 && rand.Intn(100) < 40 {
			attachmentIDs = append(attachmentIDs, systemMediaIDs[rand.Intn(len(systemMediaIDs))])
			if rand.Intn(100) < 30 {
				attachmentIDs = append(attachmentIDs, systemMediaIDs[rand.Intn(len(systemMediaIDs))])
			}
		}

		if err := s.orderRepo.Create(ctx, order, reqs, attachmentIDs); err != nil {
			continue
		}
		orders = append(orders, order)
	}
	return orders, nil
}

type AcceptedAssignment struct {
	OrderID      uuid.UUID
	ClientID     uuid.UUID
	FreelancerID uuid.UUID
	Status       string
	FinalAmount  float64
}

func (s *ExtendedSeedService) createProposalsAndAccept(ctx context.Context, orders []*models.Order, freelancers []*models.User) (int, []AcceptedAssignment, error) {
	count := 0
	var accepted []AcceptedAssignment
	for _, order := range orders {
		if order.Status == models.OrderStatusDraft {
			continue
		}
		// 2-4 отклика на заказ
		numProposals := 2 + rand.Intn(3)
		usedFreelancers := make(map[uuid.UUID]bool)

		for j := 0; j < numProposals && j < len(freelancers); j++ {
			f := freelancers[rand.Intn(len(freelancers))]
			if usedFreelancers[f.ID] || f.ID == order.ClientID {
				continue
			}
			usedFreelancers[f.ID] = true

			price := *order.BudgetMin + float64(rand.Intn(int(*order.BudgetMax-*order.BudgetMin)))
			text := proposalTexts[rand.Intn(len(proposalTexts))]

			proposal := &models.Proposal{
				OrderID:        order.ID,
				FreelancerID:   f.ID,
				ProposedAmount: &price,
				CoverLetter:    text,
				Status:         models.ProposalStatusPending,
			}
			if err := s.orderRepo.CreateProposal(ctx, proposal); err != nil {
				continue
			}
			count++

			shouldAccept := j == 0 && (order.Status == models.OrderStatusInProgress || order.Status == models.OrderStatusCompleted)
			if shouldAccept {
				if _, err := s.orderRepo.UpdateProposalStatus(ctx, proposal.ID, models.ProposalStatusAccepted); err == nil {
					order.FreelancerID = &f.ID
					_ = s.orderRepo.SetOrderFreelancer(ctx, order.ID, f.ID, price)
					accepted = append(accepted, AcceptedAssignment{
						OrderID:      order.ID,
						ClientID:     order.ClientID,
						FreelancerID: f.ID,
						Status:       order.Status,
						FinalAmount:  price,
					})
				}
			}
		}
	}
	return count, accepted, nil
}

func (s *ExtendedSeedService) completeOrdersAndReview(ctx context.Context, orders []*models.Order, freelancers []*models.User) (int, error) {
	reviewCount := 0
	for _, order := range orders {
		if order.Status != models.OrderStatusCompleted {
			continue
		}
		// Находим принятый отклик
		proposals, _ := s.orderRepo.ListProposals(ctx, order.ID)
		var acceptedFreelancer uuid.UUID
		for _, p := range proposals {
			if p.Status == models.ProposalStatusAccepted {
				acceptedFreelancer = p.FreelancerID
				break
			}
		}
		if acceptedFreelancer == uuid.Nil && len(freelancers) > 0 {
			// Принимаем случайный отклик
			f := freelancers[rand.Intn(len(freelancers))]
			acceptedFreelancer = f.ID
		}
		if acceptedFreelancer == uuid.Nil {
			continue
		}

		// Отзыв от клиента
		rating := 4 + rand.Intn(2) // 4-5
		comment := reviewComments[rand.Intn(len(reviewComments))]
		clientReview := &models.Review{
			OrderID:    order.ID,
			ReviewerID: order.ClientID,
			ReviewedID: acceptedFreelancer,
			Rating:     rating,
			Comment:    &comment,
		}
		if err := s.reviewRepo.Create(ctx, clientReview); err == nil {
			reviewCount++
		}

		// Отзыв от фрилансера
		comment2 := "Приятный заказчик, чёткое ТЗ, быстрая оплата. Рекомендую!"
		freelancerReview := &models.Review{
			OrderID:    order.ID,
			ReviewerID: acceptedFreelancer,
			ReviewedID: order.ClientID,
			Rating:     5,
			Comment:    &comment2,
		}
		if err := s.reviewRepo.Create(ctx, freelancerReview); err == nil {
			reviewCount++
		}
	}
	return reviewCount, nil
}

func (s *ExtendedSeedService) createFavorites(ctx context.Context, users []*models.User, orders []*models.Order, freelancers []*models.User) {
	for _, u := range users {
		// Добавляем 2-3 заказа в избранное
		for i := 0; i < 2+rand.Intn(2); i++ {
			if len(orders) > 0 {
				order := orders[rand.Intn(len(orders))]
				s.favoriteRepo.Add(ctx, u.ID, models.FavoriteTypeOrder, order.ID)
			}
		}
		// Клиенты добавляют фрилансеров в избранное
		if u.Role == "client" && len(freelancers) > 0 {
			f := freelancers[rand.Intn(len(freelancers))]
			s.favoriteRepo.Add(ctx, u.ID, models.FavoriteTypeFreelancer, f.ID)
		}
	}
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func (s *ExtendedSeedService) resetData(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, `
		TRUNCATE TABLE
			message_reactions,
			message_attachments,
			messages,
			conversations,
			favorites,
			reviews,
			proposals,
			order_attachments,
			order_requirements,
			order_history,
			disputes,
			escrow,
			transactions,
			user_balances,
			withdrawals,
			reports,
			notifications,
			portfolio_media,
			portfolio_items,
			verification_codes,
			user_sessions,
			ai_sessions,
			media_files,
			orders,
			profiles,
			users
		CASCADE
	`)
	return err
}

func (s *ExtendedSeedService) createSystemMedia(ctx context.Context) ([]uuid.UUID, int) {
	paths := []string{
		"seed/avatar.svg",
		"seed/attachment.svg",
		"seed/portfolio.svg",
	}
	var ids []uuid.UUID
	created := 0
	for _, p := range paths {
		media := &models.MediaFile{
			UserID:   nil,
			FilePath: p,
			FileType: "image/svg+xml",
			FileSize: 512,
			IsPublic: true,
		}
		if err := s.mediaRepo.Create(ctx, media); err == nil {
			ids = append(ids, media.ID)
			created++
		}
	}
	return ids, created
}

func (s *ExtendedSeedService) createPortfolios(ctx context.Context, freelancers []*models.User, systemMediaIDs []uuid.UUID) (int, int) {
	itemsCreated := 0
	mediaCreated := 0
	tagPool := []string{"React", "Next.js", "Go", "PostgreSQL", "Figma", "UI/UX", "Docker", "Kubernetes", "SEO", "Analytics"}

	for _, f := range freelancers {
		numItems := 1 + rand.Intn(4)
		for i := 0; i < numItems; i++ {
			coverID := uuid.Nil
			cover := &models.MediaFile{
				UserID:   &f.ID,
				FilePath: "seed/portfolio.svg",
				FileType: "image/svg+xml",
				FileSize: 640,
				IsPublic: true,
			}
			if err := s.mediaRepo.Create(ctx, cover); err == nil {
				coverID = cover.ID
				mediaCreated++
			} else if len(systemMediaIDs) > 0 {
				coverID = systemMediaIDs[minInt(2, len(systemMediaIDs)-1)]
			}

			title := fmt.Sprintf("Проект %d: %s", i+1, orderTitles[rand.Intn(len(orderTitles))])
			desc := "Кейс из портфолио: задача, подход, результат. Готов показать детали и репозиторий по запросу."
			tags := s.randomStringsFromPool(tagPool, 2, 5)

			item := &models.PortfolioItem{
				UserID:       f.ID,
				Title:        title,
				Description:  &desc,
				AITags:       tags,
				CoverMediaID: nil,
				ExternalLink: nil,
			}
			if coverID != uuid.Nil {
				item.CoverMediaID = &coverID
			}

			var mediaIDs []uuid.UUID
			if coverID != uuid.Nil {
				mediaIDs = append(mediaIDs, coverID)
			}
			for j := 0; j < rand.Intn(3); j++ {
				m := &models.MediaFile{
					UserID:   &f.ID,
					FilePath: "seed/portfolio.svg",
					FileType: "image/svg+xml",
					FileSize: 640,
					IsPublic: true,
				}
				if err := s.mediaRepo.Create(ctx, m); err == nil {
					mediaIDs = append(mediaIDs, m.ID)
					mediaCreated++
				}
			}

			if err := s.portfolioRepo.Create(ctx, item, mediaIDs); err == nil {
				itemsCreated++
			}
		}
	}

	return itemsCreated, mediaCreated
}

func (s *ExtendedSeedService) createConversationsAndMessages(ctx context.Context, accepted []AcceptedAssignment, systemMediaIDs []uuid.UUID) (int, int) {
	conversationsCreated := 0
	messagesCreated := 0
	emojis := []string{"👍", "🔥", "✅", "🎯", "👏", "🤝"}

	for _, a := range accepted {
		orderID := a.OrderID
		conv, err := s.orderRepo.GetConversationByParticipants(ctx, orderID, a.ClientID, a.FreelancerID)
		if err != nil {
			conv = &models.Conversation{
				OrderID:      &orderID,
				ClientID:     a.ClientID,
				FreelancerID: a.FreelancerID,
			}
			if err := s.orderRepo.CreateConversation(ctx, conv); err != nil {
				continue
			}
			conversationsCreated++
		}

		msgCount := 6 + rand.Intn(10)
		var lastMessageID *uuid.UUID
		for i := 0; i < msgCount; i++ {
			authorType := "client"
			authorID := &a.ClientID
			if i%2 == 1 {
				authorType = "freelancer"
				authorID = &a.FreelancerID
			}

			msg := &models.Message{
				ConversationID: conv.ID,
				AuthorType:     authorType,
				AuthorID:       authorID,
				Content:        chatMessages[rand.Intn(len(chatMessages))],
			}
			if lastMessageID != nil && rand.Intn(100) < 18 {
				msg.ParentMessageID = lastMessageID
			}
			if rand.Intn(100) < 12 {
				meta, _ := json.Marshal(map[string]any{"source": "seed", "confidence": 0.82})
				msg.AIMetadata = meta
			}
			if err := s.orderRepo.AddMessage(ctx, msg); err != nil {
				continue
			}
			messagesCreated++
			lastMessageID = &msg.ID

			if len(systemMediaIDs) > 0 && rand.Intn(100) < 15 {
				_ = s.orderRepo.AddMessageAttachments(ctx, msg.ID, []uuid.UUID{systemMediaIDs[minInt(1, len(systemMediaIDs)-1)]})
			}
			if rand.Intn(100) < 22 {
				userID := a.ClientID
				if rand.Intn(2) == 0 {
					userID = a.FreelancerID
				}
				_, _ = s.orderRepo.AddMessageReaction(ctx, msg.ID, userID, emojis[rand.Intn(len(emojis))])
			}
		}
	}

	return conversationsCreated, messagesCreated
}

func (s *ExtendedSeedService) createEscrowAndDisputes(ctx context.Context, accepted []AcceptedAssignment) (int, int) {
	escrowCreated := 0
	disputesCreated := 0
	reasons := []string{
		"Есть разногласия по объёму работ",
		"Нужна дополнительная проверка результата",
		"Сроки сдвинулись, хотим уточнить условия",
	}

	for _, a := range accepted {
		if a.Status != models.OrderStatusInProgress && a.Status != models.OrderStatusCompleted {
			continue
		}

		escrow, err := s.paymentRepo.CreateEscrow(ctx, a.OrderID, a.ClientID, a.FreelancerID, a.FinalAmount)
		if err != nil {
			if err == repository.ErrInsufficientFunds {
				_, _ = s.paymentRepo.Deposit(ctx, a.ClientID, a.FinalAmount*2, "Пополнение для escrow")
				escrow, err = s.paymentRepo.CreateEscrow(ctx, a.OrderID, a.ClientID, a.FreelancerID, a.FinalAmount)
			}
		}
		if err != nil {
			continue
		}
		escrowCreated++

		if rand.Intn(100) < 12 {
			_, _ = s.db.ExecContext(ctx, `UPDATE escrow SET status = 'disputed' WHERE id = $1`, escrow.ID)
			d := &models.Dispute{
				EscrowID:    escrow.ID,
				OrderID:     a.OrderID,
				InitiatorID: a.ClientID,
				Reason:      reasons[rand.Intn(len(reasons))],
				Status:      models.DisputeStatusOpen,
			}
			if err := s.disputeRepo.Create(ctx, d); err == nil {
				disputesCreated++
				if rand.Intn(100) < 45 {
					resolution := "Спор решён: согласовали доработки и новый срок"
					_ = s.disputeRepo.UpdateStatus(ctx, d.ID, models.DisputeStatusUnderReview, resolution, nil)
				}
			}
			continue
		}

		if a.Status == models.OrderStatusCompleted {
			_, _ = s.paymentRepo.ReleaseEscrow(ctx, a.OrderID)
		}
	}

	return escrowCreated, disputesCreated
}

func (s *ExtendedSeedService) createWithdrawals(ctx context.Context, freelancers []*models.User) int {
	created := 0
	banks := []string{"Тинькофф", "Сбер", "Альфа-Банк", "ВТБ"}
	for _, f := range freelancers {
		if rand.Intn(100) >= 30 {
			continue
		}
		amount := float64(1000 + rand.Intn(15000))
		last4 := fmt.Sprintf("%04d", rand.Intn(10000))
		bank := banks[rand.Intn(len(banks))]
		w, err := s.withdrawalRepo.Create(ctx, f.ID, amount, last4, bank)
		if err != nil {
			continue
		}
		created++
		if rand.Intn(100) < 60 {
			_ = s.withdrawalRepo.UpdateStatus(ctx, w.ID, "completed", nil)
		} else if rand.Intn(100) < 25 {
			reason := "Не удалось подтвердить реквизиты"
			_ = s.withdrawalRepo.UpdateStatus(ctx, w.ID, "rejected", &reason)
		}
	}
	return created
}

func (s *ExtendedSeedService) createReports(ctx context.Context, users []*models.User, orders []*models.Order) int {
	created := 0
	reasons := []string{"spam", "abuse", "scam_suspected", "inappropriate_content"}
	for i := 0; i < 10 && len(users) > 0 && len(orders) > 0; i++ {
		reporter := users[rand.Intn(len(users))]
		targetType := "order"
		targetID := orders[rand.Intn(len(orders))].ID
		if rand.Intn(100) < 35 {
			targetType = "user"
			targetID = users[rand.Intn(len(users))].ID
		}
		desc := "Сид: демонстрационная жалоба для тестирования модерации."
		r := &models.Report{
			ReporterID:  reporter.ID,
			TargetType:  targetType,
			TargetID:    targetID,
			Reason:      reasons[rand.Intn(len(reasons))],
			Description: &desc,
		}
		if err := s.reportRepo.Create(ctx, r); err == nil {
			created++
		}
	}
	return created
}

func (s *ExtendedSeedService) createNotification(ctx context.Context, userID uuid.UUID, payload map[string]any) int {
	data, err := json.Marshal(payload)
	if err != nil {
		return 0
	}
	n := &models.Notification{
		UserID:  userID,
		Payload: data,
		IsRead:  rand.Intn(100) < 25,
	}
	if err := s.notificationRepo.Create(ctx, n); err != nil {
		return 0
	}
	return 1
}

func (s *ExtendedSeedService) createNotifications(ctx context.Context, users []*models.User, orders []*models.Order) int {
	total := 0
	for _, u := range users {
		total += s.createNotification(ctx, u.ID, map[string]any{
			"type":    "welcome",
			"title":   "Добро пожаловать в НейроБиржу",
			"message": "Профиль создан, можно начинать работу.",
		})
		if len(orders) > 0 && rand.Intn(100) < 70 {
			o := orders[rand.Intn(len(orders))]
			total += s.createNotification(ctx, u.ID, map[string]any{
				"type":     "order_update",
				"order_id": o.ID.String(),
				"status":   o.Status,
				"title":    o.Title,
			})
		}
	}
	return total
}
