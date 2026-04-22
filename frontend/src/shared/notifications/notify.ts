import type { RealtimeToastType } from "@/shared/store/realtime.store";
import { useRealtimeStore } from "@/shared/store/realtime.store";
import type { WsServerEnvelope } from "@/shared/ws/protocol";
import { mapEventToUiNotification } from "@/shared/notifications/catalog";

type NotifyInput = {
  title: string;
  message?: string;
  type?: RealtimeToastType;
};

const toToastType = (kind: ReturnType<typeof mapEventToUiNotification>["kind"]): RealtimeToastType => {
  switch (kind) {
    case "message":
      return "message";
    case "proposal":
      return "proposal";
    case "order":
      return "order";
    case "payment":
      return "balance";
    case "review":
      return "review";
    case "ai":
      return "ai";
    default:
      return "system";
  }
};

const push = (input: NotifyInput, eventId?: string): void => {
  const id = eventId ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  useRealtimeStore.getState().addToast({
    id,
    ...(eventId ? { eventId } : {}),
    type: input.type ?? "system",
    title: input.title,
    message: input.message ?? "Проверьте центр уведомлений",
  });
};

export const notify = {
  success(input: NotifyInput): void {
    push({ ...input, type: input.type ?? "system" });
  },
  error(input: NotifyInput): void {
    push({ ...input, type: "system" });
  },
  info(input: NotifyInput): void {
    push({ ...input, type: input.type ?? "system" });
  },
  realtime(event: WsServerEnvelope): void {
    const mapped = mapEventToUiNotification({
      eventName: event.type,
      payload: event.data,
    });

    push(
      {
        type: toToastType(mapped.kind),
        title: mapped.title,
        message: mapped.message,
      },
      event.event_id,
    );
  },
};
