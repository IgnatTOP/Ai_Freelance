package handlers

import (
	"net/http"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	"github.com/ignatzorin/freelance-backend/internal/service"
	"github.com/ignatzorin/freelance-backend/internal/ws"
)

// WSHandler отвечает за установку WebSocket соединений.
type WSHandler struct {
	hub          *ws.Hub
	tokenManager *service.TokenManager
	upgrader     websocket.Upgrader
	allowAll     bool
	origins      map[string]struct{}
}

const wsProtocol = "ailance-ws"

// NewWSHandler создаёт новый хэндлер с проверкой origin allowlist.
func NewWSHandler(hub *ws.Hub, tokens *service.TokenManager, allowedOrigins []string) *WSHandler {
	handler := &WSHandler{
		hub:          hub,
		tokenManager: tokens,
		origins:      make(map[string]struct{}),
	}

	for _, origin := range allowedOrigins {
		normalized := normalizeOrigin(origin)
		if normalized == "*" {
			handler.allowAll = true
			continue
		}
		if normalized == "" {
			continue
		}
		handler.origins[normalized] = struct{}{}
	}

	handler.upgrader = websocket.Upgrader{
		CheckOrigin:  handler.isOriginAllowed,
		Subprotocols: []string{wsProtocol},
	}

	return handler
}

// TokenManager возвращает менеджер токенов (используется в middleware).
func (h *WSHandler) TokenManager() *service.TokenManager {
	return h.tokenManager
}

func normalizeOrigin(raw string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return ""
	}
	if value == "*" {
		return value
	}
	parsed, err := url.Parse(value)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return ""
	}
	return strings.ToLower(parsed.Scheme + "://" + parsed.Host)
}

func (h *WSHandler) isOriginAllowed(r *http.Request) bool {
	if h.allowAll {
		return true
	}
	normalized := normalizeOrigin(r.Header.Get("Origin"))
	if normalized == "" {
		return false
	}
	_, ok := h.origins[normalized]
	return ok
}

func extractAccessToken(r *http.Request) string {
	authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
	if len(authHeader) > 7 && strings.EqualFold(authHeader[:7], "Bearer ") {
		token := strings.TrimSpace(authHeader[7:])
		if token != "" {
			return token
		}
	}

	rawProtocols := strings.TrimSpace(r.Header.Get("Sec-WebSocket-Protocol"))
	if rawProtocols == "" {
		return ""
	}
	parts := strings.Split(rawProtocols, ",")
	if len(parts) < 2 {
		return ""
	}
	name := strings.TrimSpace(parts[0])
	if name != wsProtocol {
		return ""
	}
	return strings.TrimSpace(parts[1])
}

// Handle обслуживает GET /api/ws.
func (h *WSHandler) Handle(c *gin.Context) {
	rawToken := extractAccessToken(c.Request)
	if rawToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "access токен обязателен"})
		return
	}

	userID, _, err := h.tokenManager.ParseAccess(rawToken)
	if err != nil || userID == uuid.Nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "невалидный access токен"})
		return
	}

	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "не удалось установить websocket соединение"})
		return
	}

	lastEventID := strings.TrimSpace(c.Query("last_event_id"))
	client := ws.NewClient(conn, h.hub, userID, lastEventID)
	h.hub.Register(client)

	client.Run(c.Request.Context())
}
