package router

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestOpenAPIContainsTopRTDomains(t *testing.T) {
	openapiPath := filepath.Clean(filepath.Join("..", "..", "..", "docs", "openapi.yaml"))
	raw, err := os.ReadFile(openapiPath)
	if err != nil {
		t.Fatalf("failed to read openapi file: %v", err)
	}
	content := string(raw)

	requiredSnippets := []string{
		"/conversations/{conversationId}/read:",
		"/orders/{id}/proposals:",
		"/notifications:",
		"/payments/transactions:",
		"/payments/escrow/{orderId}/release:",
		"/payments/escrow/{orderId}/refund:",
		"ErrorCode:",
		"internal_server_error",
		"validation_error",
		"pagination:",
	}

	for _, snippet := range requiredSnippets {
		if !strings.Contains(content, snippet) {
			t.Fatalf("openapi missing required snippet: %s", snippet)
		}
	}
}

