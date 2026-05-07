"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

interface FilkaTabItem<T extends string> {
  readonly id: T;
  readonly label: ReactNode;
  readonly icon?: ReactNode;
  readonly badge?: ReactNode;
}

interface FilkaTabsProps<T extends string> {
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly items: ReadonlyArray<FilkaTabItem<T>>;
  readonly className?: string;
  readonly variant?: "underline" | "pills";
}

export const FilkaTabs = <T extends string>({
  value,
  onChange,
  items,
  className,
  variant = "underline",
}: FilkaTabsProps<T>) => {
  if (variant === "pills") {
    return (
      <div
        role="tablist"
        className={cn("inline-flex items-center gap-1 rounded-[var(--r-md)] border p-1", className)}
        style={{ background: "var(--bg-1)", borderColor: "var(--line-2)" }}
      >
        {items.map((item) => {
          const isActive = item.id === value;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(item.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-[var(--r-sm)] px-3 py-1.5 text-sm font-medium transition-colors",
                isActive ? "shadow-sm" : "hover:bg-[var(--bg-3)]",
              )}
              style={{
                background: isActive ? "var(--bg-3)" : "transparent",
                color: isActive ? "var(--fg-0)" : "var(--fg-2)",
              }}
            >
              {item.icon}
              {item.label}
              {item.badge}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div role="tablist" className={cn("flex items-center gap-1 border-b", className)} style={{ borderColor: "var(--line)" }}>
      {items.map((item) => {
        const isActive = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={cn(
              "relative inline-flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors",
              isActive ? "text-[var(--fg-0)]" : "text-[var(--fg-2)] hover:text-[var(--fg-0)]",
            )}
          >
            {item.icon}
            {item.label}
            {item.badge}
            {isActive ? (
              <span
                className="absolute inset-x-2 -bottom-px h-[2px] rounded-full"
                style={{ background: "var(--mint-400)" }}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
};

interface FilkaSegmentedProps<T extends string> {
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly items: ReadonlyArray<{ id: T; label: ReactNode }>;
  readonly fullWidth?: boolean;
  readonly className?: string;
}

export const FilkaSegmented = <T extends string>({
  value,
  onChange,
  items,
  fullWidth = false,
  className,
}: FilkaSegmentedProps<T>) => (
  <div
    role="tablist"
    className={cn("inline-flex items-center rounded-[var(--r-md)] border p-1", fullWidth && "w-full", className)}
    style={{ background: "var(--bg-1)", borderColor: "var(--line-2)" }}
  >
    {items.map((item) => {
      const isActive = item.id === value;
      return (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={isActive}
          onClick={() => onChange(item.id)}
          className={cn(
            "relative flex-1 rounded-[var(--r-sm)] px-4 py-2 text-sm font-medium transition-all",
            isActive ? "" : "hover:text-[var(--fg-0)]",
          )}
          style={{
            background: isActive ? "var(--bg-3)" : "transparent",
            color: isActive ? "var(--fg-0)" : "var(--fg-2)",
            boxShadow: isActive ? "inset 0 0 0 1px var(--line-hover)" : "none",
          }}
        >
          {item.label}
        </button>
      );
    })}
  </div>
);
