import { env } from "@/shared/config/env";
import { authTokenStorage } from "@/shared/api/client";
import {
  wsAckSchema,
  wsCommandPayloadSchemas,
  wsEventPayloadSchemas,
  wsNackSchema,
  wsServerEnvelopeSchema,
  type WsServerEnvelope
} from "@/shared/ws/protocol";

type WsHandler = (message: WsServerEnvelope) => void;

type PendingCommand = {
  resolve: () => void;
  reject: (error: Error) => void;
};

export class WsManager {
  private socket: WebSocket | null = null;
  private handlers = new Set<WsHandler>();
  private pending = new Map<string, PendingCommand>();
  private seenEvents = new Set<string>();
  private lastEventId: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private openPromise: Promise<void> | null = null;
  private shouldReconnect = true;

  connect(): void {
    if (this.socket && this.socket.readyState <= 1) return;

    const token = authTokenStorage.get();
    if (!token) return;

    this.shouldReconnect = true;
    const wsUrl = this.buildConnectionUrl();
    this.socket = new WebSocket(wsUrl, ["ailance-ws", token]);
    this.openPromise = new Promise<void>((resolve) => {
      const onOpen = () => {
        this.socket?.removeEventListener("open", onOpen);
        resolve();
      };
      this.socket?.addEventListener("open", onOpen);
    });

    this.socket.onmessage = (event) => {
      const parsedJson = JSON.parse(event.data) as unknown;

      const ack = wsAckSchema.safeParse(parsedJson);
      if (ack.success) {
        const pending = this.pending.get(ack.data.request_id);
        if (pending) {
          pending.resolve();
          this.pending.delete(ack.data.request_id);
        }
        return;
      }

      const nack = wsNackSchema.safeParse(parsedJson);
      if (nack.success) {
        const pending = this.pending.get(nack.data.request_id);
        if (pending) {
          pending.reject(new Error(nack.data.error.message));
          this.pending.delete(nack.data.request_id);
        }
        return;
      }

      const envelope = wsServerEnvelopeSchema.safeParse(parsedJson);
      if (!envelope.success) return;
      if (this.seenEvents.has(envelope.data.event_id)) return;

      const payloadSchema = wsEventPayloadSchemas[envelope.data.type as keyof typeof wsEventPayloadSchemas];
      if (payloadSchema) {
        const payloadParse = payloadSchema.safeParse(envelope.data.data);
        if (!payloadParse.success) return;
      }

      this.seenEvents.add(envelope.data.event_id);
      this.lastEventId = envelope.data.event_id;
      for (const handler of this.handlers) {
        handler(envelope.data);
      }
    };

    this.socket.onopen = () => {
      this.emitSyntheticEvent("connection.state", { state: "recovered" });
    };

    this.socket.onclose = () => {
      this.socket = null;
      this.openPromise = null;
      if (!this.shouldReconnect) return;
      this.emitSyntheticEvent("connection.state", { state: "reconnecting" });
      this.scheduleReconnect();
    };
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.openPromise = null;
    this.pending.clear();
    this.seenEvents.clear();
    this.lastEventId = null;

    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
  }

  reconnect(): void {
    this.disconnect();
    this.connect();
  }

  subscribe(handler: WsHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  async sendCommand<T>(cmd: string, data: T): Promise<void> {
    this.connect();
    if (this.openPromise) {
      await this.openPromise;
    }
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    const requestId = crypto.randomUUID();
    const commandSchema = wsCommandPayloadSchemas[cmd as keyof typeof wsCommandPayloadSchemas];
    if (commandSchema) {
      const parsed = commandSchema.safeParse(data);
      if (!parsed.success) {
        throw new Error(`Invalid WS payload for ${cmd}`);
      }
    }

    return new Promise<void>((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      this.socket?.send(
        JSON.stringify({
          cmd,
          version: 1,
          request_id: requestId,
          data
        })
      );
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.shouldReconnect) return;
      this.connect();
    }, 1500);
  }

  private buildConnectionUrl(): string {
    if (!this.lastEventId) return env.WS_URL;
    const separator = env.WS_URL.includes("?") ? "&" : "?";
    return `${env.WS_URL}${separator}last_event_id=${encodeURIComponent(this.lastEventId)}`;
  }

  private emitSyntheticEvent(type: string, data: unknown): void {
    const envelope: WsServerEnvelope = {
      type,
      version: 1,
      event_id: `synthetic:${type}:${Date.now()}`,
      ts: new Date().toISOString(),
      data
    };
    for (const handler of this.handlers) {
      handler(envelope);
    }
  }
}

export const wsManager = new WsManager();
