package service

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/mail"
	"net/smtp"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// EmailCodeSender отправляет verification-код на email.
type EmailCodeSender interface {
	SendVerificationCode(ctx context.Context, toEmail, code string, expiresAt time.Time) error
}

// SMSCodeSender отправляет verification-код на телефон.
type SMSCodeSender interface {
	SendVerificationCode(ctx context.Context, toPhone, code string, expiresAt time.Time) error
}

// NoopEmailCodeSender используется в development и не делает внешних вызовов.
type NoopEmailCodeSender struct{}

func NewNoopEmailCodeSender() *NoopEmailCodeSender {
	return &NoopEmailCodeSender{}
}

func (s *NoopEmailCodeSender) SendVerificationCode(_ context.Context, toEmail, code string, expiresAt time.Time) error {
	log.Printf("verification: noop email sender -> to=%s code=%s expires_at=%s", toEmail, code, expiresAt.Format(time.RFC3339))
	return nil
}

// NoopSMSCodeSender используется в development и не делает внешних вызовов.
type NoopSMSCodeSender struct{}

func NewNoopSMSCodeSender() *NoopSMSCodeSender {
	return &NoopSMSCodeSender{}
}

func (s *NoopSMSCodeSender) SendVerificationCode(_ context.Context, toPhone, code string, expiresAt time.Time) error {
	log.Printf("verification: noop sms sender -> to=%s code=%s expires_at=%s", toPhone, code, expiresAt.Format(time.RFC3339))
	return nil
}

// SMTPEmailCodeSender отправляет коды через SMTP.
type SMTPEmailCodeSender struct {
	host     string
	port     int
	username string
	password string
	from     string
}

func NewSMTPEmailCodeSender(host string, port int, username, password, from string) (*SMTPEmailCodeSender, error) {
	host = strings.TrimSpace(host)
	from = strings.TrimSpace(from)
	if host == "" {
		return nil, fmt.Errorf("smtp email sender: host is required")
	}
	if port <= 0 {
		return nil, fmt.Errorf("smtp email sender: port must be positive")
	}
	if from == "" {
		return nil, fmt.Errorf("smtp email sender: from is required")
	}
	if _, err := mail.ParseAddress(from); err != nil {
		return nil, fmt.Errorf("smtp email sender: invalid from address: %w", err)
	}

	return &SMTPEmailCodeSender{
		host:     host,
		port:     port,
		username: strings.TrimSpace(username),
		password: password,
		from:     from,
	}, nil
}

func (s *SMTPEmailCodeSender) SendVerificationCode(ctx context.Context, toEmail, code string, expiresAt time.Time) error {
	select {
	case <-ctx.Done():
		return fmt.Errorf("smtp email sender: context cancelled: %w", ctx.Err())
	default:
	}

	toEmail = strings.TrimSpace(toEmail)
	if _, err := mail.ParseAddress(toEmail); err != nil {
		return fmt.Errorf("smtp email sender: invalid destination address: %w", err)
	}

	subject := "Freelance AI: verification code"
	body := fmt.Sprintf(
		"Your verification code is %s. It expires at %s.",
		code,
		expiresAt.UTC().Format(time.RFC3339),
	)

	message := strings.Join([]string{
		"From: " + s.from,
		"To: " + toEmail,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"",
		body,
	}, "\r\n")

	addr := s.host + ":" + strconv.Itoa(s.port)
	var auth smtp.Auth
	if s.username != "" {
		auth = smtp.PlainAuth("", s.username, s.password, s.host)
	}

	if err := smtp.SendMail(addr, auth, s.from, []string{toEmail}, []byte(message)); err != nil {
		return fmt.Errorf("smtp email sender: send mail: %w", err)
	}

	return nil
}

// TwilioSMSCodeSender отправляет коды через Twilio REST API.
type TwilioSMSCodeSender struct {
	httpClient *http.Client
	accountSID string
	authToken  string
	from       string
}

func NewTwilioSMSCodeSender(accountSID, authToken, from string, client *http.Client) (*TwilioSMSCodeSender, error) {
	accountSID = strings.TrimSpace(accountSID)
	authToken = strings.TrimSpace(authToken)
	from = strings.TrimSpace(from)
	if accountSID == "" {
		return nil, fmt.Errorf("twilio sms sender: account sid is required")
	}
	if authToken == "" {
		return nil, fmt.Errorf("twilio sms sender: auth token is required")
	}
	if from == "" {
		return nil, fmt.Errorf("twilio sms sender: from phone is required")
	}
	if client == nil {
		client = &http.Client{Timeout: 10 * time.Second}
	}

	return &TwilioSMSCodeSender{
		httpClient: client,
		accountSID: accountSID,
		authToken:  authToken,
		from:       from,
	}, nil
}

func (s *TwilioSMSCodeSender) SendVerificationCode(ctx context.Context, toPhone, code string, expiresAt time.Time) error {
	toPhone = strings.TrimSpace(toPhone)
	if toPhone == "" {
		return fmt.Errorf("twilio sms sender: destination phone is required")
	}

	body := fmt.Sprintf("Your verification code is %s. Expires at %s.", code, expiresAt.UTC().Format(time.RFC3339))
	form := url.Values{}
	form.Set("To", toPhone)
	form.Set("From", s.from)
	form.Set("Body", body)

	endpoint := fmt.Sprintf("https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json", s.accountSID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return fmt.Errorf("twilio sms sender: build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.SetBasicAuth(s.accountSID, s.authToken)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("twilio sms sender: send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusBadRequest {
		payload, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return fmt.Errorf("twilio sms sender: unexpected status %d: %s", resp.StatusCode, strings.TrimSpace(string(payload)))
	}

	return nil
}
