"use client";

import type { CSSProperties, HTMLAttributes } from "react";
import { useMemo } from "react";
import { cn } from "@/shared/lib/cn";
import { FilkaLiveDot } from "./visuals";

interface FilkaAvatarProps extends HTMLAttributes<HTMLDivElement> {
  readonly src?: string | null | undefined;
  readonly name?: string | null | undefined;
  readonly size?: number;
  readonly online?: boolean;
  readonly verified?: boolean;
  readonly rounded?: "sm" | "md" | "lg" | "full";
}

const getInitials = (name?: string | null) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
};

const radiusMap: Record<NonNullable<FilkaAvatarProps["rounded"]>, string> = {
  sm: "var(--r-sm)",
  md: "var(--r-md)",
  lg: "var(--r-lg)",
  full: "9999px",
};

export const FilkaAvatar = ({
  src,
  name,
  size = 36,
  online = false,
  verified = false,
  rounded = "md",
  className,
  style,
  ...rest
}: FilkaAvatarProps) => {
  const initials = useMemo(() => getInitials(name), [name]);
  const fontSize = Math.max(11, Math.round(size * 0.4));
  return (
    <div
      className={cn("relative inline-flex shrink-0 select-none items-center justify-center font-semibold", className)}
      style={{
        width: size,
        height: size,
        borderRadius: radiusMap[rounded],
        background: src ? "var(--bg-3)" : "linear-gradient(135deg,#B6D9FC,#1a0e4a)",
        color: "#05060f",
        fontSize,
        border: "1px solid rgba(186,215,247,0.18)",
        overflow: "hidden",
        ...style,
      }}
      {...rest}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? "Аватар"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span>{initials}</span>
      )}
      {online ? (
        <FilkaLiveDot
          size={Math.max(8, Math.round(size * 0.22))}
          style={{ position: "absolute", right: -2, bottom: -2, boxShadow: "0 0 0 2px var(--bg-1)" }}
        />
      ) : null}
      {verified ? (
        <span
          className="absolute -bottom-1 -right-1 grid place-items-center text-[10px] font-bold"
          style={{
            width: Math.max(14, Math.round(size * 0.32)),
            height: Math.max(14, Math.round(size * 0.32)),
            borderRadius: "9999px",
            background: "var(--mint-400)",
            color: "#05060f",
            border: "2px solid var(--bg-1)",
          }}
          aria-label="Подтверждён"
        >
          ✓
        </span>
      ) : null}
    </div>
  );
};

export const FilkaAvatarStack = ({
  items,
  max = 4,
  size = 28,
}: {
  readonly items: ReadonlyArray<{ src?: string | null; name?: string | null }>;
  readonly max?: number;
  readonly size?: number;
}) => {
  const visible = items.slice(0, max);
  const rest = items.length - visible.length;
  return (
    <div className="inline-flex" style={{ gap: -8 } as CSSProperties}>
      {visible.map((item, i) => (
        <FilkaAvatar
          key={i}
          {...(item.src ? { src: item.src } : {})}
          {...(item.name ? { name: item.name } : {})}
          size={size}
          rounded="full"
          style={{ marginLeft: i === 0 ? 0 : -8, border: "2px solid var(--bg-1)" }}
        />
      ))}
      {rest > 0 ? (
        <span
          className="grid place-items-center font-semibold"
          style={{
            width: size,
            height: size,
            marginLeft: -8,
            borderRadius: "9999px",
            background: "var(--bg-3)",
            color: "var(--fg-1)",
            border: "2px solid var(--bg-1)",
            fontSize: Math.max(10, size * 0.35),
          }}
        >
          +{rest}
        </span>
      ) : null}
    </div>
  );
};
