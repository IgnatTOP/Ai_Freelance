package ws

import "testing"

func TestClientCommandResultCache(t *testing.T) {
	client := &Client{
		send:           make(chan []byte, 2),
		commandResults: make(map[string]commandResult),
	}

	client.cacheCommandResult("r1", commandResult{Ack: true})
	result, ok := client.getCachedCommandResult("r1")
	if !ok {
		t.Fatal("expected cached command result")
	}
	if !result.Ack {
		t.Fatal("expected ack command result")
	}

	if err := client.writeCommandResult("r1", result); err != nil {
		t.Fatalf("writeCommandResult returned error: %v", err)
	}
}
