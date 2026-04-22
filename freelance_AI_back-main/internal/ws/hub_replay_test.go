package ws

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/google/uuid"
)

func TestHubEventsForReplayFiltersByUser(t *testing.T) {
	hub := NewHub(context.Background())
	userA := uuid.New()
	userB := uuid.New()

	first := newServerEnvelope("order.created", map[string]string{"id": "1"})
	firstRaw, _ := json.Marshal(first)
	hub.recordHistory(historyEvent{event: first, payload: firstRaw, global: true})

	second := newServerEnvelope("notification.created", map[string]string{"id": "2"})
	secondRaw, _ := json.Marshal(second)
	hub.recordHistory(historyEvent{event: second, payload: secondRaw, userID: userA})

	third := newServerEnvelope("notification.created", map[string]string{"id": "3"})
	thirdRaw, _ := json.Marshal(third)
	hub.recordHistory(historyEvent{event: third, payload: thirdRaw, userID: userB})

	replay := hub.eventsForReplay(userA, first.EventID)
	if len(replay) != 1 {
		t.Fatalf("expected 1 replay event for userA after first event, got %d", len(replay))
	}
	if replay[0].event.EventID != second.EventID {
		t.Fatalf("unexpected replay event id: got=%s want=%s", replay[0].event.EventID, second.EventID)
	}
}
