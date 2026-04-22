package middleware

import (
	"net/http"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
)

// CORSMiddleware обрабатывает CORS заголовки и preflight запросы.
// Разрешает только origins из списка allowedOrigins.
func CORSMiddleware(allowedOrigins []string) gin.HandlerFunc {
	normalizedOrigins := make(map[string]struct{}, len(allowedOrigins))
	allowAll := false
	for _, origin := range allowedOrigins {
		normalized := normalizeOrigin(origin)
		if normalized == "*" {
			allowAll = true
			continue
		}
		if normalized == "" {
			continue
		}
		normalizedOrigins[normalized] = struct{}{}
	}

	return func(c *gin.Context) {
		origin := normalizeOrigin(c.GetHeader("Origin"))

		// Проверяем, разрешён ли origin
		allowed := allowAll
		if !allowed && origin != "" {
			_, allowed = normalizedOrigins[origin]
		}

		// Устанавливаем заголовок только если origin разрешён
		if allowed {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			c.Writer.Header().Set("Vary", "Origin")
		}

		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func normalizeOrigin(raw string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return ""
	}
	if value == "*" {
		return value
	}

	parsed, err := url.Parse(value)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return ""
	}

	return strings.ToLower(parsed.Scheme + "://" + parsed.Host)
}
