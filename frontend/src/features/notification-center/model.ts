"use client";

import { useMemo } from "react";
import { useRealtimeStore } from "@/shared/store/realtime.store";
import { useNotificationsInfinite } from "@/features/notification-list";

export const useNotificationCenter = () => {
  const unreadRealtime = useRealtimeStore((s) => s.unreadNotifications);
  const { data } = useNotificationsInfinite(20);
  const unreadFromQuery = data?.pages[0]?.unread_count;
  const unreadCount = typeof unreadFromQuery === "number" ? unreadFromQuery : unreadRealtime;

  return useMemo(
    () => ({
      unreadCount,
      hasUnread: unreadCount > 0
    }),
    [unreadCount]
  );
};
