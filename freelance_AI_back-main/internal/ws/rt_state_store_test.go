package ws

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestMemoryRTStateStore_PresenceTTL(t *testing.T) {
	store := NewMemoryRTStateStore()
	userID := uuid.New()

	if err := store.SetPresenceOnline(context.Background(), userID, 20*time.Millisecond); err != nil {
		t.Fatalf("set presence: %v", err)
	}
	count, err := store.CountOnline(context.Background())
	if err != nil {
		t.Fatalf("count online: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected 1 online, got %d", count)
	}

	time.Sleep(30 * time.Millisecond)
	count, err = store.CountOnline(context.Background())
	if err != nil {
		t.Fatalf("count online after ttl: %v", err)
	}
	if count != 0 {
		t.Fatalf("expected 0 online after ttl, got %d", count)
	}
}

func TestMemoryRTStateStore_TypingTTL(t *testing.T) {
	store := NewMemoryRTStateStore()
	conversationID := uuid.New()
	userID := uuid.New()

	if err := store.SetTyping(context.Background(), userID, conversationID, 20*time.Millisecond); err != nil {
		t.Fatalf("set typing: %v", err)
	}
	users, err := store.GetTyping(context.Background(), conversationID)
	if err != nil {
		t.Fatalf("get typing: %v", err)
	}
	if len(users) != 1 || users[0] != userID {
		t.Fatalf("expected typing user %s, got %+v", userID, users)
	}

	time.Sleep(30 * time.Millisecond)
	users, err = store.GetTyping(context.Background(), conversationID)
	if err != nil {
		t.Fatalf("get typing after ttl: %v", err)
	}
	if len(users) != 0 {
		t.Fatalf("expected no typing users after ttl, got %+v", users)
	}
}
