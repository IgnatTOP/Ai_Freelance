"use client";

import type { ReactElement, ReactNode } from "react";
import { cloneElement, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { autoUpdate, flip, offset as floatingOffset, shift, useFloating, type Placement } from "@floating-ui/react-dom";
import { cn } from "@/shared/lib/cn";

interface TriggerProps {
  ref?: unknown;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  onFocus?: (e: React.FocusEvent) => void;
  onBlur?: (e: React.FocusEvent) => void;
}

interface FilkaTooltipProps {
  readonly trigger: ReactElement<TriggerProps>;
  readonly children: ReactNode;
  readonly placement?: Placement;
  readonly delay?: number;
  readonly className?: string;
}

export const FilkaTooltip = ({ trigger, children, placement = "top", delay = 250, className }: FilkaTooltipProps) => {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { refs, floatingStyles } = useFloating({
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [floatingOffset(6), flip(), shift({ padding: 6 })],
    open,
  });

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  };

  const originalProps = trigger.props;
  const triggerEl = cloneElement(trigger, {
    ref: refs.setReference as unknown,
    onMouseEnter: (e: React.MouseEvent) => {
      originalProps.onMouseEnter?.(e);
      show();
    },
    onMouseLeave: (e: React.MouseEvent) => {
      originalProps.onMouseLeave?.(e);
      hide();
    },
    onFocus: (e: React.FocusEvent) => {
      originalProps.onFocus?.(e);
      show();
    },
    onBlur: (e: React.FocusEvent) => {
      originalProps.onBlur?.(e);
      hide();
    },
  } as TriggerProps);

  return (
    <>
      {triggerEl}
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={refs.setFloating}
              role="tooltip"
              className={cn(
                "pointer-events-none rounded-[var(--r-sm)] border px-2 py-1 text-xs",
                className,
              )}
              style={{
                ...floatingStyles,
                background: "var(--bg-glass-2)",
                borderColor: "var(--line-2)",
                color: "var(--fg-0)",
                backdropFilter: "blur(12px)",
                zIndex: 95,
              }}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  );
};
