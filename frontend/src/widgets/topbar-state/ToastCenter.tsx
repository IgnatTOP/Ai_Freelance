"use client";

import { useEffect, useRef } from "react";
import type { RealtimeToastType } from "@/shared/store/realtime.store";
import { useRealtimeStore } from "@/shared/store/realtime.store";
import { useFilkaToast } from "@/shared/ui/filka";

const TOAST_TONE_MAP: Record<RealtimeToastType, "info" | "success" | "warn" | "error"> = {
  message: "success",
  proposal: "info",
  order: "success",
  balance: "warn",
  review: "info",
  ai: "info",
  system: "warn",
};

export const ToastCenter = () => {
  const toasts = useRealtimeStore((s) => s.toasts);
  const removeToast = useRealtimeStore((s) => s.removeToast);
  const filkaToast = useFilkaToast();
  const handled = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const toast of toasts) {
      if (handled.current.has(toast.id)) continue;
      handled.current.add(toast.id);
      filkaToast.show({
        tone: TOAST_TONE_MAP[toast.type],
        title: toast.title,
        description: toast.message,
      });
      removeToast(toast.id);
    }
  }, [toasts, filkaToast, removeToast]);

  return null;
};
