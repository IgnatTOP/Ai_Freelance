"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

interface FilkaProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  readonly value: number;
  readonly max?: number;
  readonly height?: number;
  readonly tone?: "brand" | "warn" | "error" | "muted";
  readonly showLabel?: boolean;
}

const toneMap = {
  brand: "var(--grad-brand)",
  warn: "linear-gradient(90deg, #F5B642, #f59e0b)",
  error: "linear-gradient(90deg, #F87171, #ef4444)",
  muted: "linear-gradient(90deg, var(--fg-3), var(--fg-2))",
};

export const FilkaProgressBar = ({
  value,
  max = 100,
  height = 4,
  tone = "brand",
  showLabel = false,
  className,
  ...rest
}: FilkaProgressBarProps) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn("relative w-full", className)} {...rest}>
      <div
        className="overflow-hidden"
        style={{
          height,
          borderRadius: 999,
          background: "rgba(186,215,247,0.08)",
        }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className="h-full transition-[width]"
          style={{
            width: `${pct}%`,
            background: toneMap[tone],
            transitionDuration: "var(--dur-base)",
            transitionTimingFunction: "var(--ease-out)",
          }}
        />
      </div>
      {showLabel ? (
        <div className="t-mono mt-1 text-right" style={{ color: "var(--fg-2)" }}>
          {Math.round(pct)}%
        </div>
      ) : null}
    </div>
  );
};
