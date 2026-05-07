"use client";

import { useRealtimeStore } from "@/shared/store/realtime.store";

export const RealtimeStatusBar = () => {
  const isReconnecting = useRealtimeStore((s) => s.isReconnecting);
  if (!isReconnecting) return null;

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-[92px] z-40">
      <div className="mx-auto w-[95%] max-w-[1320px]">
        <div className="h-1 overflow-hidden rounded-full bg-[rgba(52,211,153,0.14)]">
          <div className="h-full w-full animate-pulse bg-[var(--mint-400)]" />
        </div>
        <p className="mt-1 text-[11px] text-[var(--mint-300)]">Переподключение...</p>
      </div>
    </div>
  );
};
