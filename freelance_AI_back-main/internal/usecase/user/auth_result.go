package user

import (
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/infrastructure/security"
)

// AuthResult contains the result of authentication.
type AuthResult struct {
	User      *entity.User        `json:"user"`
	TokenPair *security.TokenPair `json:"token_pair"`
}
