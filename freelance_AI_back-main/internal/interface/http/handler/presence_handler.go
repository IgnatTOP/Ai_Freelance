package handler

import (
	"github.com/gin-gonic/gin"
	httpresp "github.com/ignatzorin/freelance-backend/internal/interface/http/response"
)

type OnlineCounter interface {
	OnlineUsersCount() int
}

type PresenceHandler struct {
	counter OnlineCounter
}

func NewPresenceHandler(counter OnlineCounter) *PresenceHandler {
	return &PresenceHandler{counter: counter}
}

func (h *PresenceHandler) GetOnlineCount(c *gin.Context) {
	if h.counter == nil {
		httpresp.Success(c, gin.H{"online_count": 0})
		return
	}
	httpresp.Success(c, gin.H{"online_count": h.counter.OnlineUsersCount()})
}
