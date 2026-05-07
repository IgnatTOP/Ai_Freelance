"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

type StatusTone = "neutral" | "brand" | "warn" | "error" | "info" | "success" | "muted";

const toneClass: Record<StatusTone, string> = {
  neutral: "filka-chip filka-chip-muted",
  brand: "filka-chip",
  warn: "filka-chip filka-chip-warn",
  error: "filka-chip filka-chip-err",
  info: "filka-chip",
  success: "filka-chip",
  muted: "filka-chip filka-chip-muted",
};

const toneStyle: Partial<Record<StatusTone, React.CSSProperties>> = {
  info: { background: "rgba(125,211,252,0.12)", borderColor: "rgba(125,211,252,0.22)", color: "var(--info)" },
  success: { background: "rgba(52,211,153,0.12)", borderColor: "rgba(52,211,153,0.22)", color: "var(--mint-300)" },
};

interface FilkaStatusBadgeProps {
  readonly tone?: StatusTone;
  readonly icon?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

export const FilkaStatusBadge = ({ tone = "neutral", icon, children, className }: FilkaStatusBadgeProps) => (
  <span className={cn(toneClass[tone], className)} style={toneStyle[tone]}>
    {icon}
    {children}
  </span>
);
