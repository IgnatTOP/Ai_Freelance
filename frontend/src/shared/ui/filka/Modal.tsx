"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/shared/lib/cn";
import { IconClose } from "./icons";

interface FilkaModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly size?: "sm" | "md" | "lg" | "xl";
  readonly closeOnBackdrop?: boolean;
  readonly closeOnEsc?: boolean;
  readonly hideCloseButton?: boolean;
  readonly className?: string;
}

const sizeMap: Record<NonNullable<FilkaModalProps["size"]>, number> = {
  sm: 420,
  md: 560,
  lg: 720,
  xl: 960,
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const pickInitialModalFocus = (root: HTMLElement): HTMLElement | null => {
  const marked = root.querySelector<HTMLElement>("[data-filka-autofocus]");
  if (marked && !marked.matches(":disabled")) return marked;
  const autofocusEl = root.querySelector<HTMLElement>("[autofocus]");
  if (autofocusEl && !autofocusEl.matches(":disabled")) return autofocusEl;
  const primaryField = root.querySelector<HTMLElement>(
    "textarea:not([disabled]), input:not([disabled]), select:not([disabled])",
  );
  if (primaryField) return primaryField;
  return root.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
};

export const FilkaModal = ({
  open,
  onClose,
  children,
  size = "md",
  closeOnBackdrop = true,
  closeOnEsc = true,
  hideCloseButton = false,
  className,
}: FilkaModalProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocused.current = (document.activeElement as HTMLElement) ?? null;
    const handleKey = (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab" && containerRef.current) {
        const focusables = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const t = setTimeout(() => {
      const root = containerRef.current;
      if (!root) return;
      pickInitialModalFocus(root)?.focus();
    }, 50);

    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
      lastFocused.current?.focus?.();
    };
  }, [open, onClose, closeOnEsc]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{
        background: "rgba(5,6,15,0.7)",
        backdropFilter: "blur(8px)",
        animation: "fade-in 200ms var(--ease-out) both",
      }}
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative max-h-[90vh] w-full overflow-hidden rounded-[var(--r-xl)] border shadow-[var(--shadow-lg)]",
          className,
        )}
        style={{
          maxWidth: sizeMap[size],
          background: "var(--bg-2)",
          borderColor: "var(--line-2)",
          animation: "modal-pop 240ms var(--ease-out) both",
        }}
      >
        {children}
        {!hideCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-md text-[var(--fg-2)] transition-colors hover:bg-[var(--bg-3)] hover:text-[var(--fg-0)]"
          >
            <IconClose size={16} />
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  );
};

export const FilkaModalHeader = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div
    className={cn("flex flex-col gap-1 border-b px-6 pb-4 pt-6", className)}
    style={{ borderColor: "var(--line)" }}
  >
    {children}
  </div>
);

export const FilkaModalTitle = ({ children, className }: { children: ReactNode; className?: string }) => (
  <h2 className={cn("t-h3 font-semibold", className)}>{children}</h2>
);

export const FilkaModalDescription = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={cn("t-body-sm", className)} style={{ color: "var(--fg-2)" }}>
    {children}
  </p>
);

export const FilkaModalBody = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("max-h-[60vh] overflow-y-auto px-6 py-5 f-scroll", className)}>{children}</div>
);

export const FilkaModalFooter = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div
    className={cn("flex items-center justify-end gap-2 border-t px-6 py-4", className)}
    style={{ borderColor: "var(--line)" }}
  >
    {children}
  </div>
);
