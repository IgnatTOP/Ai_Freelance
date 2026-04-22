"use client";

import { useEffect } from "react";
import { wsManager } from "@/shared/ws/manager";
import { createHandlersRegistry } from "@/shared/ws/handlers-registry";
import { queryClient } from "@/shared/store/query-client";
import { useRealtimeStore } from "@/shared/store/realtime.store";
import { authTokenStorage } from "@/shared/api/client";
import { useSessionStore } from "@/shared/store/session.store";
import { notify } from "@/shared/notifications/notify";
import { useSessionHydrated } from "@/shared/store/use-session-hydrated";

type InfiniteNotificationsCache = {
  pages: Array<{ unread_count?: number }>;
  pageParams: unknown[];
};

const updateUnreadCountInCache = (count: number): void => {
  queryClient.setQueriesData<InfiniteNotificationsCache>({ queryKey: ["notifications", "infinite"] }, (current) => {
    if (!current || !Array.isArray(current.pages) || current.pages.length === 0) return current;
    return {
      ...current,
      pages: current.pages.map((page, index) =>
        index === 0
          ? {
              ...page,
              unread_count: count,
            }
          : page,
      ),
    };
  });
};

export const useRealtimeSync = (): void => {
  const sessionHydrated = useSessionHydrated();
  const userId = useSessionStore((s) => s.userId);
  const setUnreadNotifications = useRealtimeStore((s) => s.setUnreadNotifications);
  const setOnlineCount = useRealtimeStore((s) => s.setOnlineCount);
  const setConnected = useRealtimeStore((s) => s.setConnected);
  const setReconnecting = useRealtimeStore((s) => s.setReconnecting);
  const bumpPulse = useRealtimeStore((s) => s.bumpPulse);
  const clearSession = useSessionStore((s) => s.clearSession);
  const token = sessionHydrated ? authTokenStorage.get() : null;

  useEffect(() => {
    if (!sessionHydrated) return;

    if (!token || !userId) {
      wsManager.disconnect();
      setConnected(false);
      setReconnecting(false);
      return;
    }

    wsManager.connect();

    return () => {
      wsManager.disconnect();
      setConnected(false);
      setReconnecting(false);
    };
  }, [sessionHydrated, setConnected, setReconnecting, token, userId]);

  useEffect(() => {
    const unsubscribe = wsManager.subscribe(
      createHandlersRegistry({
        "notification.unread_count.updated": (event) => {
          const payload = event.data as { unread_count?: number };
          if (typeof payload.unread_count === "number") {
            setUnreadNotifications(payload.unread_count);
            updateUnreadCountInCache(payload.unread_count);
            bumpPulse();
          }
          void queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
        "notification.created": (event) => {
          notify.realtime(event);
          void queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
        "notification.read": () => {
          void queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
        "presence.online_count.updated": (event) => {
          const payload = event.data as { online_count?: number };
          if (typeof payload.online_count === "number") {
            setOnlineCount(payload.online_count);
            bumpPulse();
          }
        },
        "connection.state": (event) => {
          const payload = event.data as { state?: "reconnecting" | "recovered" };
          if (payload.state === "reconnecting") {
            setReconnecting(true);
          }
          if (payload.state === "recovered") {
            setConnected(true);
            // Removed noisy connection restored toast
          }
        },
        "balance.updated": (event) => {
          void queryClient.invalidateQueries({ queryKey: ["balance"] });
          bumpPulse();
          notify.realtime(event);
        },
        "transaction.created": (event) => {
          void queryClient.invalidateQueries({ queryKey: ["transactions"] });
          void queryClient.invalidateQueries({ queryKey: ["balance"] });
          notify.realtime(event);
        },
        "chat.message.created": (event) => {
          void queryClient.invalidateQueries({ queryKey: ["conversations"] });
          void queryClient.invalidateQueries({ queryKey: ["messages"] });
          bumpPulse();
          notify.realtime(event);
        },
        "chat.message.updated": () => {
          void queryClient.invalidateQueries({ queryKey: ["messages"] });
        },
        "chat.message.deleted": () => {
          void queryClient.invalidateQueries({ queryKey: ["messages"] });
        },
        "chat.message.read": () => {
          void queryClient.invalidateQueries({ queryKey: ["messages"] });
        },
        "conversation.updated": () => {
          void queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
        "proposal.created": (event) => {
          void queryClient.invalidateQueries({ queryKey: ["proposals"] });
          void queryClient.invalidateQueries({ queryKey: ["orders"] });
          bumpPulse();
          notify.realtime(event);
        },
        "proposal.updated": () => {
          void queryClient.invalidateQueries({ queryKey: ["proposals"] });
          void queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
        "order.updated": () => {
          void queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
        "order.created": (event) => {
          void queryClient.invalidateQueries({ queryKey: ["orders"] });
          bumpPulse();
          notify.realtime(event);
        },
        "proposal.ai_analysis_ready": (event) => {
          void queryClient.invalidateQueries({ queryKey: ["proposals"] });
          void queryClient.invalidateQueries({ queryKey: ["orders"] });
          bumpPulse();
          notify.realtime(event);
        },
        "order.responses_count.updated": () => {
          void queryClient.invalidateQueries({ queryKey: ["orders"] });
          void queryClient.invalidateQueries({ queryKey: ["proposals"] });
        },
        "order.application_closed": () => {
          void queryClient.invalidateQueries({ queryKey: ["orders"] });
          void queryClient.invalidateQueries({ queryKey: ["proposals"] });
        },
        "counter.updated": () => {
          void queryClient.invalidateQueries({ queryKey: ["orders"] });
          void queryClient.invalidateQueries({ queryKey: ["notifications"] });
          bumpPulse();
        },
        "session.revoked": (event) => {
          wsManager.disconnect();
          authTokenStorage.clear();
          clearSession();
          notify.realtime(event);
          window.location.href = "/login";
        }
      })
    );

    return unsubscribe;
  }, [bumpPulse, clearSession, setConnected, setOnlineCount, setReconnecting, setUnreadNotifications]);
};
