package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// RTStateStore хранит эфемерное состояние для realtime-фич.
type RTStateStore interface {
	SetTyping(ctx context.Context, userID, conversationID uuid.UUID, ttl time.Duration) error
	ClearTyping(ctx context.Context, userID, conversationID uuid.UUID) error
	GetTyping(ctx context.Context, conversationID uuid.UUID) ([]uuid.UUID, error)
	SetPresenceOnline(ctx context.Context, userID uuid.UUID, ttl time.Duration) error
	SetPresenceOffline(ctx context.Context, userID uuid.UUID) error
	CountOnline(ctx context.Context) (int, error)
	SubscribeTargets(ctx context.Context, userID uuid.UUID, targets []uuid.UUID) error
}

type memoryEntry struct {
	expiresAt time.Time
}

// MemoryRTStateStore - fallback store для dev/tests и при недоступном Redis.
type MemoryRTStateStore struct {
	mu          sync.RWMutex
	typing      map[uuid.UUID]map[uuid.UUID]memoryEntry // conversation -> user -> expiry
	presence    map[uuid.UUID]memoryEntry
	subscribeTo map[uuid.UUID]map[uuid.UUID]struct{}
}

func NewMemoryRTStateStore() *MemoryRTStateStore {
	store := &MemoryRTStateStore{
		typing:      make(map[uuid.UUID]map[uuid.UUID]memoryEntry),
		presence:    make(map[uuid.UUID]memoryEntry),
		subscribeTo: make(map[uuid.UUID]map[uuid.UUID]struct{}),
	}
	go store.cleanupLoop()
	return store
}

func (m *MemoryRTStateStore) SetTyping(_ context.Context, userID, conversationID uuid.UUID, ttl time.Duration) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.typing[conversationID]; !ok {
		m.typing[conversationID] = make(map[uuid.UUID]memoryEntry)
	}
	m.typing[conversationID][userID] = memoryEntry{expiresAt: time.Now().Add(ttl)}
	return nil
}

func (m *MemoryRTStateStore) ClearTyping(_ context.Context, userID, conversationID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if users, ok := m.typing[conversationID]; ok {
		delete(users, userID)
		if len(users) == 0 {
			delete(m.typing, conversationID)
		}
	}
	return nil
}

func (m *MemoryRTStateStore) GetTyping(_ context.Context, conversationID uuid.UUID) ([]uuid.UUID, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	usersMap := m.typing[conversationID]
	result := make([]uuid.UUID, 0, len(usersMap))
	now := time.Now()
	for userID, entry := range usersMap {
		if entry.expiresAt.After(now) {
			result = append(result, userID)
		}
	}
	sort.Slice(result, func(i, j int) bool { return result[i].String() < result[j].String() })
	return result, nil
}

func (m *MemoryRTStateStore) SetPresenceOnline(_ context.Context, userID uuid.UUID, ttl time.Duration) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.presence[userID] = memoryEntry{expiresAt: time.Now().Add(ttl)}
	return nil
}

func (m *MemoryRTStateStore) SetPresenceOffline(_ context.Context, userID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.presence, userID)
	return nil
}

func (m *MemoryRTStateStore) CountOnline(_ context.Context) (int, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	now := time.Now()
	count := 0
	for _, entry := range m.presence {
		if entry.expiresAt.After(now) {
			count++
		}
	}
	return count, nil
}

func (m *MemoryRTStateStore) SubscribeTargets(_ context.Context, userID uuid.UUID, targets []uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	set := make(map[uuid.UUID]struct{}, len(targets))
	for _, target := range targets {
		set[target] = struct{}{}
	}
	m.subscribeTo[userID] = set
	return nil
}

func (m *MemoryRTStateStore) cleanupLoop() {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		m.cleanupExpired()
	}
}

func (m *MemoryRTStateStore) cleanupExpired() {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now()
	for conversationID, users := range m.typing {
		for userID, entry := range users {
			if !entry.expiresAt.After(now) {
				delete(users, userID)
			}
		}
		if len(users) == 0 {
			delete(m.typing, conversationID)
		}
	}
	for userID, entry := range m.presence {
		if !entry.expiresAt.After(now) {
			delete(m.presence, userID)
		}
	}
}

// RedisRTStateStore хранит realtime-состояние в Redis.
type RedisRTStateStore struct {
	client *redis.Client
}

func NewRedisRTStateStore(ctx context.Context, redisURL string) (*RedisRTStateStore, error) {
	if redisURL == "" {
		return nil, fmt.Errorf("redis url is empty")
	}
	options, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}
	client := redis.NewClient(options)
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}
	return &RedisRTStateStore{client: client}, nil
}

func (r *RedisRTStateStore) SetTyping(ctx context.Context, userID, conversationID uuid.UUID, ttl time.Duration) error {
	key := fmt.Sprintf("rt:typing:%s:%s", conversationID, userID)
	return r.client.Set(ctx, key, "1", ttl).Err()
}

func (r *RedisRTStateStore) ClearTyping(ctx context.Context, userID, conversationID uuid.UUID) error {
	key := fmt.Sprintf("rt:typing:%s:%s", conversationID, userID)
	return r.client.Del(ctx, key).Err()
}

func (r *RedisRTStateStore) GetTyping(ctx context.Context, conversationID uuid.UUID) ([]uuid.UUID, error) {
	pattern := fmt.Sprintf("rt:typing:%s:*", conversationID)
	keys, err := r.client.Keys(ctx, pattern).Result()
	if err != nil {
		return nil, err
	}
	result := make([]uuid.UUID, 0, len(keys))
	for _, key := range keys {
		parts := strings.Split(key, ":")
		if len(parts) != 4 {
			continue
		}
		userPart := parts[3]
		parsed, err := uuid.Parse(userPart)
		if err == nil {
			result = append(result, parsed)
		}
	}
	sort.Slice(result, func(i, j int) bool { return result[i].String() < result[j].String() })
	return result, nil
}

func (r *RedisRTStateStore) SetPresenceOnline(ctx context.Context, userID uuid.UUID, ttl time.Duration) error {
	key := fmt.Sprintf("rt:presence:%s", userID)
	return r.client.Set(ctx, key, "1", ttl).Err()
}

func (r *RedisRTStateStore) SetPresenceOffline(ctx context.Context, userID uuid.UUID) error {
	key := fmt.Sprintf("rt:presence:%s", userID)
	return r.client.Del(ctx, key).Err()
}

func (r *RedisRTStateStore) CountOnline(ctx context.Context) (int, error) {
	keys, err := r.client.Keys(ctx, "rt:presence:*").Result()
	if err != nil {
		return 0, err
	}
	return len(keys), nil
}

func (r *RedisRTStateStore) SubscribeTargets(ctx context.Context, userID uuid.UUID, targets []uuid.UUID) error {
	key := fmt.Sprintf("rt:sub:%s", userID)
	payload, err := json.Marshal(targets)
	if err != nil {
		return err
	}
	return r.client.Set(ctx, key, payload, 24*time.Hour).Err()
}
