"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

interface FilkaBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone?: "brand" | "muted" | "warn" | "error" | "info";
  readonly value?: number;
  readonly max?: number;
  readonly dot?: boolean;
}

const toneMap: Record<NonNullable<FilkaBadgeProps["tone"]>, string> = {
  brand: "bg-[var(--mint-400)] text-[#062219]",
  muted: "bg-[var(--bg-3)] text-[var(--fg-1)]",
  warn: "bg-[rgba(245,182,66,0.2)] text-[var(--warn)]",
  error: "bg-[rgba(248,113,113,0.2)] text-[var(--err)]",
  info: "bg-[rgba(125,211,252,0.18)] text-[var(--info)]",
};

export const FilkaBadge = ({ tone = "brand", value, max = 99, dot = false, className, children, ...rest }: FilkaBadgeProps) => {
  if (dot) {
    return (
      <span
        className={cn("inline-block rounded-full", toneMap[tone].split(" ")[0], className)}
        style={{ width: 8, height: 8 }}
        aria-hidden="true"
      />
    );
  }
  const text = typeof value === "number" ? (value > max ? `${max}+` : String(value)) : children;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none",
        toneMap[tone],
        className,
      )}
      style={{ minWidth: 18, height: 18 }}
      {...rest}
    >
      {text}
    </span>
  );
};
