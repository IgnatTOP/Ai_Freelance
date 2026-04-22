package config

import (
	"fmt"
	"log"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Config хранит все параметры запуска приложения.
type Config struct {
	Env              string
	HTTPPort         string
	DatabaseURL      string
	JWTSecret        string
	RefreshSecret    string
	AccessTokenTTL   time.Duration
	RefreshTokenTTL  time.Duration
	MediaStoragePath string
	AIBaseURL        string
	AIModel          string
	MaxUploadSizeMB  int64
	MigrationsPath   string
	AllowedOrigins   []string
	RateLimitLimit   int64
	RateLimitPeriod  time.Duration
	EscrowFeeRate    float64

	VerificationEmailProvider   string
	VerificationSMSProvider     string
	VerificationEmailCodeTTL    time.Duration
	VerificationPhoneCodeTTL    time.Duration
	VerificationResendCooldown  time.Duration
	VerificationMaxSendsPerHour int
	VerificationMaxAttempts     int
	VerificationExposeCode      bool

	SMTPHost     string
	SMTPPort     int
	SMTPUsername string
	SMTPPassword string
	SMTPFrom     string

	TwilioAccountSID string
	TwilioAuthToken  string
	TwilioFromPhone  string

	RedisURL                 string
	RTTypingTTL              time.Duration
	RTPresenceTTL            time.Duration
	RTRedisEnabled           bool
	RTCleanBridgeEnabled     bool
	APIEnvelopeEnforceTopRT  bool
}

// Load читает переменные окружения и возвращает готовую конфигурацию.
func Load() (*Config, error) {
	// Загружаем .env только если он существует, иначе используем системные переменные.
	if err := godotenv.Load(".env"); err != nil {
		log.Printf("config: .env не найден, используем переменные окружения: %v", err)
	}

	env := getEnv("APP_ENV", "development")

	// Получаем DatabaseURL - либо напрямую, либо собираем из отдельных переменных
	databaseURL := getDatabaseURL()

	cfg := &Config{
		Env:                         env,
		HTTPPort:                    getEnv("HTTP_PORT", "8080"),
		DatabaseURL:                 databaseURL,
		MediaStoragePath:            getEnv("MEDIA_STORAGE_PATH", "./storage/media"),
		AIBaseURL:                   firstNonEmpty(strings.TrimSpace(getEnv("AI_BASE_URL", "")), "http://localhost:9000"),
		AIModel:                     firstNonEmpty(strings.TrimSpace(getEnv("AI_MODEL", "")), "gpt-4o-mini"),
		MigrationsPath:              getEnv("MIGRATIONS_PATH", "./migrations"),
		VerificationEmailProvider:   strings.ToLower(getEnv("VERIFICATION_EMAIL_PROVIDER", "noop")),
		VerificationSMSProvider:     strings.ToLower(getEnv("VERIFICATION_SMS_PROVIDER", "noop")),
		VerificationEmailCodeTTL:    mustParseDuration(getEnv("VERIFICATION_EMAIL_CODE_TTL", "15m")),
		VerificationPhoneCodeTTL:    mustParseDuration(getEnv("VERIFICATION_PHONE_CODE_TTL", "5m")),
		VerificationResendCooldown:  mustParseDuration(getEnv("VERIFICATION_RESEND_COOLDOWN", "60s")),
		VerificationMaxSendsPerHour: mustParseInt(getEnv("VERIFICATION_MAX_SENDS_PER_HOUR", "5")),
		VerificationMaxAttempts:     mustParseInt(getEnv("VERIFICATION_MAX_ATTEMPTS", "5")),
		VerificationExposeCode:      mustParseBool(getEnv("VERIFICATION_EXPOSE_CODE", "false")),
		SMTPHost:                    getEnv("SMTP_HOST", ""),
		SMTPPort:                    mustParseInt(getEnv("SMTP_PORT", "587")),
		SMTPUsername:                getEnv("SMTP_USERNAME", ""),
		SMTPPassword:                getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:                    getEnv("SMTP_FROM", ""),
		TwilioAccountSID:            getEnv("TWILIO_ACCOUNT_SID", ""),
		TwilioAuthToken:             getEnv("TWILIO_AUTH_TOKEN", ""),
		TwilioFromPhone:             getEnv("TWILIO_FROM_PHONE", ""),
		RedisURL:                    strings.TrimSpace(getEnv("REDIS_URL", "")),
		RTTypingTTL:                 mustParseDuration(getEnv("RT_TYPING_TTL", "3s")),
		RTPresenceTTL:               mustParseDuration(getEnv("RT_PRESENCE_TTL", "30s")),
		RTRedisEnabled:              mustParseBool(getEnv("RT_REDIS_ENABLED", "true")),
		RTCleanBridgeEnabled:        mustParseBool(getEnv("RT_CLEAN_BRIDGE_ENABLED", "true")),
		APIEnvelopeEnforceTopRT:     mustParseBool(getEnv("API_ENVELOPE_ENFORCE_TOP_DOMAINS", "true")),
	}

	// Валидация JWT секретов
	jwtSecret := getEnv("JWT_SECRET", "")
	refreshSecret := getEnv("REFRESH_SECRET", "")

	if env == "production" {
		if jwtSecret == "" || len(jwtSecret) < 32 {
			return nil, fmt.Errorf("config: JWT_SECRET обязателен и должен быть не менее 32 символов в production")
		}
		if refreshSecret == "" || len(refreshSecret) < 32 {
			return nil, fmt.Errorf("config: REFRESH_SECRET обязателен и должен быть не менее 32 символов в production")
		}
	} else {
		// В development используем дефолтные значения, но предупреждаем
		if jwtSecret == "" {
			jwtSecret = "super-secret-development-only-change-in-production"
			log.Printf("config: WARNING - используется дефолтный JWT_SECRET, измените в production!")
		}
		if refreshSecret == "" {
			refreshSecret = "super-refresh-secret-development-only-change-in-production"
			log.Printf("config: WARNING - используется дефолтный REFRESH_SECRET, измените в production!")
		}
	}

	cfg.JWTSecret = jwtSecret
	cfg.RefreshSecret = refreshSecret

	// CORS allowed origins
	originsStr := getEnv("CORS_ALLOWED_ORIGINS", "")
	if originsStr == "" {
		// Дефолтные значения для development
		if env == "production" {
			return nil, fmt.Errorf("config: CORS_ALLOWED_ORIGINS обязателен в production")
		}
		cfg.AllowedOrigins = []string{"http://localhost:3000", "http://localhost:3001"}
	} else {
		cfg.AllowedOrigins = strings.Split(originsStr, ",")
		// Убираем пробелы
		for i, origin := range cfg.AllowedOrigins {
			cfg.AllowedOrigins[i] = strings.TrimSpace(origin)
		}
	}

	cfg.AccessTokenTTL = mustParseDuration(getEnv("ACCESS_TOKEN_TTL", "15m"))
	cfg.RefreshTokenTTL = mustParseDuration(getEnv("REFRESH_TOKEN_TTL", "720h"))
	cfg.MaxUploadSizeMB = mustParseInt64(getEnv("MAX_UPLOAD_MB", "10"))

	// Rate limiting настройки
	cfg.RateLimitLimit = mustParseInt64(getEnv("RATE_LIMIT_LIMIT", "10"))
	rateLimitPeriodStr := getEnv("RATE_LIMIT_PERIOD", "1m")
	cfg.RateLimitPeriod = mustParseDuration(rateLimitPeriodStr)
	cfg.EscrowFeeRate = mustParseFloat64(getEnv("ESCROW_FEE_RATE", "0.10"))
	if cfg.EscrowFeeRate < 0 || cfg.EscrowFeeRate >= 1 {
		return nil, fmt.Errorf("config: ESCROW_FEE_RATE должен быть в диапазоне [0, 1)")
	}

	if err := validateVerificationConfig(cfg); err != nil {
		return nil, err
	}
	if err := validateAIConfig(cfg); err != nil {
		return nil, err
	}

	return cfg, nil
}

func validateAIConfig(cfg *Config) error {
	if strings.TrimSpace(cfg.AIBaseURL) == "" {
		return fmt.Errorf("config: AI_BASE_URL не может быть пустым")
	}
	if strings.TrimSpace(cfg.AIModel) == "" {
		return fmt.Errorf("config: AI_MODEL не может быть пустым")
	}

	if cfg.Env == "production" {
		apiKey := strings.TrimSpace(getEnv("BOTHUB_ACCESS_TOKEN", ""))
		if apiKey == "" {
			apiKey = strings.TrimSpace(getEnv("AI_API_KEY", ""))
		}
		if apiKey == "" {
			return fmt.Errorf("config: BOTHUB_ACCESS_TOKEN или AI_API_KEY обязателен в production")
		}
	}

	return nil
}

func validateVerificationConfig(cfg *Config) error {
	if !isOneOf(cfg.VerificationEmailProvider, "noop", "smtp") {
		return fmt.Errorf("config: VERIFICATION_EMAIL_PROVIDER должен быть noop или smtp")
	}
	if !isOneOf(cfg.VerificationSMSProvider, "noop", "twilio") {
		return fmt.Errorf("config: VERIFICATION_SMS_PROVIDER должен быть noop или twilio")
	}
	if cfg.VerificationEmailCodeTTL <= 0 {
		return fmt.Errorf("config: VERIFICATION_EMAIL_CODE_TTL должен быть > 0")
	}
	if cfg.VerificationPhoneCodeTTL <= 0 {
		return fmt.Errorf("config: VERIFICATION_PHONE_CODE_TTL должен быть > 0")
	}
	if cfg.VerificationResendCooldown <= 0 {
		return fmt.Errorf("config: VERIFICATION_RESEND_COOLDOWN должен быть > 0")
	}
	if cfg.VerificationMaxSendsPerHour <= 0 {
		return fmt.Errorf("config: VERIFICATION_MAX_SENDS_PER_HOUR должен быть > 0")
	}
	if cfg.VerificationMaxAttempts <= 0 {
		return fmt.Errorf("config: VERIFICATION_MAX_ATTEMPTS должен быть > 0")
	}
	if cfg.SMTPPort <= 0 {
		return fmt.Errorf("config: SMTP_PORT должен быть > 0")
	}

	if cfg.VerificationEmailProvider == "smtp" {
		if strings.TrimSpace(cfg.SMTPHost) == "" {
			return fmt.Errorf("config: SMTP_HOST обязателен при VERIFICATION_EMAIL_PROVIDER=smtp")
		}
		if strings.TrimSpace(cfg.SMTPFrom) == "" {
			return fmt.Errorf("config: SMTP_FROM обязателен при VERIFICATION_EMAIL_PROVIDER=smtp")
		}
	}
	if cfg.VerificationSMSProvider == "twilio" {
		if strings.TrimSpace(cfg.TwilioAccountSID) == "" {
			return fmt.Errorf("config: TWILIO_ACCOUNT_SID обязателен при VERIFICATION_SMS_PROVIDER=twilio")
		}
		if strings.TrimSpace(cfg.TwilioAuthToken) == "" {
			return fmt.Errorf("config: TWILIO_AUTH_TOKEN обязателен при VERIFICATION_SMS_PROVIDER=twilio")
		}
		if strings.TrimSpace(cfg.TwilioFromPhone) == "" {
			return fmt.Errorf("config: TWILIO_FROM_PHONE обязателен при VERIFICATION_SMS_PROVIDER=twilio")
		}
	}

	if cfg.Env == "production" {
		if cfg.VerificationExposeCode {
			return fmt.Errorf("config: VERIFICATION_EXPOSE_CODE запрещён в production")
		}
		if cfg.VerificationEmailProvider == "noop" {
			return fmt.Errorf("config: VERIFICATION_EMAIL_PROVIDER=noop запрещён в production")
		}
		if cfg.VerificationSMSProvider == "noop" {
			return fmt.Errorf("config: VERIFICATION_SMS_PROVIDER=noop запрещён в production")
		}
	}

	return nil
}

// getEnv возвращает значение переменной окружения или дефолт.
func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

// getDatabaseURL возвращает DATABASE_URL либо из переменной, либо собирает из отдельных переменных.
func getDatabaseURL() string {
	// Если DATABASE_URL задан напрямую, используем его
	if dbURL := getEnv("DATABASE_URL", ""); dbURL != "" {
		log.Printf("config: используем DATABASE_URL (host: %s)", extractHostFromURL(dbURL))
		return dbURL
	}

	// Иначе собираем из отдельных переменных (формат платформы)
	host := getEnv("POSTGRESQL_HOST", "")
	port := getEnv("POSTGRESQL_PORT", "5432")
	user := getEnv("POSTGRESQL_USER", "")
	password := getEnv("POSTGRESQL_PASSWORD", "")
	dbname := getEnv("POSTGRESQL_DBNAME", "")

	// Логируем, какие переменные найдены
	log.Printf("config: POSTGRESQL_HOST=%s, POSTGRESQL_USER=%s, POSTGRESQL_DBNAME=%s",
		host, user, dbname)

	// Если все переменные заданы, собираем URL
	if host != "" && user != "" && dbname != "" {
		// URL-кодируем пароль и имя пользователя для безопасности
		// Используем url.UserPassword для правильного кодирования
		userInfo := url.UserPassword(user, password)

		dbURL := fmt.Sprintf("postgres://%s@%s:%s/%s?sslmode=disable",
			userInfo.String(), host, port, dbname)
		log.Printf("config: собран DATABASE_URL из переменных окружения (host: %s)", host)
		return dbURL
	}

	// Если ничего не задано, возвращаем дефолт
	log.Printf("config: WARNING - переменные базы данных не найдены, используем дефолтный localhost")
	return "postgres://postgres:123@localhost:5432/freelance_ai?sslmode=disable"
}

// extractHostFromURL извлекает хост из URL для логирования
func extractHostFromURL(dbURL string) string {
	parsed, err := url.Parse(dbURL)
	if err != nil {
		return "unknown"
	}
	return parsed.Host
}

// mustParseDuration безопасно парсит строку в duration.
func mustParseDuration(v string) time.Duration {
	dur, err := time.ParseDuration(v)
	if err != nil {
		log.Fatalf("config: не удалось распарсить длительность %q: %v", v, err)
	}
	return dur
}

// mustParseInt64 безопасно парсит строку в int64.
func mustParseInt64(v string) int64 {
	num, err := strconv.ParseInt(v, 10, 64)
	if err != nil {
		log.Fatalf("config: не удалось распарсить число %q: %v", v, err)
	}
	return num
}

// mustParseInt безопасно парсит строку в int.
func mustParseInt(v string) int {
	num, err := strconv.Atoi(v)
	if err != nil {
		log.Fatalf("config: не удалось распарсить число %q: %v", v, err)
	}
	return num
}

// mustParseFloat64 безопасно парсит строку в float64.
func mustParseFloat64(v string) float64 {
	num, err := strconv.ParseFloat(v, 64)
	if err != nil {
		log.Fatalf("config: не удалось распарсить float %q: %v", v, err)
	}
	return num
}

// mustParseBool безопасно парсит строку в bool.
func mustParseBool(v string) bool {
	flag, err := strconv.ParseBool(v)
	if err != nil {
		log.Fatalf("config: не удалось распарсить bool %q: %v", v, err)
	}
	return flag
}

func isOneOf(value string, allowed ...string) bool {
	for _, item := range allowed {
		if value == item {
			return true
		}
	}
	return false
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
