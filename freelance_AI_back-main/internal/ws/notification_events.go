package ws

import "strings"

func isPersistableNotificationEvent(event string) bool {
	switch {
	case strings.HasPrefix(event, "proposal."):
		return true
	case strings.HasPrefix(event, "order."):
		return true
	case event == "chat.message.created":
		return true
	case event == "balance.updated":
		return true
	case event == "transaction.created":
		return true
	case event == "session.revoked":
		return true
	default:
		return false
	}
}
