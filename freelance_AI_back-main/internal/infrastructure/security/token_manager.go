package security

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
)

// TokenPair stores access and refresh tokens.
type TokenPair struct {
	AccessToken  string        `json:"access_token"`
	RefreshToken string        `json:"refresh_token"`
	ExpiresIn    time.Duration `json:"expires_in"`
}

// TokenManager handles JWT generation and validation.
type TokenManager struct {
	accessSecret  []byte
	refreshSecret []byte
	accessTTL     time.Duration
	refreshTTL    time.Duration
}

// NewTokenManager creates a new TokenManager.
func NewTokenManager(accessSecret, refreshSecret string, accessTTL, refreshTTL time.Duration) *TokenManager {
	return &TokenManager{
		accessSecret:  []byte(accessSecret),
		refreshSecret: []byte(refreshSecret),
		accessTTL:     accessTTL,
		refreshTTL:    refreshTTL,
	}
}

// GeneratePair generates a new token pair for a user.
func (m *TokenManager) GeneratePair(user *entity.User) (*TokenPair, time.Time, time.Time, error) {
	now := time.Now()
	accessExp := now.Add(m.accessTTL)
	refreshExp := now.Add(m.refreshTTL)

	accessToken, err := m.createToken(user, accessExp, m.accessSecret)
	if err != nil {
		return nil, time.Time{}, time.Time{}, err
	}

	refreshToken, err := m.createRefreshToken(user, refreshExp)
	if err != nil {
		return nil, time.Time{}, time.Time{}, err
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    m.accessTTL,
	}, accessExp, refreshExp, nil
}

// ParseRefresh validates a refresh token and returns claims.
func (m *TokenManager) ParseRefresh(token string) (*jwt.RegisteredClaims, error) {
	parsed, err := jwt.ParseWithClaims(token, &jwt.RegisteredClaims{}, func(t *jwt.Token) (interface{}, error) {
		return m.refreshSecret, nil
	})
	if err != nil {
		return nil, err
	}

	if claims, ok := parsed.Claims.(*jwt.RegisteredClaims); ok && parsed.Valid {
		return claims, nil
	}

	return nil, jwt.ErrTokenInvalidClaims
}

func (m *TokenManager) createToken(user *entity.User, exp time.Time, secret []byte) (string, error) {
	claims := jwt.MapClaims{
		"sub":  user.ID.String(),
		"role": user.Role,
		"iat":  time.Now().Unix(),
		"exp":  exp.Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secret)
}

func (m *TokenManager) createRefreshToken(user *entity.User, exp time.Time) (string, error) {
	claims := jwt.RegisteredClaims{
		Subject:   user.ID.String(),
		ID:        uuid.NewString(),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		ExpiresAt: jwt.NewNumericDate(exp),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(m.refreshSecret)
}
