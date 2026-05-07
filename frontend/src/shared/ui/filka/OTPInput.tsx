"use client";

import type { ClipboardEvent, KeyboardEvent } from "react";
import { useEffect, useRef } from "react";
import { cn } from "@/shared/lib/cn";

interface FilkaOTPInputProps {
  readonly length?: number;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onComplete?: (value: string) => void;
  readonly autoFocus?: boolean;
  readonly hasError?: boolean;
  readonly disabled?: boolean;
  readonly className?: string;
}

export const FilkaOTPInput = ({
  length = 6,
  value,
  onChange,
  onComplete,
  autoFocus = true,
  hasError,
  disabled,
  className,
}: FilkaOTPInputProps) => {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus && !disabled) {
      inputs.current[0]?.focus();
    }
  }, [autoFocus, disabled]);

  const updateAt = (i: number, char: string) => {
    const arr = value.padEnd(length, " ").split("");
    arr[i] = char;
    const next = arr.join("").trim();
    onChange(next);
    if (next.replace(/\s/g, "").length === length) onComplete?.(next);
  };

  const handleKey = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[i]) {
      e.preventDefault();
      const prev = inputs.current[i - 1];
      prev?.focus();
      const arr = value.split("");
      arr[i - 1] = "";
      onChange(arr.join("").trim());
    }
    if (e.key === "ArrowLeft") inputs.current[i - 1]?.focus();
    if (e.key === "ArrowRight") inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    if (pasted.length === length) onComplete?.(pasted);
    inputs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      {Array.from({ length }).map((_, i) => {
        const ch = value[i] ?? "";
        const filled = Boolean(ch);
        return (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={ch}
            disabled={disabled}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "");
              if (!v) return;
              updateAt(i, v);
              inputs.current[i + 1]?.focus();
            }}
            onKeyDown={handleKey(i)}
            onPaste={handlePaste}
            className={cn(
              "h-13 w-12 rounded-[var(--r-md)] border bg-[var(--bg-1)] text-center text-[22px] font-semibold tabular-nums outline-none transition-all",
              "focus:border-[var(--mint-400)] focus:shadow-[0_0_0_3px_rgba(52,211,153,0.18)]",
              filled && "border-[var(--mint-400)]",
              hasError && "border-[var(--err)] focus:border-[var(--err)] focus:shadow-[0_0_0_3px_rgba(248,113,113,0.18)]",
              disabled && "cursor-not-allowed opacity-50",
            )}
            style={{ width: 48, height: 52, borderColor: hasError ? "var(--err)" : filled ? "var(--mint-400)" : "var(--line-2)" }}
            aria-label={`Цифра ${i + 1}`}
          />
        );
      })}
    </div>
  );
};
