package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/jmoiron/sqlx"

	"github.com/ignatzorin/freelance-backend/internal/config"
	"github.com/ignatzorin/freelance-backend/internal/db"
	"github.com/ignatzorin/freelance-backend/internal/logger"
	"github.com/ignatzorin/freelance-backend/internal/service"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("main: ошибка загрузки конфигурации: %v", err)
	}

	logLevel := "info"
	if cfg.Env == "development" {
		logLevel = "debug"
		logger.Init(logLevel)
		logger.SetTextFormatter()
	} else {
		logger.Init(logLevel)
	}

	dbConn, err := db.NewPostgres(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("main: ошибка подключения к базе: %v", err)
	}
	defer safeClose(dbConn)

	if err := db.RunMigrations(ctx, dbConn, cfg.MigrationsPath); err != nil {
		log.Fatalf("main: ошибка миграций: %v", err)
	}
	if err := db.EnsureCatalogSeeded(ctx, dbConn); err != nil {
		log.Fatalf("main: ошибка инициализации каталога: %v", err)
	}

	engine, err := buildEngine(ctx, cfg, dbConn)
	if err != nil {
		log.Fatalf("main: ошибка сборки приложения: %v", err)
	}

	server := &http.Server{
		Addr:              "0.0.0.0:" + cfg.HTTPPort,
		Handler:           engine,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			log.Printf("main: ошибка остановки http сервера: %v", err)
		}
	}()

	log.Printf("main: HTTP сервер запущен на порту %s", cfg.HTTPPort)

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("main: сервер завершился с ошибкой: %v", err)
	}
}

func safeClose(db *sqlx.DB) {
	if err := db.Close(); err != nil {
		log.Printf("main: ошибка закрытия базы: %v", err)
	}
}

func buildVerificationPolicy(cfg *config.Config) service.VerificationPolicy {
	return service.VerificationPolicy{
		EmailCodeTTL:         cfg.VerificationEmailCodeTTL,
		PhoneCodeTTL:         cfg.VerificationPhoneCodeTTL,
		ResendCooldown:       cfg.VerificationResendCooldown,
		MaxSendsPerHour:      cfg.VerificationMaxSendsPerHour,
		MaxVerificationTries: cfg.VerificationMaxAttempts,
		ExposeCodeInResponse: cfg.VerificationExposeCode,
	}
}

func buildVerificationEmailSender(cfg *config.Config) (service.EmailCodeSender, error) {
	switch cfg.VerificationEmailProvider {
	case "noop":
		return service.NewNoopEmailCodeSender(), nil
	case "smtp":
		return service.NewSMTPEmailCodeSender(
			cfg.SMTPHost,
			cfg.SMTPPort,
			cfg.SMTPUsername,
			cfg.SMTPPassword,
			cfg.SMTPFrom,
		)
	default:
		return nil, fmt.Errorf("unsupported verification email provider: %q", cfg.VerificationEmailProvider)
	}
}

func buildVerificationSMSSender(cfg *config.Config) (service.SMSCodeSender, error) {
	switch cfg.VerificationSMSProvider {
	case "noop":
		return service.NewNoopSMSCodeSender(), nil
	case "twilio":
		return service.NewTwilioSMSCodeSender(
			cfg.TwilioAccountSID,
			cfg.TwilioAuthToken,
			cfg.TwilioFromPhone,
			nil,
		)
	default:
		return nil, fmt.Errorf("unsupported verification sms provider: %q", cfg.VerificationSMSProvider)
	}
}
