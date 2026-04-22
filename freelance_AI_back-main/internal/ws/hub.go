package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"runtime/debug"
	"sync"
	"time"

	"github.com/google/uuid"
)

// NotificationSaver интерфейс для сохранения уведомлений в БД.
type NotificationSaver interface {
	CreateNotification(ctx context.Context, userID uuid.UUID, event string, data interface{}) error
}

// Hub управляет всеми WebSocket клиентами.
type Hub struct {
	mu                sync.RWMutex
	clients           map[uuid.UUID]map[*Client]struct{}
	clientToUser      map[*Client]uuid.UUID
	presenceRooms     map[uuid.UUID]map[uuid.UUID]struct{}
	eventHistory      []historyEvent
	eventHistoryLimit int
	rtStore           RTStateStore
	presenceTTL       time.Duration
	typingTTL         time.Duration
	register          chan *Client
	unregister        chan *Client
	broadcast         chan message
	notificationSaver NotificationSaver
	commandHandler    CommandHandler
	ctx               context.Context
}

type message struct {
	userID  uuid.UUID
	payload []byte
}

type historyEvent struct {
	event   ServerEventEnvelope
	payload []byte
	global  bool
	userID  uuid.UUID
}

// NewHub создаёт новый хаб.
func NewHub(ctx context.Context) *Hub {
	return &Hub{
		clients:           make(map[uuid.UUID]map[*Client]struct{}),
		clientToUser:      make(map[*Client]uuid.UUID),
		presenceRooms:     make(map[uuid.UUID]map[uuid.UUID]struct{}),
		eventHistory:      make([]historyEvent, 0, 256),
		eventHistoryLimit: 256,
		presenceTTL:       30 * time.Second,
		typingTTL:         3 * time.Second,
		register:          make(chan *Client),
		unregister:        make(chan *Client),
		broadcast:         make(chan message, 32),
		ctx:               ctx,
	}
}

// SetNotificationSaver устанавливает сервис для сохранения уведомлений.
func (h *Hub) SetNotificationSaver(saver NotificationSaver) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.notificationSaver = saver
}

// SetCommandHandler устанавливает обработчик команд от клиента.
func (h *Hub) SetCommandHandler(handler CommandHandler) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.commandHandler = handler
}

// SetRTStateStore настраивает хранилище realtime-состояния.
func (h *Hub) SetRTStateStore(store RTStateStore, presenceTTL, typingTTL time.Duration) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.rtStore = store
	if presenceTTL > 0 {
		h.presenceTTL = presenceTTL
	}
	if typingTTL > 0 {
		h.typingTTL = typingTTL
	}
}

// Run запускает главный цикл хаба.
func (h *Hub) Run() {
	for {
		select {
		case <-h.ctx.Done():
			return
		case client := <-h.register:
			h.addClient(client)
		case client := <-h.unregister:
			h.removeClient(client)
		case msg := <-h.broadcast:
			h.send(msg.userID, msg.payload)
		}
	}
}

// Register добавляет клиента.
func (h *Hub) Register(client *Client) {
	h.register <- client
}

// Unregister удаляет клиента.
func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

// BroadcastToUser отправляет сообщение конкретному пользователю и сохраняет уведомление в БД.
func (h *Hub) BroadcastToUser(userID uuid.UUID, event string, data any) error {
	payload := newServerEnvelope(event, data)
	raw, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("ws: не удалось сериализовать сообщение: %w", err)
	}

	// Сохраняем уведомление в БД, если установлен notification saver
	h.mu.RLock()
	saver := h.notificationSaver
	ctx := h.ctx
	h.mu.RUnlock()

	if saver != nil && isPersistableNotificationEvent(event) {
		if err := h.createNotificationWithRetry(ctx, saver, userID, event, data); err != nil {
			return err
		}
	}

	h.recordHistory(historyEvent{
		event:   payload,
		payload: raw,
		userID:  userID,
	})
	h.broadcast <- message{userID: userID, payload: raw}
	return nil
}

// HandleClientCommand обрабатывает команду, поступившую от пользователя через WS.
func (h *Hub) HandleClientCommand(client *Client, request ClientCommandEnvelope) error {
	h.mu.RLock()
	handler := h.commandHandler
	h.mu.RUnlock()

	if handler == nil {
		return NackError("ws_command_unavailable", "команды временно недоступны")
	}

	if err := handler.Handle(client.Context(), request, h, client.userID); err != nil {
		if cmdErr, ok := AsCommandError(err); ok {
			return cmdErr
		}
		return NackError("ws_command_failed", err.Error())
	}

	h.TouchPresence(client.userID)
	return nil
}

func (h *Hub) addClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.clients[client.userID]; !ok {
		h.clients[client.userID] = make(map[*Client]struct{})
	}
	h.clients[client.userID][client] = struct{}{}
	h.clientToUser[client] = client.userID
	if h.rtStore != nil {
		_ = h.rtStore.SetPresenceOnline(context.Background(), client.userID, h.presenceTTL)
	}
	go h.replayToClient(client)
	go h.broadcastOnlineCountEvent()
	go h.broadcastToUserConnectionState(client.userID, "recovered")
}

func (h *Hub) removeClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if clients, ok := h.clients[client.userID]; ok {
		delete(clients, client)
		if len(clients) == 0 {
			delete(h.clients, client.userID)
		}
	}
	delete(h.clientToUser, client)
	delete(h.presenceRooms, client.userID)
	if h.rtStore != nil {
		_ = h.rtStore.SetPresenceOffline(context.Background(), client.userID)
	}
	go h.broadcastOnlineCountEvent()
}

func (h *Hub) send(userID uuid.UUID, payload []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients[userID] {
		select {
		case client.send <- payload:
		default:
			// Закрываем клиент асинхронно с panic recovery
			go func(c *Client) {
				defer func() {
					if r := recover(); r != nil {
						log.Printf("ws: client close panic recovered: %v\nStack trace:\n%s", r, debug.Stack())
					}
				}()
				c.Close()
			}(client)
		}
	}
}

func (h *Hub) sendAll(payload []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, userClients := range h.clients {
		for client := range userClients {
			select {
			case client.send <- payload:
			default:
				go func(c *Client) { c.Close() }(client)
			}
		}
	}
}

// BroadcastGlobal отправляет событие всем активным WS-клиентам.
func (h *Hub) BroadcastGlobal(event string, data any) error {
	payload := newServerEnvelope(event, data)
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	h.recordHistory(historyEvent{
		event:   payload,
		payload: raw,
		global:  true,
	})
	h.sendAll(raw)
	return nil
}

// OnlineUsersCount возвращает текущее количество онлайн-пользователей.
func (h *Hub) OnlineUsersCount() int {
	if h.rtStore != nil {
		if count, err := h.rtStore.CountOnline(context.Background()); err == nil {
			return count
		}
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// SetPresenceSubscription сохраняет список пользователей, за которыми следит текущий пользователь.
func (h *Hub) SetPresenceSubscription(userID uuid.UUID, targets []uuid.UUID) {
	h.mu.Lock()
	defer h.mu.Unlock()

	set := make(map[uuid.UUID]struct{}, len(targets))
	for _, target := range targets {
		set[target] = struct{}{}
	}
	h.presenceRooms[userID] = set
	if h.rtStore != nil {
		_ = h.rtStore.SubscribeTargets(context.Background(), userID, targets)
	}
}

func (h *Hub) TypingTTL() time.Duration {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.typingTTL
}

func (h *Hub) RTStore() RTStateStore {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.rtStore
}

func (h *Hub) TouchPresence(userID uuid.UUID) {
	h.mu.RLock()
	store := h.rtStore
	ttl := h.presenceTTL
	h.mu.RUnlock()
	if store != nil {
		_ = store.SetPresenceOnline(context.Background(), userID, ttl)
	}
}

func (h *Hub) broadcastOnlineCountEvent() {
	_ = h.BroadcastGlobal("presence.online_count.updated", map[string]int{
		"online_count": h.OnlineUsersCount(),
	})
}

func (h *Hub) broadcastToUserConnectionState(userID uuid.UUID, state string) {
	_ = h.BroadcastToUser(userID, "connection.state", map[string]string{
		"state": state,
	})
}

func (h *Hub) createNotificationWithRetry(
	ctx context.Context,
	saver NotificationSaver,
	userID uuid.UUID,
	event string,
	data any,
) error {
	const (
		maxAttempts = 3
		timeout     = 2 * time.Second
		backoff     = 150 * time.Millisecond
	)

	var lastErr error
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		attemptCtx, cancel := context.WithTimeout(ctx, timeout)
		err := saver.CreateNotification(attemptCtx, userID, event, data)
		cancel()
		if err == nil {
			return nil
		}

		lastErr = err
		log.Printf("ws: failed to save notification (attempt %d/%d): %v", attempt, maxAttempts, err)
		if attempt < maxAttempts {
			select {
			case <-ctx.Done():
				return fmt.Errorf("ws: notification save cancelled: %w", ctx.Err())
			case <-time.After(backoff * time.Duration(attempt)):
			}
		}
	}

	return fmt.Errorf("ws: failed to save notification after retries: %w", lastErr)
}

func (h *Hub) recordHistory(event historyEvent) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.eventHistory = append(h.eventHistory, event)
	if len(h.eventHistory) > h.eventHistoryLimit {
		h.eventHistory = h.eventHistory[len(h.eventHistory)-h.eventHistoryLimit:]
	}
}

func (h *Hub) replayToClient(client *Client) {
	lastEventID := client.LastEventID()
	if lastEventID == "" {
		return
	}

	events := h.eventsForReplay(client.userID, lastEventID)
	for _, event := range events {
		select {
		case client.send <- event.payload:
		default:
			return
		}
	}
}

func (h *Hub) eventsForReplay(userID uuid.UUID, lastEventID string) []historyEvent {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if len(h.eventHistory) == 0 {
		return nil
	}

	start := -1
	for i := len(h.eventHistory) - 1; i >= 0; i-- {
		if h.eventHistory[i].event.EventID == lastEventID {
			start = i + 1
			break
		}
	}
	if start == -1 {
		start = len(h.eventHistory) - 20
		if start < 0 {
			start = 0
		}
	}

	result := make([]historyEvent, 0, len(h.eventHistory)-start)
	for _, item := range h.eventHistory[start:] {
		if item.global || item.userID == userID {
			result = append(result, item)
		}
	}
	return result
}
