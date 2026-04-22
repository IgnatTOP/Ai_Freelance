package middleware

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	// ContextUserUUIDKey is the canonical auth context key for typed UUID access.
	ContextUserUUIDKey = "user_uuid"
	legacyUserIDKey    = "user_id"
)

var (
	ErrNoAuthUserID    = errors.New("user id not found in context")
	ErrInvalidAuthUID  = errors.New("invalid user id in context")
	ErrNoAuthRole      = errors.New("role not found in context")
	ErrInvalidAuthRole = errors.New("invalid role in context")
)

// SetAuthContext stores auth data in canonical keys and legacy-compatible aliases.
func SetAuthContext(c *gin.Context, userID uuid.UUID, role string) {
	// Legacy consumers read a string under "userID".
	c.Set(ContextUserIDKey, userID.String())
	// Some handlers/helpers expect typed UUID under "user_id".
	c.Set(legacyUserIDKey, userID)
	// Canonical typed key for new code.
	c.Set(ContextUserUUIDKey, userID)
	c.Set(ContextRoleKey, role)
}

// UserIDFromContext extracts the authenticated user ID from Gin context.
// Supports canonical and legacy keys/types to preserve compatibility during migration.
func UserIDFromContext(c *gin.Context) (uuid.UUID, error) {
	candidates := []string{ContextUserUUIDKey, legacyUserIDKey, ContextUserIDKey}
	for _, key := range candidates {
		raw, exists := c.Get(key)
		if !exists {
			continue
		}

		switch v := raw.(type) {
		case uuid.UUID:
			if v == uuid.Nil {
				return uuid.Nil, ErrInvalidAuthUID
			}
			return v, nil
		case string:
			id, err := uuid.Parse(v)
			if err != nil {
				return uuid.Nil, ErrInvalidAuthUID
			}
			return id, nil
		}
	}

	return uuid.Nil, ErrNoAuthUserID
}

// RoleFromContext extracts user role from Gin context.
func RoleFromContext(c *gin.Context) (string, error) {
	raw, exists := c.Get(ContextRoleKey)
	if !exists {
		return "", ErrNoAuthRole
	}
	role, ok := raw.(string)
	if !ok || role == "" {
		return "", ErrInvalidAuthRole
	}
	return role, nil
}
