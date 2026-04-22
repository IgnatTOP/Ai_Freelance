package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	httpresp "github.com/ignatzorin/freelance-backend/internal/interface/http/response"
)

// UUIDValidator проверяет, что параметр с указанным именем является валидным UUID.
// Использование: router.GET("/orders/:id", UUIDValidator("id"), handler.GetOrder)
func UUIDValidator(paramName string) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param(paramName)
		if idStr == "" {
			httpresp.BadRequest(c, "параметр "+paramName+" обязателен")
			c.Abort()
			return
		}

		_, err := uuid.Parse(idStr)
		if err != nil {
			httpresp.BadRequest(c, "параметр "+paramName+" должен быть валидным UUID")
			c.Abort()
			return
		}

		c.Next()
	}
}
