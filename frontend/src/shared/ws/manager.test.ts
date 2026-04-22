import { beforeEach, describe, expect, it, vi } from "vitest";
import { WsManager } from "@/shared/ws/manager";

type MessageEventHandler = (event: { data: string }) => void;
type VoidHandler = () => void;

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  onmessage: MessageEventHandler | null = null;
  onopen: VoidHandler | null = null;
  onclose: VoidHandler | null = null;

  readyState = MockWebSocket.CONNECTING;
  sent: string[] = [];
  listeners = new Map<string, Set<VoidHandler>>();
  url: string;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  addEventListener(type: string, handler: VoidHandler): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set<VoidHandler>());
    }
    this.listeners.get(type)?.add(handler);
  }

  removeEventListener(type: string, handler: VoidHandler): void {
    this.listeners.get(type)?.delete(handler);
  }

  send(payload: string): void {
    this.sent.push(payload);
  }

  open(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
    this.listeners.get("open")?.forEach((handler) => handler());
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  emitMessage(payload: unknown): void {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }
}

describe("WsManager", () => {
  beforeEach(() => {
    vi.useRealTimers();
    MockWebSocket.instances = [];
    localStorage.setItem("vb_access_token", "test-token");
    vi.stubGlobal("WebSocket", MockWebSocket as unknown as typeof WebSocket);
  });

  const waitForSentPayload = async (socket: MockWebSocket): Promise<string> => {
    for (let i = 0; i < 20; i++) {
      if (socket.sent.length > 0) {
        return socket.sent[0]!;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    throw new Error("command payload was not sent");
  };

  const firstSocket = (): MockWebSocket => {
    const socket = MockWebSocket.instances[0];
    if (!socket) {
      throw new Error("websocket was not created");
    }
    return socket;
  };

  it("resolves command promise on ack", async () => {
    const manager = new WsManager();
    const promise = manager.sendCommand("notification.mark_all_read", {});

    const socket = firstSocket();
    expect(socket).toBeTruthy();
    socket.open();

    const payload = JSON.parse(await waitForSentPayload(socket)) as { request_id: string };
    socket.emitMessage({ type: "ack", request_id: payload.request_id });

    await expect(promise).resolves.toBeUndefined();
  });

  it("rejects command promise on nack", async () => {
    const manager = new WsManager();
    const promise = manager.sendCommand("notification.mark_all_read", {});

    const socket = firstSocket();
    socket.open();

    const payload = JSON.parse(await waitForSentPayload(socket)) as { request_id: string };
    socket.emitMessage({
      type: "nack",
      request_id: payload.request_id,
      error: { code: "ws_failed", message: "command failed" }
    });

    await expect(promise).rejects.toThrow("command failed");
  });

  it("deduplicates server events by event_id", () => {
    const manager = new WsManager();
    let calls = 0;
    manager.subscribe(() => {
      calls += 1;
    });

    manager.connect();
    const socket = firstSocket();
    socket.open();

    const event = {
      type: "presence.online_count.updated",
      version: 1,
      event_id: "evt-1",
      ts: new Date().toISOString(),
      data: { online_count: 3 }
    };
    socket.emitMessage(event);
    socket.emitMessage(event);

    expect(calls).toBe(2); // first connection.state synthetic + one real event
  });
});
