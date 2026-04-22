package ws

import (
	"context"
	"testing"

	"github.com/google/uuid"
)

func TestDefaultCommandHandler_UnknownCommand(t *testing.T) {
	handler := NewDefaultCommandHandler(CommandDependencies{})
	hub := NewHub(context.Background())
	err := handler.Handle(context.Background(), ClientCommandEnvelope{Cmd: "unknown", Version: 1, RequestID: "r1"}, hub, uuid.New())
	if err == nil {
		t.Fatal("expected error for unknown command")
	}
	commandErr, ok := AsCommandError(err)
	if !ok {
		t.Fatalf("expected command error, got %T", err)
	}
	if commandErr.Code != "ws_unsupported_command" {
		t.Fatalf("unexpected command error code: %s", commandErr.Code)
	}
}

func TestDefaultCommandHandler_PresenceSubscribeStrictPayload(t *testing.T) {
	handler := NewDefaultCommandHandler(CommandDependencies{})
	hub := NewHub(context.Background())
	err := handler.Handle(context.Background(), ClientCommandEnvelope{
		Cmd:     "presence.subscribe",
		Version: 1,
		Data:    []interface{}{"not-valid-format"},
	}, hub, uuid.New())
	if err == nil {
		t.Fatal("expected strict payload validation error")
	}
	commandErr, ok := AsCommandError(err)
	if !ok {
		t.Fatalf("expected command error, got %T", err)
	}
	if commandErr.Code != "ws_invalid_payload" {
		t.Fatalf("unexpected command error code: %s", commandErr.Code)
	}
}
