package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	domainNotification "github.com/ignatzorin/freelance-backend/internal/domain/notification"
	httpresp "github.com/ignatzorin/freelance-backend/internal/interface/http/response"
	"github.com/ignatzorin/freelance-backend/internal/pkg/apperror"
	"github.com/ignatzorin/freelance-backend/internal/usecase/notification"
	"github.com/ignatzorin/freelance-backend/internal/ws"
)

// NotificationHandler handles notification related requests.
type NotificationHandler struct {
	listNotificationsUC  *notification.ListNotificationsUseCase
	getNotificationUC    *notification.GetNotificationUseCase
	countUnreadUC        *notification.CountUnreadNotificationsUseCase
	markReadUC           *notification.MarkReadUseCase
	markAllReadUC        *notification.MarkAllReadUseCase
	deleteNotificationUC *notification.DeleteNotificationUseCase
	broadcaster          ws.RealtimeBroadcaster
}

// NewNotificationHandler creates a new NotificationHandler.
func NewNotificationHandler(
	listNotificationsUC *notification.ListNotificationsUseCase,
	getNotificationUC *notification.GetNotificationUseCase,
	countUnreadUC *notification.CountUnreadNotificationsUseCase,
	markReadUC *notification.MarkReadUseCase,
	markAllReadUC *notification.MarkAllReadUseCase,
	deleteNotificationUC *notification.DeleteNotificationUseCase,
) *NotificationHandler {
	return &NotificationHandler{
		listNotificationsUC:  listNotificationsUC,
		getNotificationUC:    getNotificationUC,
		countUnreadUC:        countUnreadUC,
		markReadUC:           markReadUC,
		markAllReadUC:        markAllReadUC,
		deleteNotificationUC: deleteNotificationUC,
	}
}

func (h *NotificationHandler) SetBroadcaster(broadcaster ws.RealtimeBroadcaster) {
	h.broadcaster = broadcaster
}

// ListNotifications handles GET /notifications
func (h *NotificationHandler) ListNotifications(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}

	limit := parseIntQuery(c, "limit", 20)
	offset := parseIntQuery(c, "offset", 0)

	notifications, unreadCount, err := h.listNotificationsUC.Run(c.Request.Context(), userID, limit, offset)
	if err != nil {
		httpresp.Error(c, err)
		return
	}

	total := offset + len(notifications)
	hasMore := limit > 0 && len(notifications) == limit
	if hasMore {
		total++
	}

	c.JSON(200, httpresp.PaginatedResponse{
		Success: true,
		Data: gin.H{
			"notifications": mapNotificationsResponse(notifications),
			"unread_count":  unreadCount,
		},
		Pagination: httpresp.Pagination{
			Total:   total,
			Limit:   limit,
			Offset:  offset,
			HasMore: hasMore,
		},
	})
}

// MarkAsRead handles POST /notifications/:id/read
func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}

	id, ok := parseUUIDParam(c, "id", "invalid notification id")
	if !ok {
		return
	}

	if err := h.markReadUC.Run(c.Request.Context(), userID, id); err != nil {
		if apperror.IsNotFound(err) {
			httpresp.NotFound(c, "notification not found")
			return
		}
		httpresp.Error(c, err)
		return
	}
	if h.broadcaster != nil {
		_ = h.broadcaster.EmitToUser(userID, "notification.read", gin.H{"notification_id": id.String()})
		if count, err := h.countUnreadUC.Run(c.Request.Context(), userID); err == nil {
			_ = h.broadcaster.EmitToUser(userID, "notification.unread_count.updated", gin.H{"unread_count": count})
		}
	}

	httpresp.Success(c, gin.H{"message": "notification marked as read"})
}

// MarkAllAsRead handles POST /notifications/read-all
func (h *NotificationHandler) MarkAllAsRead(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}

	if err := h.markAllReadUC.Run(c.Request.Context(), userID); err != nil {
		httpresp.Error(c, err)
		return
	}
	if h.broadcaster != nil {
		_ = h.broadcaster.EmitToUser(userID, "notification.read", gin.H{"all": true})
		if count, err := h.countUnreadUC.Run(c.Request.Context(), userID); err == nil {
			_ = h.broadcaster.EmitToUser(userID, "notification.unread_count.updated", gin.H{"unread_count": count})
		}
	}

	httpresp.Success(c, gin.H{"message": "all notifications marked as read"})
}

// GetNotification handles GET /notifications/:id
func (h *NotificationHandler) GetNotification(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}

	id, ok := parseUUIDParam(c, "id", "invalid notification id")
	if !ok {
		return
	}

	notificationEntity, err := h.getNotificationUC.Run(c.Request.Context(), userID, id)
	if err != nil {
		if apperror.IsNotFound(err) {
			httpresp.NotFound(c, "notification not found")
			return
		}
		httpresp.Error(c, err)
		return
	}

	httpresp.Success(c, mapNotificationResponse(*notificationEntity))
}

// DeleteNotification handles DELETE /notifications/:id
func (h *NotificationHandler) DeleteNotification(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}

	id, ok := parseUUIDParam(c, "id", "invalid notification id")
	if !ok {
		return
	}

	if err := h.deleteNotificationUC.Run(c.Request.Context(), userID, id); err != nil {
		if apperror.IsNotFound(err) {
			httpresp.NotFound(c, "notification not found")
			return
		}
		httpresp.Error(c, err)
		return
	}

	httpresp.Success(c, gin.H{"message": "notification deleted"})
}

// CountUnread handles GET /notifications/unread/count
func (h *NotificationHandler) CountUnread(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}

	count, err := h.countUnreadUC.Run(c.Request.Context(), userID)
	if err != nil {
		httpresp.Error(c, err)
		return
	}

	httpresp.Success(c, gin.H{"unread_count": count})
}

func mapNotificationsResponse(notifications []entity.Notification) []gin.H {
	result := make([]gin.H, 0, len(notifications))
	for _, item := range notifications {
		result = append(result, mapNotificationResponse(item))
	}
	return result
}

func mapNotificationResponse(item entity.Notification) gin.H {
	mapped := domainNotification.NormalizePayload(item.Payload)
	response := gin.H{
		"id":         item.ID.String(),
		"type":       mapped.Type,
		"title":      mapped.Title,
		"message":    mapped.Message,
		"is_read":    item.IsRead,
		"created_at": item.CreatedAt,
		"payload":    item.Payload,
	}
	if mapped.Link != "" {
		response["link"] = mapped.Link
	}
	return response
}
