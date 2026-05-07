"use client";

import type { ReactElement, ReactNode } from "react";
import { cloneElement, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  autoUpdate,
  flip,
  offset as floatingOffset,
  shift,
  useFloating,
  type Placement,
} from "@floating-ui/react-dom";
import { cn } from "@/shared/lib/cn";

interface TriggerProps {
  ref?: unknown;
  onClick?: (event: React.MouseEvent) => void;
  "aria-expanded"?: boolean;
}

interface FilkaPopoverProps {
  readonly trigger: ReactElement<TriggerProps>;
  readonly children: ReactNode;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly placement?: Placement;
  readonly offset?: number;
  readonly className?: string;
  readonly closeOnOutside?: boolean;
}

export const FilkaPopover = ({
  trigger,
  children,
  open: openProp,
  onOpenChange,
  placement = "bottom-start",
  offset: offsetVal = 8,
  className,
  closeOnOutside = true,
}: FilkaPopoverProps) => {
  const [openInternal, setOpenInternal] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openInternal;
  const setOpen = (value: boolean) => {
    if (!isControlled) setOpenInternal(value);
    onOpenChange?.(value);
  };

  const { refs, floatingStyles } = useFloating({
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [floatingOffset(offsetVal), flip(), shift({ padding: 8 })],
    open,
  });

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (!closeOnOutside) return;
      const target = e.target as Node;
      if (refs.floating.current?.contains(target)) return;
      if (refs.reference.current && (refs.reference.current as HTMLElement).contains(target)) return;
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", onEsc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, closeOnOutside]);

  const triggerProps = trigger.props;
  const triggerWithProps = cloneElement(trigger, {
    ref: refs.setReference as unknown,
    onClick: (e: React.MouseEvent) => {
      triggerProps.onClick?.(e);
      setOpen(!open);
    },
    "aria-expanded": open,
  } as TriggerProps);

  return (
    <>
      {triggerWithProps}
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={refs.setFloating}
              style={{ ...floatingStyles, zIndex: 95 }}
              className={cn(
                "rounded-[var(--r-lg)] border bg-[var(--bg-2)] shadow-[var(--shadow-lg)]",
                className,
              )}
              role="dialog"
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  );
};
