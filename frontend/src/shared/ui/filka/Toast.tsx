"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/shared/lib/cn";
import { IconCircleCheck, IconCircleX, IconAlert, IconInfo, IconClose } from "./icons";

type ToastTone = "success" | "error" | "warn" | "info";

interface ToastItem {
  readonly id: string;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly tone: ToastTone;
  readonly durationMs: number;
}

interface ToastApi {
  readonly show: (input: Omit<ToastItem, "id" | "durationMs"> & { durationMs?: number }) => string;
  readonly success: (title: ReactNode, description?: ReactNode) => string;
  readonly error: (title: ReactNode, description?: ReactNode) => string;
  readonly warn: (title: ReactNode, description?: ReactNode) => string;
  readonly info: (title: ReactNode, description?: ReactNode) => string;
  readonly dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const toneIconMap: Record<ToastTone, typeof IconCircleCheck> = {
  success: IconCircleCheck,
  error: IconCircleX,
  warn: IconAlert,
  info: IconInfo,
};

const toneColorMap: Record<ToastTone, string> = {
  success: "var(--ok)",
  error: "var(--err)",
  warn: "var(--warn)",
  info: "var(--info)",
};

let mountedOnce = false;

export const FilkaToastProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    mountedOnce = true;
    const ts = timeouts.current;
    return () => {
      ts.forEach((t) => clearTimeout(t));
      ts.clear();
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    const t = timeouts.current.get(id);
    if (t) {
      clearTimeout(t);
      timeouts.current.delete(id);
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const show = useCallback(
    (input: Omit<ToastItem, "id" | "durationMs"> & { durationMs?: number }) => {
      const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const item: ToastItem = { id, durationMs: input.durationMs ?? 4500, ...input };
      setItems((prev) => [...prev, item]);
      const handle = setTimeout(() => dismiss(id), item.durationMs);
      timeouts.current.set(id, handle);
      return id;
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (title, description) => show({ tone: "success", title, description }),
      error: (title, description) => show({ tone: "error", title, description }),
      warn: (title, description) => show({ tone: "warn", title, description }),
      info: (title, description) => show({ tone: "info", title, description }),
      dismiss,
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mountedOnce && typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:top-auto sm:right-6 sm:left-auto sm:items-end sm:px-0"
              role="region"
              aria-label="Уведомления"
            >
              {items.map((it) => {
                const Icon = toneIconMap[it.tone];
                return (
                  <div
                    key={it.id}
                    className={cn(
                      "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--r-lg)] border p-3 shadow-[var(--shadow-md)] backdrop-blur",
                    )}
                    style={{
                      background: "var(--bg-glass-2)",
                      borderColor: "var(--line-2)",
                      animation: "fade-in-up 240ms var(--ease-out) both",
                    }}
                  >
                    <span className="mt-0.5 shrink-0" style={{ color: toneColorMap[it.tone] }}>
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold leading-tight">{it.title}</div>
                      {it.description ? (
                        <div className="mt-1 text-[13px]" style={{ color: "var(--fg-2)" }}>
                          {it.description}
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => dismiss(it.id)}
                      className="shrink-0 rounded p-1 text-[var(--fg-2)] hover:text-[var(--fg-0)]"
                      aria-label="Закрыть"
                    >
                      <IconClose size={14} />
                    </button>
                  </div>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
};

export const useFilkaToast = (): ToastApi => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useFilkaToast must be used inside <FilkaToastProvider>");
  return ctx;
};
