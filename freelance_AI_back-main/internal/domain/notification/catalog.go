package notification

import (
	"encoding/json"
	"strings"
)

type NormalizedFields struct {
	Type    string
	Title   string
	Message string
	Link    string
	Event   string
}

type fallback struct {
	Type    string
	Title   string
	Message string
}

var eventFallbacks = map[string]fallback{
	"notification.created": {
		Type:    "system",
		Title:   "Новое уведомление",
		Message: "Проверьте центр уведомлений",
	},
	"proposal.created": {
		Type:    "proposal",
		Title:   "Новый отклик",
		Message: "Входящие отклики обновлены",
	},
	"proposal.updated": {
		Type:    "proposal",
		Title:   "Отклик обновлен",
		Message: "Статус отклика изменился",
	},
	"order.created": {
		Type:    "order",
		Title:   "Новый заказ",
		Message: "Лента заказов обновлена",
	},
	"order.updated": {
		Type:    "order",
		Title:   "Заказ обновлен",
		Message: "Изменения в карточке заказа",
	},
	"chat.message.created": {
		Type:    "message",
		Title:   "Новое сообщение",
		Message: "Откройте чаты, чтобы ответить",
	},
	"chat.message.updated": {
		Type:    "message",
		Title:   "Сообщение обновлено",
		Message: "Содержимое сообщения изменено",
	},
	"balance.updated": {
		Type:    "payment",
		Title:   "Баланс обновлен",
		Message: "Проверьте актуальное состояние баланса",
	},
	"transaction.created": {
		Type:    "payment",
		Title:   "Новая транзакция",
		Message: "История операций обновлена",
	},
	"proposal.ai_analysis_ready": {
		Type:    "ai",
		Title:   "AI-анализ готов",
		Message: "Анализ откликов завершён",
	},
	"session.revoked": {
		Type:    "system",
		Title:   "Сессия завершена",
		Message: "Выполнен выход из аккаунта",
	},
}

var typeFallbacks = map[string]fallback{
	"message": {
		Title:   "Сообщение",
		Message: "Откройте сообщения для деталей",
	},
	"proposal": {
		Title:   "Обновление отклика",
		Message: "Проверьте изменения по отклику",
	},
	"order": {
		Title:   "Обновление заказа",
		Message: "Проверьте изменения по заказу",
	},
	"payment": {
		Title:   "Финансовое обновление",
		Message: "Проверьте историю операций",
	},
	"ai": {
		Title:   "AI-обновление",
		Message: "Новая AI-активность по вашему аккаунту",
	},
	"system": {
		Title:   "Уведомление",
		Message: "Проверьте центр уведомлений",
	},
}

func NormalizePayload(payload json.RawMessage) NormalizedFields {
	root := toObject(payload)
	nested := toObject(root["data"])

	eventName := firstString(
		root["event"],
		root["event_type"],
		root["kind"],
		nested["event"],
		nested["event_type"],
		nested["kind"],
	)
	rawType := firstString(
		root["type"],
		root["category"],
		nested["type"],
		nested["category"],
	)

	normalizedType := normalizeType(rawType, eventName)
	fallbackByEvent, hasEventFallback := eventFallbacks[eventName]
	fallbackByType, hasTypeFallback := typeFallbacks[normalizedType]

	resolvedType := normalizedType
	if hasEventFallback && fallbackByEvent.Type != "" {
		resolvedType = fallbackByEvent.Type
	}
	if resolvedType == "" {
		resolvedType = "system"
	}

	title := firstString(root["title"], root["name"], nested["title"], nested["name"])
	if title == "" {
		if hasEventFallback {
			title = fallbackByEvent.Title
		} else if hasTypeFallback {
			title = fallbackByType.Title
		} else {
			title = "Уведомление"
		}
	}

	message := firstString(
		root["message"],
		root["description"],
		root["body"],
		root["text"],
		nested["message"],
		nested["description"],
		nested["body"],
		nested["text"],
	)
	if message == "" {
		if hasEventFallback {
			message = fallbackByEvent.Message
		} else if hasTypeFallback {
			message = fallbackByType.Message
		} else {
			message = "Проверьте центр уведомлений"
		}
	}

	link := firstString(root["link"], root["url"], root["path"], nested["link"], nested["url"], nested["path"])

	return NormalizedFields{
		Type:    resolvedType,
		Title:   title,
		Message: message,
		Link:    link,
		Event:   eventName,
	}
}

func toObject(raw interface{}) map[string]interface{} {
	if raw == nil {
		return map[string]interface{}{}
	}
	if bytes, ok := raw.(json.RawMessage); ok {
		var decoded map[string]interface{}
		if err := json.Unmarshal(bytes, &decoded); err == nil {
			return decoded
		}
		return map[string]interface{}{}
	}
	if object, ok := raw.(map[string]interface{}); ok {
		return object
	}
	if bytes, ok := raw.([]byte); ok {
		var decoded map[string]interface{}
		if err := json.Unmarshal(bytes, &decoded); err == nil {
			return decoded
		}
		return map[string]interface{}{}
	}
	if text, ok := raw.(string); ok {
		var decoded map[string]interface{}
		if err := json.Unmarshal([]byte(text), &decoded); err == nil {
			return decoded
		}
		return map[string]interface{}{}
	}
	return map[string]interface{}{}
}

func firstString(values ...interface{}) string {
	for _, raw := range values {
		str, ok := raw.(string)
		if !ok {
			continue
		}
		trimmed := strings.TrimSpace(str)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func normalizeType(rawType, eventName string) string {
	source := strings.ToLower(rawType + " " + eventName)
	switch {
	case strings.Contains(source, "proposal"):
		return "proposal"
	case strings.Contains(source, "order"):
		return "order"
	case strings.Contains(source, "chat.message"), strings.Contains(source, "message"):
		return "message"
	case strings.Contains(source, "balance"), strings.Contains(source, "transaction"), strings.Contains(source, "payment"):
		return "payment"
	case strings.Contains(source, "ai"):
		return "ai"
	default:
		if rawType != "" {
			return rawType
		}
		return "system"
	}
}
