package handler

import (
	"errors"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/http/middleware"
	httpresp "github.com/ignatzorin/freelance-backend/internal/interface/http/response"
)

func getUserID(c *gin.Context) (uuid.UUID, error) {
	userID, err := middleware.UserIDFromContext(c)
	if err != nil {
		return uuid.Nil, errors.New("некорректный формат user_id")
	}
	return userID, nil
}

func requireUserID(c *gin.Context, unauthorizedMessage string) (uuid.UUID, bool) {
	userID, err := getUserID(c)
	if err != nil {
		httpresp.Unauthorized(c, unauthorizedMessage)
		return uuid.Nil, false
	}
	return userID, true
}

func parseUUIDParam(c *gin.Context, key, errMessage string) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param(key))
	if err != nil {
		httpresp.BadRequest(c, errMessage)
		return uuid.Nil, false
	}
	return id, true
}

func parseIntQuery(c *gin.Context, key string, defaultValue int) int {
	valueStr := c.Query(key)
	if valueStr == "" {
		return defaultValue
	}

	value, err := strconv.Atoi(valueStr)
	if err != nil {
		return defaultValue
	}

	return value
}

func parseFloatQuery(c *gin.Context, key string) *float64 {
	valueStr := c.Query(key)
	if valueStr == "" {
		return nil
	}

	value, err := strconv.ParseFloat(valueStr, 64)
	if err != nil {
		return nil
	}

	return &value
}
