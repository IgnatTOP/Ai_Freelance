"use client";

import { useCallback, useRef, type KeyboardEvent, type ReactNode } from "react";
import { Logo } from "@/shared/ui/logo/Logo";
import { FloatingDecorations } from "./FloatingDecorations";

type Props = {
  stepper?: ReactNode;
  children: ReactNode;
};

export const OnboardingShell = ({ stepper, children }: Props) => {
  const contentRef = useRef<HTMLDivElement | null>(null);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter") return;
    if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
    if ((event.nativeEvent as globalThis.KeyboardEvent).isComposing) return;
    if (event.defaultPrevented) return;

    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === "TEXTAREA" || target.isContentEditable)) {
      return;
    }

    const root = contentRef.current;
    if (!root) return;

    const continueButtons = Array.from(root.querySelectorAll("button")).filter((button) => {
      if (button.disabled || button.getAttribute("aria-disabled") === "true") return false;
      const label = (button.textContent ?? "").trim().toLowerCase();
      return label === "далее";
    });

    const continueButton = continueButtons[0];
    if (!continueButton) return;

    event.preventDefault();
    continueButton.click();
  }, []);

  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--vb-bg)]">
      {/* Background */}
      <FloatingDecorations />
      <div className="gradient-bg-hero absolute inset-0 z-0" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-6">
        <Logo size="sm" />
      </header>

      {/* Stepper */}
      {stepper && (
        <div className="relative z-10 mt-6 px-4">{stepper}</div>
      )}

      {/* Content */}
      <div
        ref={contentRef}
        onKeyDown={handleKeyDown}
        className="relative z-10 flex flex-1 items-center justify-center px-4 py-8"
      >
        <div className="w-full max-w-xl">{children}</div>
      </div>
    </section>
  );
};
