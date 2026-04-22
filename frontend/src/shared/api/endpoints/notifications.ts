import { apiClient } from "../client";
import { mapEventToUiNotification } from "@/shared/notifications/catalog";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  created_at: string;
}

export interface NotificationPage {
  items: Notification[];
  unread_count: number;
  offset: number;
  limit: number;
  has_more: boolean;
}

type NotificationsPayload =
  | BackendNotificationRaw[]
  | {
      notifications?: BackendNotificationRaw[];
      unread_count?: number;
    };

type BackendNotificationRaw = {
  id?: string;
  ID?: string;
  type?: string;
  title?: string;
  message?: string;
  link?: string;
  payload?: Record<string, unknown> | string;
  Payload?: Record<string, unknown> | string;
  read?: boolean;
  is_read?: boolean;
  IsRead?: boolean;
  created_at?: string;
  CreatedAt?: string;
};

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

const mapNotification = (item: BackendNotificationRaw): Notification => {
  const payload = asObject(item.payload ?? item.Payload);
  const mappedUi = mapEventToUiNotification({
    ...(item.type ? { rawType: item.type } : {}),
    ...(item.title ? { title: item.title } : {}),
    ...(item.message ? { message: item.message } : {}),
    ...(item.link ? { link: item.link } : {}),
    payload,
  });

  const mapped: Notification = {
    id: item.id ?? item.ID ?? crypto.randomUUID(),
    type: mappedUi.kind === "payment" ? "payment" : mappedUi.kind,
    title: mappedUi.title,
    message: mappedUi.message,
    read:
      item.read ??
      item.is_read ??
      item.IsRead ??
      false,
    created_at: item.created_at ?? item.CreatedAt ?? new Date().toISOString(),
  };
  if (mappedUi.link) mapped.link = mappedUi.link;
  return mapped;
};

export const notificationsApi = {
  async getPage(limit = 20, offset = 0): Promise<NotificationPage> {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    const payload = await apiClient.request<NotificationsPayload>(`/notifications?${params.toString()}`);
    let items: Notification[] = [];
    let unreadCount = 0;

    if (Array.isArray(payload)) {
      items = payload.map(mapNotification);
      unreadCount = items.filter((item) => !item.read).length;
    } else {
      items = (payload.notifications ?? []).map(mapNotification);
      unreadCount = typeof payload.unread_count === "number"
        ? payload.unread_count
        : items.filter((item) => !item.read).length;
    }

    return {
      items,
      unread_count: unreadCount,
      limit,
      offset,
      has_more: items.length === limit,
    };
  },

  async getAll(): Promise<Notification[]> {
    const firstPage = await notificationsApi.getPage(200, 0);
    return firstPage.items;
  },

  async markRead(id: string): Promise<void> {
    return apiClient.request<void>(`/notifications/${id}/read`, {
      method: "POST",
    });
  },

  async markAllRead(): Promise<void> {
    return apiClient.request<void>("/notifications/read-all", {
      method: "POST",
    });
  },
};
