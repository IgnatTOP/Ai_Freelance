"use client";

import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/cn";

type ButtonVariant = "primary" | "ghost" | "soft" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface FilkaButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly loading?: boolean;
  readonly startContent?: ReactNode;
  readonly endContent?: ReactNode;
}

const buttonVariantClass: Record<ButtonVariant, string> = {
  primary: "filka-btn-primary",
  ghost: "filka-btn-ghost",
  soft: "filka-btn-soft",
  danger: "filka-btn-danger",
};

const buttonSizeClass: Record<ButtonSize, string> = {
  sm: "filka-btn-sm",
  md: "",
  lg: "filka-btn-lg",
};

export const FilkaButton = ({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  startContent,
  endContent,
  children,
  ...props
}: FilkaButtonProps) => (
  <button
    className={cn("filka-btn", buttonVariantClass[variant], buttonSizeClass[size], className)}
    disabled={disabled || loading}
    data-disabled={disabled || loading ? "true" : undefined}
    {...props}
  >
    {loading ? <Loader2 size={16} className="animate-spin" /> : startContent}
    <span>{children}</span>
    {!loading ? endContent : null}
  </button>
);

interface FilkaCardProps extends HTMLAttributes<HTMLDivElement> {
  readonly glow?: boolean;
  readonly glass?: boolean;
}

export const FilkaCard = ({ className, glow = false, glass = false, ...props }: FilkaCardProps) => (
  <div
    className={cn(glass ? "glass-card" : "f-surface", "card-hover-glow", glow && "shadow-[var(--shadow-glow-soft)]", className)}
    {...props}
  />
);

interface FilkaChipProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone?: "default" | "muted" | "warn" | "error";
}

const chipToneClass = {
  default: "filka-chip",
  muted: "filka-chip filka-chip-muted",
  warn: "filka-chip filka-chip-warn",
  error: "filka-chip filka-chip-err",
} as const;

export const FilkaChip = ({ className, tone = "default", ...props }: FilkaChipProps) => (
  <span className={cn(chipToneClass[tone], className)} {...props} />
);

interface FilkaFieldProps {
  readonly label?: ReactNode;
  readonly helpText?: ReactNode;
  readonly error?: ReactNode;
  readonly className?: string;
  readonly children: ReactNode;
}

export const FilkaField = ({ label, helpText, error, className, children }: FilkaFieldProps) => (
  <label className={cn("filka-field", className)}>
    {label ? <span className="filka-label">{label}</span> : null}
    {children}
    {error ? <span className="filka-error">{error}</span> : helpText ? <span className="filka-help">{helpText}</span> : null}
  </label>
);

interface FilkaInputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly hasError?: boolean;
}

export const FilkaInput = ({ className, hasError = false, ...props }: FilkaInputProps) => (
  <input className={cn("filka-input", hasError && "border-[var(--err)]", className)} {...props} />
);

interface FilkaTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  readonly hasError?: boolean;
}

export const FilkaTextarea = ({ className, hasError = false, ...props }: FilkaTextareaProps) => (
  <textarea className={cn("filka-textarea", hasError && "border-[var(--err)]", className)} {...props} />
);

interface FilkaSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  readonly hasError?: boolean;
}

export const FilkaSelect = ({ className, hasError = false, children, ...props }: FilkaSelectProps) => (
  <select className={cn("filka-select", hasError && "border-[var(--err)]", className)} {...props}>
    {children}
  </select>
);
