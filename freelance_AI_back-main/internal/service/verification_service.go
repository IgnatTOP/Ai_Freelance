package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"log"
	"math/big"
	"net/mail"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/ignatzorin/freelance-backend/internal/models"
)

var (
	ErrVerificationAlreadyCompleted = errors.New("verification already completed")
	ErrVerificationTargetMissing    = errors.New("verification target is not configured")
	ErrVerificationTargetInvalid    = errors.New("verification target is invalid")
	ErrVerificationSendCooldown     = errors.New("verification code was sent too recently")
	ErrVerificationSendLimitReached = errors.New("verification hourly send limit reached")
	ErrVerificationInvalidCode      = errors.New("verification code is invalid")
)

var e164Regex = regexp.MustCompile(`^\+[1-9]\d{7,14}$`)

type verificationRepository interface {
	CreateCodeReplacingActive(ctx context.Context, userID uuid.UUID, codeType, code string, expiresAt time.Time, maxAttempts int) (*models.VerificationCode, error)
	VerifyCode(ctx context.Context, userID uuid.UUID, codeType, code string) (bool, error)
	GetUserVerificationStatus(ctx context.Context, userID uuid.UUID) (emailVerified, phoneVerified, identityVerified bool, err error)
	GetVerificationTarget(ctx context.Context, userID uuid.UUID, codeType string) (string, bool, error)
	CountCodesCreatedSince(ctx context.Context, userID uuid.UUID, codeType string, since time.Time) (int, error)
	GetLastCodeCreatedAt(ctx context.Context, userID uuid.UUID, codeType string) (*time.Time, error)
	MarkCodeUsed(ctx context.Context, codeID uuid.UUID) error
}

type VerificationPolicy struct {
	EmailCodeTTL         time.Duration
	PhoneCodeTTL         time.Duration
	ResendCooldown       time.Duration
	MaxSendsPerHour      int
	MaxVerificationTries int
	ExposeCodeInResponse bool
}

func DefaultVerificationPolicy() VerificationPolicy {
	return VerificationPolicy{
		EmailCodeTTL:         15 * time.Minute,
		PhoneCodeTTL:         5 * time.Minute,
		ResendCooldown:       60 * time.Second,
		MaxSendsPerHour:      5,
		MaxVerificationTries: 5,
		ExposeCodeInResponse: false,
	}
}

type VerificationService struct {
	repo        verificationRepository
	emailSender EmailCodeSender
	smsSender   SMSCodeSender
	policy      VerificationPolicy
}

func NewVerificationService(repo verificationRepository, emailSender EmailCodeSender, smsSender SMSCodeSender, policy VerificationPolicy) *VerificationService {
	cfg := withVerificationPolicyDefaults(policy)
	if emailSender == nil {
		emailSender = NewNoopEmailCodeSender()
	}
	if smsSender == nil {
		smsSender = NewNoopSMSCodeSender()
	}

	return &VerificationService{
		repo:        repo,
		emailSender: emailSender,
		smsSender:   smsSender,
		policy:      cfg,
	}
}

func (s *VerificationService) SendEmailCode(ctx context.Context, userID uuid.UUID) (string, error) {
	return s.sendCode(ctx, userID, models.VerificationTypeEmail, s.policy.EmailCodeTTL, s.emailSender)
}

func (s *VerificationService) SendPhoneCode(ctx context.Context, userID uuid.UUID) (string, error) {
	return s.sendCode(ctx, userID, models.VerificationTypePhone, s.policy.PhoneCodeTTL, s.smsSender)
}

func (s *VerificationService) VerifyCode(ctx context.Context, userID uuid.UUID, codeType, code string) (bool, error) {
	code = strings.TrimSpace(code)
	if code == "" {
		return false, ErrVerificationInvalidCode
	}

	return s.repo.VerifyCode(ctx, userID, codeType, code)
}

func (s *VerificationService) GetStatus(ctx context.Context, userID uuid.UUID) (map[string]bool, error) {
	email, phone, identity, err := s.repo.GetUserVerificationStatus(ctx, userID)
	if err != nil {
		return nil, err
	}
	return map[string]bool{
		"email_verified":    email,
		"phone_verified":    phone,
		"identity_verified": identity,
	}, nil
}

func (s *VerificationService) ExposeCodeInResponse() bool {
	return s.policy.ExposeCodeInResponse
}

func (s *VerificationService) sendCode(ctx context.Context, userID uuid.UUID, codeType string, ttl time.Duration, sender verificationSender) (string, error) {
	target, alreadyVerified, err := s.repo.GetVerificationTarget(ctx, userID, codeType)
	if err != nil {
		return "", fmt.Errorf("verification service: get target: %w", err)
	}
	if alreadyVerified {
		return "", ErrVerificationAlreadyCompleted
	}

	target, err = validateVerificationTarget(codeType, target)
	if err != nil {
		return "", err
	}

	now := time.Now()
	lastCreatedAt, err := s.repo.GetLastCodeCreatedAt(ctx, userID, codeType)
	if err != nil {
		return "", fmt.Errorf("verification service: get last code timestamp: %w", err)
	}
	if lastCreatedAt != nil && now.Sub(*lastCreatedAt) < s.policy.ResendCooldown {
		return "", ErrVerificationSendCooldown
	}

	sentInLastHour, err := s.repo.CountCodesCreatedSince(ctx, userID, codeType, now.Add(-time.Hour))
	if err != nil {
		return "", fmt.Errorf("verification service: count recent sends: %w", err)
	}
	if sentInLastHour >= s.policy.MaxSendsPerHour {
		return "", ErrVerificationSendLimitReached
	}

	code, err := generateCode()
	if err != nil {
		return "", fmt.Errorf("verification service: generate verification code: %w", err)
	}

	expiresAt := now.Add(ttl)
	verificationCode, err := s.repo.CreateCodeReplacingActive(ctx, userID, codeType, code, expiresAt, s.policy.MaxVerificationTries)
	if err != nil {
		return "", fmt.Errorf("verification service: persist verification code: %w", err)
	}

	if err := sender.SendVerificationCode(ctx, target, code, expiresAt); err != nil {
		if markErr := s.repo.MarkCodeUsed(ctx, verificationCode.ID); markErr != nil {
			log.Printf("verification service: failed to invalidate code after send error: %v", markErr)
		}
		return "", fmt.Errorf("verification service: deliver verification code: %w", err)
	}

	if s.policy.ExposeCodeInResponse {
		return code, nil
	}
	return "", nil
}

type verificationSender interface {
	SendVerificationCode(ctx context.Context, target, code string, expiresAt time.Time) error
}

func withVerificationPolicyDefaults(policy VerificationPolicy) VerificationPolicy {
	defaults := DefaultVerificationPolicy()
	if policy.EmailCodeTTL <= 0 {
		policy.EmailCodeTTL = defaults.EmailCodeTTL
	}
	if policy.PhoneCodeTTL <= 0 {
		policy.PhoneCodeTTL = defaults.PhoneCodeTTL
	}
	if policy.ResendCooldown <= 0 {
		policy.ResendCooldown = defaults.ResendCooldown
	}
	if policy.MaxSendsPerHour <= 0 {
		policy.MaxSendsPerHour = defaults.MaxSendsPerHour
	}
	if policy.MaxVerificationTries <= 0 {
		policy.MaxVerificationTries = defaults.MaxVerificationTries
	}

	return policy
}

func validateVerificationTarget(codeType, rawTarget string) (string, error) {
	target := strings.TrimSpace(rawTarget)
	if target == "" {
		return "", ErrVerificationTargetMissing
	}

	switch codeType {
	case models.VerificationTypeEmail:
		if _, err := mail.ParseAddress(target); err != nil {
			return "", ErrVerificationTargetInvalid
		}
		return target, nil
	case models.VerificationTypePhone:
		if !e164Regex.MatchString(target) {
			return "", ErrVerificationTargetInvalid
		}
		return target, nil
	default:
		return "", fmt.Errorf("verification service: unsupported verification type %q", codeType)
	}
}

func generateCode() (string, error) {
	code := make([]byte, 6)
	for i := 0; i < len(code); i++ {
		n, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return "", err
		}
		code[i] = byte('0' + n.Int64())
	}

	return string(code), nil
}
