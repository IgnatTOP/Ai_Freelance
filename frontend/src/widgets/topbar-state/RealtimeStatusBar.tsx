"use client";

import { useRealtimeStore } from "@/shared/store/realtime.store";

export const RealtimeStatusBar = () => {
  const isReconnecting = useRealtimeStore((s) => s.isReconnecting);
  if (!isReconnecting) return null;

  return (
    <div className="fixed top-[84px] left-0 right-0 z-40 pointer-events-none">
      <div className="mx-auto w-[95%] max-w-6xl">
        <div className="h-1 overflow-hidden rounded-full bg-[#FF4D8D]/20">
          <div className="h-full w-full bg-[#FF4D8D] animate-pulse" />
        </div>
        <p className="mt-1 text-[11px] text-[#FF4D8D]">Переподключение...</p>
      </div>
    </div>
  );
};
