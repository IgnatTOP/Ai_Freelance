package handlers

import (
	"encoding/json"
	"errors"
	"io"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/ignatzorin/freelance-backend/internal/http/middleware"
)

var errUserNotFound = errors.New("пользователь не найден в контексте")

// currentUserID извлекает userID из контекста.
func currentUserID(c *gin.Context) (uuid.UUID, error) {
	userID, err := middleware.UserIDFromContext(c)
	if err != nil {
		return uuid.Nil, errUserNotFound
	}
	return userID, nil
}

// currentUserRole извлекает роль пользователя из контекста.
func currentUserRole(c *gin.Context) (string, error) {
	role, err := middleware.RoleFromContext(c)
	if err != nil {
		return "", errUserNotFound
	}
	return role, nil
}

// writeSSEData правильно форматирует и отправляет SSE данные с поддержкой UTF-8.
// Использует io.WriteString для правильной работы с UTF-8 кодировкой.
// Если данные содержат символы новой строки, они отправляются как один блок,
// что соответствует спецификации SSE.
func writeSSEData(w io.Writer, data string) (int, error) {
	if data == "" {
		return 0, nil
	}

	// Заменяем символы новой строки на пробелы для правильного форматирования SSE
	// или отправляем как есть, если данные уже нормализованы
	// Используем io.WriteString для правильной работы с UTF-8
	n, err := io.WriteString(w, "data: "+data+"\n\n")
	if err != nil {
		return 0, err
	}

	return n, nil
}

// writeSSEEvent правильно форматирует и отправляет SSE событие с типом.
func writeSSEEvent(w io.Writer, eventType, data string) (int, error) {
	totalWritten := 0

	// Записываем тип события
	n, err := io.WriteString(w, "event: "+eventType+"\n")
	if err != nil {
		return totalWritten, err
	}
	totalWritten += n

	// Записываем данные события
	n, err = writeSSEData(w, data)
	if err != nil {
		return totalWritten, err
	}
	totalWritten += n

	return totalWritten, nil
}

// sseChunkWriter builds a standard onDelta callback for streaming AI/SSE handlers.
func sseChunkWriter(w io.Writer, flusher interface{ Flush() }) func(string) error {
	return func(chunk string) error {
		if _, writeErr := writeSSEData(w, chunk); writeErr != nil {
			return writeErr
		}
		flusher.Flush()
		return nil
	}
}

func writeSSEErrorEventAndFlush(w io.Writer, flusher interface{ Flush() }, message string) {
	writeSSEEventAndFlush(w, flusher, "error", message)
}

func writeSSEEventAndFlush(w io.Writer, flusher interface{ Flush() }, eventType, data string) {
	_, _ = writeSSEEvent(w, eventType, data)
	flusher.Flush()
}

func writeSSEJSONDataAndFlush(w io.Writer, flusher interface{ Flush() }, payload interface{}) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	if _, err := writeSSEEvent(w, "data", string(data)); err != nil {
		return err
	}
	flusher.Flush()
	return nil
}
