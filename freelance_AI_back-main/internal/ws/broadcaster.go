package ws

import (
	"fmt"

	"github.com/google/uuid"
)

// RealtimeBroadcaster описывает единый интерфейс отправки realtime-событий.
type RealtimeBroadcaster interface {
	EmitToUser(userID uuid.UUID, eventType string, payload interface{}) error
	EmitToUsers(userIDs []uuid.UUID, eventType string, payload interface{}) error
	EmitGlobal(eventType string, payload interface{}) error
}

// HubBroadcaster адаптирует Hub к RealtimeBroadcaster.
type HubBroadcaster struct {
	hub *Hub
}

func NewHubBroadcaster(hub *Hub) *HubBroadcaster {
	return &HubBroadcaster{hub: hub}
}

func (b *HubBroadcaster) EmitToUser(userID uuid.UUID, eventType string, payload interface{}) error {
	if b.hub == nil {
		return fmt.Errorf("hub is nil")
	}
	return b.hub.BroadcastToUser(userID, eventType, payload)
}

func (b *HubBroadcaster) EmitToUsers(userIDs []uuid.UUID, eventType string, payload interface{}) error {
	if b.hub == nil {
		return fmt.Errorf("hub is nil")
	}
	for _, userID := range userIDs {
		if err := b.hub.BroadcastToUser(userID, eventType, payload); err != nil {
			return err
		}
	}
	return nil
}

func (b *HubBroadcaster) EmitGlobal(eventType string, payload interface{}) error {
	if b.hub == nil {
		return fmt.Errorf("hub is nil")
	}
	return b.hub.BroadcastGlobal(eventType, payload)
}
