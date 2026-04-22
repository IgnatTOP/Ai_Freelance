package handler

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
)

func TestMapNotificationResponse_UsesNormalizedPayloadFields(t *testing.T) {
	now := time.Now().UTC()
	item := entity.Notification{
		ID:        uuid.MustParse("8ea1512f-80ed-465a-acdb-df5127f280f0"),
		UserID:    uuid.MustParse("11111111-1111-1111-1111-111111111111"),
		Payload:   []byte(`{"event":"proposal.created","data":{"title":"Новый отклик","message":"Поступил новый отклик","link":"/dashboard/proposals"}}`),
		IsRead:    false,
		CreatedAt: now,
	}

	got := mapNotificationResponse(item)
	if got["type"] != "proposal" {
		t.Fatalf("unexpected type: %v", got["type"])
	}
	if got["title"] != "Новый отклик" {
		t.Fatalf("unexpected title: %v", got["title"])
	}
	if got["message"] != "Поступил новый отклик" {
		t.Fatalf("unexpected message: %v", got["message"])
	}
	if got["link"] != "/dashboard/proposals" {
		t.Fatalf("unexpected link: %v", got["link"])
	}
}

func TestMapNotificationResponse_UsesFallbacksWhenPayloadSparse(t *testing.T) {
	now := time.Now().UTC()
	item := entity.Notification{
		ID:        uuid.MustParse("7be170ef-9c6a-4443-9e87-63f1a27e48b4"),
		UserID:    uuid.MustParse("22222222-2222-2222-2222-222222222222"),
		Payload:   []byte(`{"event":"balance.updated","data":{"available":1000}}`),
		IsRead:    true,
		CreatedAt: now,
	}

	got := mapNotificationResponse(item)
	if got["type"] != "payment" {
		t.Fatalf("unexpected type: %v", got["type"])
	}
	if got["title"] != "Баланс обновлен" {
		t.Fatalf("unexpected title: %v", got["title"])
	}
	if got["message"] != "Проверьте актуальное состояние баланса" {
		t.Fatalf("unexpected message: %v", got["message"])
	}
}
