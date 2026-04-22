package handler

import (
	"database/sql"
	"encoding/json"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	httpresp "github.com/ignatzorin/freelance-backend/internal/interface/http/response"
	"github.com/jmoiron/sqlx"
)

type NotificationSettings struct {
	Browser        map[string]bool `json:"browser"`
	Email          map[string]bool `json:"email"`
	SMS            map[string]bool `json:"sms"`
	QuietHoursFrom *string         `json:"quiet_hours_from,omitempty"`
	QuietHoursTo   *string         `json:"quiet_hours_to,omitempty"`
}

type PrivacySettings struct {
	ProfileVisible   bool   `json:"profile_visible"`
	ShowOnlineStatus bool   `json:"show_online_status"`
	DirectMessages   string `json:"direct_messages"`
}

type AISettings struct {
	AllowAIReadChats bool   `json:"allow_ai_read_chats"`
	PersistAIHistory bool   `json:"persist_ai_history"`
	ResponseStyle    string `json:"response_style"`
}

type UserSettings struct {
	Notifications NotificationSettings `json:"notifications"`
	Privacy       PrivacySettings      `json:"privacy"`
	AI            AISettings           `json:"ai"`
}

type settingsRow struct {
	Notifications json.RawMessage `db:"notifications"`
	Privacy       json.RawMessage `db:"privacy"`
	AI            json.RawMessage `db:"ai"`
}

type SettingsHandler struct {
	db *sqlx.DB
}

func NewSettingsHandler(db *sqlx.DB) *SettingsHandler {
	return &SettingsHandler{db: db}
}

func defaultSettings() UserSettings {
	return UserSettings{
		Notifications: NotificationSettings{
			Browser: map[string]bool{"chat": true, "proposal": true, "ai": true, "finance": true},
			Email:   map[string]bool{"chat": false, "proposal": true, "ai": false, "finance": true},
			SMS:     map[string]bool{"chat": false, "proposal": false, "ai": false, "finance": false},
		},
		Privacy: PrivacySettings{ProfileVisible: true, ShowOnlineStatus: true, DirectMessages: "all"},
		AI:      AISettings{AllowAIReadChats: false, PersistAIHistory: true, ResponseStyle: "neutral"},
	}
}

func (h *SettingsHandler) getUserSettings(userID uuid.UUID) (UserSettings, error) {
	if h.db == nil {
		return defaultSettings(), nil
	}

	var row settingsRow
	err := h.db.Get(&row, `SELECT notifications, privacy, ai FROM user_settings WHERE user_id = $1`, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			defaults := defaultSettings()
			if createErr := h.saveUserSettings(userID, defaults); createErr != nil {
				return defaults, nil
			}
			return defaults, nil
		}
		return defaultSettings(), err
	}

	settings := defaultSettings()
	_ = json.Unmarshal(row.Notifications, &settings.Notifications)
	_ = json.Unmarshal(row.Privacy, &settings.Privacy)
	_ = json.Unmarshal(row.AI, &settings.AI)
	return settings, nil
}

func (h *SettingsHandler) saveUserSettings(userID uuid.UUID, settings UserSettings) error {
	if h.db == nil {
		return nil
	}
	notificationsRaw, _ := json.Marshal(settings.Notifications)
	privacyRaw, _ := json.Marshal(settings.Privacy)
	aiRaw, _ := json.Marshal(settings.AI)
	_, err := h.db.Exec(
		`INSERT INTO user_settings (user_id, notifications, privacy, ai)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (user_id) DO UPDATE SET notifications = EXCLUDED.notifications, privacy = EXCLUDED.privacy, ai = EXCLUDED.ai, updated_at = NOW()`,
		userID,
		notificationsRaw,
		privacyRaw,
		aiRaw,
	)
	return err
}

func (h *SettingsHandler) GetNotifications(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}
	settings, err := h.getUserSettings(userID)
	if err != nil {
		httpresp.Error(c, err)
		return
	}
	httpresp.Success(c, settings.Notifications)
}

func (h *SettingsHandler) UpdateNotifications(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}
	var req NotificationSettings
	if err := c.ShouldBindJSON(&req); err != nil {
		httpresp.BadRequest(c, err.Error())
		return
	}
	settings, err := h.getUserSettings(userID)
	if err != nil {
		httpresp.Error(c, err)
		return
	}
	settings.Notifications = req
	if err := h.saveUserSettings(userID, settings); err != nil {
		httpresp.Error(c, err)
		return
	}
	httpresp.Success(c, req)
}

func (h *SettingsHandler) GetPrivacy(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}
	settings, err := h.getUserSettings(userID)
	if err != nil {
		httpresp.Error(c, err)
		return
	}
	httpresp.Success(c, settings.Privacy)
}

func (h *SettingsHandler) UpdatePrivacy(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}
	var req PrivacySettings
	if err := c.ShouldBindJSON(&req); err != nil {
		httpresp.BadRequest(c, err.Error())
		return
	}
	if req.DirectMessages != "all" && req.DirectMessages != "none" {
		httpresp.BadRequest(c, "direct_messages must be all or none")
		return
	}
	settings, err := h.getUserSettings(userID)
	if err != nil {
		httpresp.Error(c, err)
		return
	}
	settings.Privacy = req
	if err := h.saveUserSettings(userID, settings); err != nil {
		httpresp.Error(c, err)
		return
	}
	httpresp.Success(c, req)
}

func (h *SettingsHandler) GetAI(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}
	settings, err := h.getUserSettings(userID)
	if err != nil {
		httpresp.Error(c, err)
		return
	}
	httpresp.Success(c, settings.AI)
}

func (h *SettingsHandler) UpdateAI(c *gin.Context) {
	userID, ok := requireUserID(c, "unauthorized")
	if !ok {
		return
	}
	var req AISettings
	if err := c.ShouldBindJSON(&req); err != nil {
		httpresp.BadRequest(c, err.Error())
		return
	}
	switch req.ResponseStyle {
	case "formal", "neutral", "friendly":
	default:
		httpresp.BadRequest(c, "response_style must be formal, neutral, or friendly")
		return
	}
	settings, err := h.getUserSettings(userID)
	if err != nil {
		httpresp.Error(c, err)
		return
	}
	settings.AI = req
	if err := h.saveUserSettings(userID, settings); err != nil {
		httpresp.Error(c, err)
		return
	}
	httpresp.Success(c, req)
}
