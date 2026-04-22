package ws

import (
	"context"
	"sync"
	"testing"

	"github.com/google/uuid"
)

type saverCall struct {
	userID uuid.UUID
	event  string
}

type notificationSaverMock struct {
	mu    sync.Mutex
	calls []saverCall
}

func (m *notificationSaverMock) CreateNotification(_ context.Context, userID uuid.UUID, event string, _ interface{}) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.calls = append(m.calls, saverCall{userID: userID, event: event})
	return nil
}

func (m *notificationSaverMock) count() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return len(m.calls)
}

func TestHubBroadcastToUserPersistsOnlyWhitelistedEvents(t *testing.T) {
	hub := NewHub(context.Background())
	userID := uuid.New()
	saver := &notificationSaverMock{}
	hub.SetNotificationSaver(saver)

	if err := hub.BroadcastToUser(userID, "proposal.created", map[string]string{"id": "p1"}); err != nil {
		t.Fatalf("persistable event should not fail: %v", err)
	}
	if saver.count() != 1 {
		t.Fatalf("expected persistable event to be saved once, got=%d", saver.count())
	}

	if err := hub.BroadcastToUser(userID, "connection.state", map[string]string{"state": "recovered"}); err != nil {
		t.Fatalf("technical event should still be broadcasted: %v", err)
	}
	if err := hub.BroadcastToUser(userID, "notification.unread_count.updated", map[string]int{"unread_count": 0}); err != nil {
		t.Fatalf("unread event should still be broadcasted: %v", err)
	}
	if saver.count() != 1 {
		t.Fatalf("expected technical events not to be saved, got=%d", saver.count())
	}
}

func TestIsPersistableNotificationEvent(t *testing.T) {
	cases := []struct {
		event string
		want  bool
	}{
		{event: "proposal.created", want: true},
		{event: "order.updated", want: true},
		{event: "chat.message.created", want: true},
		{event: "transaction.created", want: true},
		{event: "session.revoked", want: true},
		{event: "connection.state", want: false},
		{event: "chat.typing.updated", want: false},
		{event: "notification.unread_count.updated", want: false},
		{event: "notification.read", want: false},
	}

	for _, tc := range cases {
		got := isPersistableNotificationEvent(tc.event)
		if got != tc.want {
			t.Fatalf("unexpected persistability for event=%s got=%v want=%v", tc.event, got, tc.want)
		}
	}
}
