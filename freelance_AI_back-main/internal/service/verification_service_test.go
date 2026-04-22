package service

import (
	"context"
	"errors"
	"regexp"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	"github.com/ignatzorin/freelance-backend/internal/models"
)

type verificationRepoMock struct {
	target            string
	alreadyVerified   bool
	lastCreatedAt     *time.Time
	sentCountLastHour int

	createCalled    bool
	createCode      string
	createExpiresAt time.Time
	createMaxTries  int
	createErr       error
	createResult    *models.VerificationCode

	markUsedCalled bool
	markUsedID     uuid.UUID
	markUsedErr    error

	verifyCalled bool
	verifyCode   string
	verifyOK     bool
	verifyErr    error

	emailVerified    bool
	phoneVerified    bool
	identityVerified bool
}

func (m *verificationRepoMock) CreateCodeReplacingActive(_ context.Context, _ uuid.UUID, _ string, code string, expiresAt time.Time, maxAttempts int) (*models.VerificationCode, error) {
	m.createCalled = true
	m.createCode = code
	m.createExpiresAt = expiresAt
	m.createMaxTries = maxAttempts
	if m.createErr != nil {
		return nil, m.createErr
	}
	if m.createResult == nil {
		m.createResult = &models.VerificationCode{ID: uuid.New()}
	}
	return m.createResult, nil
}

func (m *verificationRepoMock) VerifyCode(_ context.Context, _ uuid.UUID, _ string, code string) (bool, error) {
	m.verifyCalled = true
	m.verifyCode = code
	if m.verifyErr != nil {
		return false, m.verifyErr
	}
	return m.verifyOK, nil
}

func (m *verificationRepoMock) GetUserVerificationStatus(_ context.Context, _ uuid.UUID) (bool, bool, bool, error) {
	return m.emailVerified, m.phoneVerified, m.identityVerified, nil
}

func (m *verificationRepoMock) GetVerificationTarget(_ context.Context, _ uuid.UUID, _ string) (string, bool, error) {
	return m.target, m.alreadyVerified, nil
}

func (m *verificationRepoMock) CountCodesCreatedSince(_ context.Context, _ uuid.UUID, _ string, _ time.Time) (int, error) {
	return m.sentCountLastHour, nil
}

func (m *verificationRepoMock) GetLastCodeCreatedAt(_ context.Context, _ uuid.UUID, _ string) (*time.Time, error) {
	return m.lastCreatedAt, nil
}

func (m *verificationRepoMock) MarkCodeUsed(_ context.Context, codeID uuid.UUID) error {
	m.markUsedCalled = true
	m.markUsedID = codeID
	return m.markUsedErr
}

type verificationSenderMock struct {
	called bool
	target string
	code   string
	err    error
}

func (m *verificationSenderMock) SendVerificationCode(_ context.Context, target, code string, _ time.Time) error {
	m.called = true
	m.target = target
	m.code = code
	return m.err
}

func TestVerificationService_SendEmailCode_SuccessHiddenCode(t *testing.T) {
	repo := &verificationRepoMock{target: "user@example.com"}
	emailSender := &verificationSenderMock{}
	svc := NewVerificationService(repo, emailSender, nil, DefaultVerificationPolicy())

	code, err := svc.SendEmailCode(context.Background(), uuid.New())
	require.NoError(t, err)
	require.Empty(t, code)
	require.True(t, repo.createCalled)
	require.True(t, emailSender.called)
	require.Len(t, emailSender.code, 6)
	require.Regexp(t, regexp.MustCompile(`^[0-9]{6}$`), emailSender.code)
}

func TestVerificationService_SendEmailCode_ExposeCode(t *testing.T) {
	repo := &verificationRepoMock{target: "user@example.com"}
	emailSender := &verificationSenderMock{}
	policy := DefaultVerificationPolicy()
	policy.ExposeCodeInResponse = true
	svc := NewVerificationService(repo, emailSender, nil, policy)

	code, err := svc.SendEmailCode(context.Background(), uuid.New())
	require.NoError(t, err)
	require.Len(t, code, 6)
	require.Equal(t, emailSender.code, code)
}

func TestVerificationService_SendEmailCode_Cooldown(t *testing.T) {
	now := time.Now().Add(-30 * time.Second)
	repo := &verificationRepoMock{
		target:        "user@example.com",
		lastCreatedAt: &now,
	}
	emailSender := &verificationSenderMock{}
	policy := DefaultVerificationPolicy()
	policy.ResendCooldown = time.Minute
	svc := NewVerificationService(repo, emailSender, nil, policy)

	_, err := svc.SendEmailCode(context.Background(), uuid.New())
	require.ErrorIs(t, err, ErrVerificationSendCooldown)
	require.False(t, repo.createCalled)
	require.False(t, emailSender.called)
}

func TestVerificationService_SendPhoneCode_InvalidTarget(t *testing.T) {
	repo := &verificationRepoMock{target: "1234"}
	smsSender := &verificationSenderMock{}
	svc := NewVerificationService(repo, nil, smsSender, DefaultVerificationPolicy())

	_, err := svc.SendPhoneCode(context.Background(), uuid.New())
	require.ErrorIs(t, err, ErrVerificationTargetInvalid)
	require.False(t, repo.createCalled)
	require.False(t, smsSender.called)
}

func TestVerificationService_SendEmailCode_AlreadyVerified(t *testing.T) {
	repo := &verificationRepoMock{
		target:          "user@example.com",
		alreadyVerified: true,
	}
	svc := NewVerificationService(repo, &verificationSenderMock{}, nil, DefaultVerificationPolicy())

	_, err := svc.SendEmailCode(context.Background(), uuid.New())
	require.ErrorIs(t, err, ErrVerificationAlreadyCompleted)
	require.False(t, repo.createCalled)
}

func TestVerificationService_SendEmailCode_DeliveryFailureInvalidatesCode(t *testing.T) {
	repo := &verificationRepoMock{target: "user@example.com"}
	emailSender := &verificationSenderMock{err: errors.New("provider unavailable")}
	svc := NewVerificationService(repo, emailSender, nil, DefaultVerificationPolicy())

	_, err := svc.SendEmailCode(context.Background(), uuid.New())
	require.Error(t, err)
	require.True(t, repo.markUsedCalled)
	require.True(t, emailSender.called)
}

func TestVerificationService_VerifyCode_Empty(t *testing.T) {
	repo := &verificationRepoMock{}
	svc := NewVerificationService(repo, nil, nil, DefaultVerificationPolicy())

	ok, err := svc.VerifyCode(context.Background(), uuid.New(), models.VerificationTypeEmail, "")
	require.ErrorIs(t, err, ErrVerificationInvalidCode)
	require.False(t, ok)
	require.False(t, repo.verifyCalled)
}
