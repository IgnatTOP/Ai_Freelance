"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { Bell, Bot, MessageSquare, Wallet, Star, ClipboardList, TriangleAlert } from "lucide-react";
import type { RealtimeToastType } from "@/shared/store/realtime.store";
import { useRealtimeStore } from "@/shared/store/realtime.store";

const TOAST_STYLE: Record<RealtimeToastType, { border: string; icon: ReactNode }> = {
  message: { border: "border-violet-500/40", icon: <MessageSquare size={14} className="text-violet-300" /> },
  proposal: { border: "border-indigo-500/40", icon: <ClipboardList size={14} className="text-indigo-300" /> },
  order: { border: "border-blue-500/40", icon: <Bell size={14} className="text-blue-300" /> },
  balance: { border: "border-amber-500/40", icon: <Wallet size={14} className="text-amber-300" /> },
  review: { border: "border-yellow-500/40", icon: <Star size={14} className="text-yellow-300" /> },
  ai: { border: "border-teal-500/40", icon: <Bot size={14} className="text-teal-300" /> },
  system: { border: "border-zinc-500/40", icon: <TriangleAlert size={14} className="text-zinc-300" /> }
};

export const ToastCenter = () => {
  const toasts = useRealtimeStore((s) => s.toasts);
  const removeToast = useRealtimeStore((s) => s.removeToast);

  useEffect(() => {
    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        removeToast(toast.id);
      }, 4000)
    );

    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [removeToast, toasts]);

  return (
    <div className="fixed right-4 bottom-4 z-[70] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => {
        const style = TOAST_STYLE[toast.type];
        return (
          <div
            key={toast.id}
            className={`glass-card rounded-xl border ${style.border} px-3 py-2 animate-fade-in-up`}
            role="status"
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5">{style.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-zinc-100 truncate">{toast.title}</p>
                <p className="text-xs text-zinc-400 truncate">{toast.message}</p>
              </div>
              <button
                type="button"
                className="text-zinc-500 hover:text-zinc-300 text-xs"
                onClick={() => removeToast(toast.id)}
                aria-label="Закрыть уведомление"
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
