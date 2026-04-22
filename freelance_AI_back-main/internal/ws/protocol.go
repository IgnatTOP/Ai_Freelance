package ws

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

const protocolVersion = 1

// ClientCommandEnvelope - команда от клиента к серверу.
type ClientCommandEnvelope struct {
	Cmd       string      `json:"cmd"`
	Version   int         `json:"version"`
	RequestID string      `json:"request_id"`
	Data      interface{} `json:"data"`
}

// ServerEventEnvelope - событие от сервера к клиенту.
type ServerEventEnvelope struct {
	Type    string      `json:"type"`
	Version int         `json:"version"`
	EventID string      `json:"event_id"`
	TS      string      `json:"ts"`
	Data    interface{} `json:"data"`
}

// CommandError describes a structured command failure that should be returned as nack.
type CommandError struct {
	Code    string
	Message string
}

func (e *CommandError) Error() string {
	if e == nil {
		return ""
	}
	if e.Message != "" {
		return e.Message
	}
	return e.Code
}

func NackError(code, message string) error {
	return &CommandError{Code: code, Message: message}
}

func AsCommandError(err error) (*CommandError, bool) {
	if err == nil {
		return nil, false
	}
	var commandErr *CommandError
	if errors.As(err, &commandErr) {
		return commandErr, true
	}
	return nil, false
}

// CommandHandler обрабатывает входящие WS-команды.
type CommandHandler interface {
	Handle(ctx context.Context, request ClientCommandEnvelope, hub *Hub, userID uuid.UUID) error
}

func newServerEnvelope(eventType string, data interface{}) ServerEventEnvelope {
	return ServerEventEnvelope{
		Type:    eventType,
		Version: protocolVersion,
		EventID: uuid.NewString(),
		TS:      time.Now().UTC().Format(time.RFC3339Nano),
		Data:    data,
	}
}
