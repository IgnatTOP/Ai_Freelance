"use client";

import { forwardRef } from "react";
import { cn } from "@/shared/lib/cn";
import { formatRuPhoneMask, normalizePhone } from "@/shared/lib/phone";
import { IconPhone } from "./icons";

interface FilkaPhoneInputProps {
  readonly value: string;
  readonly onChange: (digitsOnly: string, formatted: string) => void;
  readonly placeholder?: string;
  readonly id?: string;
  readonly hasError?: boolean;
  readonly disabled?: boolean;
  readonly autoFocus?: boolean;
  readonly className?: string;
}

export const FilkaPhoneInput = forwardRef<HTMLInputElement, FilkaPhoneInputProps>(
  ({ value, onChange, placeholder = "900 123-45-67", id, hasError, disabled, autoFocus, className }, ref) => {
    const formatted = value ? formatRuPhoneMask(value) : "";
    return (
      <div
        className={cn(
          "flex h-12 w-full items-center gap-2 rounded-[var(--r-md)] border px-3",
          hasError && "border-[var(--err)]",
          className,
        )}
        style={{
          background: "var(--bg-1)",
          borderColor: hasError ? "var(--err)" : "var(--line-2)",
        }}
      >
        <IconPhone size={16} className="text-[var(--fg-2)]" />
        <span className="t-mono select-none text-sm" style={{ color: "var(--fg-2)" }}>
          +7
        </span>
        <input
          ref={ref}
          id={id}
          inputMode="numeric"
          autoComplete="tel"
          autoFocus={autoFocus}
          disabled={disabled}
          value={formatted ? formatted.replace(/^\+7\s?/, "") : ""}
          onChange={(e) => {
            const digits = normalizePhone(e.target.value);
            const trimmed = digits.startsWith("7") || digits.startsWith("8") ? digits.slice(1) : digits;
            const next = trimmed.slice(0, 10);
            onChange(next, formatRuPhoneMask(`7${next}`));
          }}
          placeholder={placeholder}
          className="h-full flex-1 bg-transparent text-sm tracking-wide outline-none placeholder:text-[var(--fg-3)] disabled:opacity-50"
        />
      </div>
    );
  },
);

FilkaPhoneInput.displayName = "FilkaPhoneInput";
