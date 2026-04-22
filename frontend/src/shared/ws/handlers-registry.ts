import type { WsServerEnvelope } from "@/shared/ws/protocol";

export type RealtimeHandlerMap = {
  [eventType: string]: (event: WsServerEnvelope) => void;
};

export const createHandlersRegistry = (handlers: RealtimeHandlerMap) => {
  return (event: WsServerEnvelope): void => {
    const handler = handlers[event.type];
    if (handler) handler(event);
  };
};
