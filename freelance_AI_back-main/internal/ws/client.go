package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"runtime/debug"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	writeWait  = 10 * time.Second
	pongWait   = 60 * time.Second
	pingPeriod = (pongWait * 9) / 10
)

// Client представляет одно подключение WebSocket.
type Client struct {
	conn        *websocket.Conn
	hub         *Hub
	userID      uuid.UUID
	send        chan []byte
	ctx         context.Context
	lastEventID string

	commandResultsMu sync.RWMutex
	commandResults   map[string]commandResult
}

type commandResult struct {
	Ack     bool
	Code    string
	Message string
}

// NewClient создаёт нового клиента.
func NewClient(conn *websocket.Conn, hub *Hub, userID uuid.UUID, lastEventID string) *Client {
	return &Client{
		conn:           conn,
		hub:            hub,
		userID:         userID,
		send:           make(chan []byte, 16),
		lastEventID:    lastEventID,
		commandResults: make(map[string]commandResult),
	}
}

// Run запускает обработку входящих и исходящих сообщений.
func (c *Client) Run(ctx context.Context) {
	c.ctx = ctx
	go c.writePumpSafe()
	c.readPump(ctx)
}

// Context возвращает связанный контекст клиента.
func (c *Client) Context() context.Context {
	if c.ctx == nil {
		return context.Background()
	}
	return c.ctx
}

func (c *Client) LastEventID() string {
	return c.lastEventID
}

// writePumpSafe запускает writePump с обработкой panic
func (c *Client) writePumpSafe() {
	defer func() {
		if r := recover(); r != nil {
			fmt.Printf("WebSocket writePump panic recovered: %v\nStack trace:\n%s\n", r, debug.Stack())
			c.Close()
		}
	}()
	c.writePump()
}

// Close закрывает соединение.
func (c *Client) Close() {
	c.hub.Unregister(c)
	c.conn.Close()
}

func (c *Client) readPump(ctx context.Context) {
	defer func() {
		if r := recover(); r != nil {
			fmt.Printf("WebSocket readPump panic recovered: %v\nStack trace:\n%s\n", r, debug.Stack())
		}
		c.Close()
	}()

	// Увеличиваем лимит чтения для больших сообщений (512KB)
	c.conn.SetReadLimit(512 * 1024)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
		c.hub.TouchPresence(c.userID)
		return nil
	})

	for {
		select {
		case <-ctx.Done():
			return
		default:
			_, raw, err := c.conn.ReadMessage()
			if err != nil {
				// Логируем ошибку только если это не нормальное закрытие
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					// Можно добавить логирование здесь при необходимости
				}
				return
			}

			var request ClientCommandEnvelope
			if err := json.Unmarshal(raw, &request); err != nil {
				_ = c.WriteNack("", "ws_invalid_json", "invalid ws json payload")
				continue
			}
			if request.Version != protocolVersion {
				_ = c.WriteNack(request.RequestID, "ws_invalid_version", "unsupported ws protocol version")
				continue
			}
			if request.Cmd == "" {
				_ = c.WriteNack(request.RequestID, "ws_invalid_command", "cmd is required")
				continue
			}
			if request.RequestID != "" {
				if res, ok := c.getCachedCommandResult(request.RequestID); ok {
					_ = c.writeCommandResult(request.RequestID, res)
					continue
				}
			}

			err = c.hub.HandleClientCommand(c, request)
			if err != nil {
				res := commandResult{
					Ack:     false,
					Code:    "ws_command_failed",
					Message: err.Error(),
				}
				if cmdErr, ok := AsCommandError(err); ok {
					res.Code = cmdErr.Code
					res.Message = cmdErr.Message
				}
				if request.RequestID != "" {
					c.cacheCommandResult(request.RequestID, res)
				}
				_ = c.writeCommandResult(request.RequestID, res)
				continue
			}

			res := commandResult{Ack: true}
			if request.RequestID != "" {
				c.cacheCommandResult(request.RequestID, res)
			}
			_ = c.writeCommandResult(request.RequestID, res)
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) WriteAck(requestID string) error {
	if requestID == "" {
		return nil
	}
	payload, err := json.Marshal(map[string]string{
		"type":       "ack",
		"request_id": requestID,
	})
	if err != nil {
		return err
	}
	select {
	case c.send <- payload:
		return nil
	default:
		return fmt.Errorf("ws: ack queue is full")
	}
}

func (c *Client) WriteNack(requestID, code, message string) error {
	payload := map[string]interface{}{
		"type":       "nack",
		"request_id": requestID,
		"error": map[string]string{
			"code":    code,
			"message": message,
		},
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	select {
	case c.send <- raw:
		return nil
	default:
		return fmt.Errorf("ws: nack queue is full")
	}
}

func (c *Client) getCachedCommandResult(requestID string) (commandResult, bool) {
	c.commandResultsMu.RLock()
	defer c.commandResultsMu.RUnlock()
	res, ok := c.commandResults[requestID]
	return res, ok
}

func (c *Client) cacheCommandResult(requestID string, res commandResult) {
	c.commandResultsMu.Lock()
	defer c.commandResultsMu.Unlock()
	c.commandResults[requestID] = res
	if len(c.commandResults) > 200 {
		for key := range c.commandResults {
			delete(c.commandResults, key)
			break
		}
	}
}

func (c *Client) writeCommandResult(requestID string, res commandResult) error {
	if res.Ack {
		return c.WriteAck(requestID)
	}
	return c.WriteNack(requestID, res.Code, res.Message)
}
