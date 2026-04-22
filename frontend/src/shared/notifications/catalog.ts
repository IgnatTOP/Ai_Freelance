const asObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
};

const pickString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
};

export type NotificationKind = "message" | "proposal" | "order" | "payment" | "review" | "ai" | "system";

type NotificationFallback = {
  kind: NotificationKind;
  title: string;
  message: string;
};

const EVENT_DEFAULTS: Record<string, NotificationFallback> = {
  "notification.created": {
    kind: "system",
    title: "Новое уведомление",
    message: "Проверьте центр уведомлений",
  },
  "proposal.created": {
    kind: "proposal",
    title: "Новый отклик",
    message: "Входящие отклики обновлены",
  },
  "proposal.updated": {
    kind: "proposal",
    title: "Отклик обновлен",
    message: "Статус отклика изменился",
  },
  "order.created": {
    kind: "order",
    title: "Новый заказ",
    message: "Лента заказов обновлена",
  },
  "order.updated": {
    kind: "order",
    title: "Заказ обновлен",
    message: "Изменения в карточке заказа",
  },
  "order.application_closed": {
    kind: "order",
    title: "Приём откликов завершён",
    message: "Публикация заказа обновлена",
  },
  "chat.message.created": {
    kind: "message",
    title: "Новое сообщение",
    message: "Откройте чаты, чтобы ответить",
  },
  "chat.message.updated": {
    kind: "message",
    title: "Сообщение обновлено",
    message: "Содержимое сообщения изменено",
  },
  "balance.updated": {
    kind: "payment",
    title: "Баланс обновлен",
    message: "Проверьте актуальное состояние баланса",
  },
  "transaction.created": {
    kind: "payment",
    title: "Новая транзакция",
    message: "История операций обновлена",
  },
  "proposal.ai_analysis_ready": {
    kind: "ai",
    title: "AI-анализ готов",
    message: "Анализ откликов завершён",
  },
  "session.revoked": {
    kind: "system",
    title: "Сессия завершена",
    message: "Выполнен выход из аккаунта",
  },
};

const KIND_DEFAULTS: Record<NotificationKind, Pick<NotificationFallback, "title" | "message">> = {
  message: {
    title: "Сообщение",
    message: "Откройте сообщения для деталей",
  },
  proposal: {
    title: "Обновление отклика",
    message: "Проверьте изменения по отклику",
  },
  order: {
    title: "Обновление заказа",
    message: "Проверьте изменения по заказу",
  },
  payment: {
    title: "Финансовое обновление",
    message: "Проверьте историю операций",
  },
  review: {
    title: "Обновление отзыва",
    message: "Появились изменения по отзывам",
  },
  ai: {
    title: "AI-обновление",
    message: "Новая AI-активность по вашему аккаунту",
  },
  system: {
    title: "Уведомление",
    message: "Проверьте центр уведомлений",
  },
};

const normalizeKind = (rawType: string, eventName: string): NotificationKind => {
  const source = `${rawType} ${eventName}`.toLowerCase();
  if (source.includes("proposal")) return "proposal";
  if (source.includes("order")) return "order";
  if (source.includes("chat.message") || source.includes("message")) return "message";
  if (source.includes("balance") || source.includes("transaction") || source.includes("payment")) return "payment";
  if (source.includes("review")) return "review";
  if (source.includes("ai")) return "ai";
  return "system";
};

export type UiNotification = {
  kind: NotificationKind;
  eventName: string;
  title: string;
  message: string;
  link?: string;
};

type MapInput = {
  eventName?: string;
  rawType?: string;
  title?: unknown;
  message?: unknown;
  link?: unknown;
  payload?: unknown;
};

export const mapEventToUiNotification = (input: MapInput): UiNotification => {
  const payload = asObject(input.payload);
  const nested = asObject(payload.data ?? payload.notification ?? payload.content ?? payload.meta);

  const eventName =
    pickString(
      input.eventName,
      payload.event,
      payload.event_type,
      payload.kind,
      nested.event,
      nested.event_type,
      nested.kind,
    ) ?? "";
  const rawType = pickString(input.rawType, payload.type, payload.category, nested.type, nested.category) ?? "";
  const kind = normalizeKind(rawType, eventName);
  const eventFallback = EVENT_DEFAULTS[eventName];
  const kindFallback = KIND_DEFAULTS[kind];

  const title =
    pickString(input.title, payload.title, payload.name, nested.title, nested.name) ??
    eventFallback?.title ??
    kindFallback.title;
  const message =
    pickString(
      input.message,
      payload.message,
      payload.description,
      payload.body,
      payload.text,
      nested.message,
      nested.description,
      nested.body,
      nested.text,
    ) ??
    eventFallback?.message ??
    kindFallback.message;
  const link = pickString(input.link, payload.link, payload.url, payload.path, nested.link, nested.url, nested.path);

  return {
    kind: eventFallback?.kind ?? kind,
    eventName,
    title,
    message,
    ...(link ? { link } : {}),
  };
};

export const isTechnicalNotificationEvent = (eventName: string): boolean =>
  eventName === "connection.state" || eventName === "notification.unread_count.updated";

