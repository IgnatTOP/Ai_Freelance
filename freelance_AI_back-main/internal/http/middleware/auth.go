package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	httpresp "github.com/ignatzorin/freelance-backend/internal/interface/http/response"
	"github.com/ignatzorin/freelance-backend/internal/service"
)

// Context ключи для gin.Context.
const (
	ContextUserIDKey = "userID"
	ContextRoleKey   = "role"
)

// AuthMiddleware проверяет JWT access токен.
func AuthMiddleware(tokens *service.TokenManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if auth == "" || !strings.HasPrefix(auth, "Bearer ") {
			httpresp.Unauthorized(c, "требуется авторизация")
			c.Abort()
			return
		}

		raw := strings.TrimPrefix(auth, "Bearer ")
		userID, role, err := tokens.ParseAccess(raw)
		if err != nil || userID == uuid.Nil {
			httpresp.Unauthorized(c, "токен невалиден")
			c.Abort()
			return
		}

		SetAuthContext(c, userID, role)
		c.Next()
	}
}
