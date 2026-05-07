"use client";

import type { ReactElement, ReactNode } from "react";
import { useState } from "react";
import { FilkaPopover } from "./Popover";
import { cn } from "@/shared/lib/cn";

interface MenuItemProps {
  readonly icon?: ReactNode;
  readonly label: ReactNode;
  readonly description?: ReactNode;
  readonly onSelect?: () => void;
  readonly disabled?: boolean;
  readonly tone?: "default" | "danger";
  readonly endContent?: ReactNode;
}

export const FilkaMenuItem = ({ icon, label, description, onSelect, disabled, tone = "default", endContent }: MenuItemProps) => (
  <button
    type="button"
    role="menuitem"
    onClick={onSelect}
    disabled={disabled}
    className={cn(
      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
      "hover:bg-[var(--bg-3)] focus:bg-[var(--bg-3)] focus:outline-none",
      tone === "danger" ? "text-[#fca5a5]" : "text-[var(--fg-0)]",
      disabled && "cursor-not-allowed opacity-50",
    )}
  >
    {icon ? <span className="shrink-0 text-[var(--fg-2)]">{icon}</span> : null}
    <span className="flex flex-1 flex-col">
      <span>{label}</span>
      {description ? (
        <span className="text-xs" style={{ color: "var(--fg-2)" }}>
          {description}
        </span>
      ) : null}
    </span>
    {endContent ? <span className="ml-auto shrink-0 text-[var(--fg-2)]">{endContent}</span> : null}
  </button>
);

export const FilkaMenuSeparator = () => <div className="my-1 h-px" style={{ background: "var(--line)" }} />;

export const FilkaMenuLabel = ({ children }: { children: ReactNode }) => (
  <div className="t-eyebrow px-3 pb-1 pt-2">{children}</div>
);

interface MenuTriggerProps {
  ref?: unknown;
  onClick?: (event: React.MouseEvent) => void;
  "aria-expanded"?: boolean;
}

interface MenuProps {
  readonly trigger: ReactElement<MenuTriggerProps>;
  readonly children: ReactNode;
  readonly align?: "start" | "end";
  readonly width?: number;
}

export const FilkaMenu = ({ trigger, children, align = "start", width = 220 }: MenuProps) => {
  const [open, setOpen] = useState(false);
  return (
    <FilkaPopover
      trigger={trigger}
      open={open}
      onOpenChange={setOpen}
      placement={align === "end" ? "bottom-end" : "bottom-start"}
    >
      <div
        role="menu"
        className="py-1.5"
        style={{ minWidth: width }}
        onClick={() => setOpen(false)}
      >
        {children}
      </div>
    </FilkaPopover>
  );
};
