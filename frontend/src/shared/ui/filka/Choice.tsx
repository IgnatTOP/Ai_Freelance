"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { IconCheck } from "./icons";

interface FilkaCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  readonly label?: ReactNode;
  readonly description?: ReactNode;
  readonly size?: "sm" | "md";
}

export const FilkaCheckbox = ({
  label,
  description,
  size = "md",
  className,
  id,
  checked,
  ...rest
}: FilkaCheckboxProps) => {
  const dimension = size === "sm" ? 16 : 18;
  return (
    <label
      className={cn(
        "group inline-flex cursor-pointer items-start gap-2",
        rest.disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span className="relative inline-flex shrink-0" style={{ width: dimension, height: dimension }}>
        <input
          type="checkbox"
          id={id}
          checked={checked}
          className="absolute inset-0 cursor-pointer opacity-0"
          {...rest}
        />
        <span
          className="grid h-full w-full place-items-center rounded-[4px] border transition-all"
          style={{
            background: checked ? "var(--mint-400)" : "var(--bg-1)",
            borderColor: checked ? "var(--mint-400)" : "var(--line-2)",
            color: "#062219",
          }}
        >
          {checked ? <IconCheck size={Math.round(dimension * 0.7)} /> : null}
        </span>
      </span>
      {(label || description) && (
        <span className="flex flex-col leading-tight">
          {label ? <span className="text-sm">{label}</span> : null}
          {description ? (
            <span className="text-xs" style={{ color: "var(--fg-2)" }}>
              {description}
            </span>
          ) : null}
        </span>
      )}
    </label>
  );
};

interface FilkaRadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  readonly label?: ReactNode;
  readonly description?: ReactNode;
}

export const FilkaRadio = ({ label, description, className, id, checked, ...rest }: FilkaRadioProps) => (
  <label
    className={cn(
      "group inline-flex cursor-pointer items-start gap-2",
      rest.disabled && "cursor-not-allowed opacity-50",
      className,
    )}
  >
    <span className="relative inline-flex shrink-0" style={{ width: 18, height: 18 }}>
      <input type="radio" id={id} checked={checked} className="absolute inset-0 cursor-pointer opacity-0" {...rest} />
      <span
        className="grid h-full w-full place-items-center rounded-full border transition-all"
        style={{
          background: "var(--bg-1)",
          borderColor: checked ? "var(--mint-400)" : "var(--line-2)",
        }}
      >
        {checked ? (
          <span className="rounded-full" style={{ width: 9, height: 9, background: "var(--mint-400)" }} />
        ) : null}
      </span>
    </span>
    {(label || description) && (
      <span className="flex flex-col leading-tight">
        {label ? <span className="text-sm">{label}</span> : null}
        {description ? (
          <span className="text-xs" style={{ color: "var(--fg-2)" }}>
            {description}
          </span>
        ) : null}
      </span>
    )}
  </label>
);

interface FilkaSwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  readonly label?: ReactNode;
  readonly description?: ReactNode;
}

export const FilkaSwitch = ({ label, description, className, id, checked, ...rest }: FilkaSwitchProps) => (
  <label
    className={cn(
      "group flex cursor-pointer items-center justify-between gap-3",
      rest.disabled && "cursor-not-allowed opacity-50",
      className,
    )}
  >
    {(label || description) && (
      <span className="flex flex-col leading-tight">
        {label ? <span className="text-sm font-medium">{label}</span> : null}
        {description ? (
          <span className="text-xs" style={{ color: "var(--fg-2)" }}>
            {description}
          </span>
        ) : null}
      </span>
    )}
    <span className="relative inline-flex shrink-0" style={{ width: 36, height: 20 }}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        className="absolute inset-0 cursor-pointer opacity-0"
        {...rest}
      />
      <span
        className="block h-full w-full rounded-full border transition-colors"
        style={{
          background: checked ? "var(--mint-400)" : "var(--bg-3)",
          borderColor: checked ? "var(--mint-400)" : "var(--line-2)",
        }}
      />
      <span
        className="absolute top-1/2 block -translate-y-1/2 rounded-full bg-white transition-transform"
        style={{
          width: 14,
          height: 14,
          left: checked ? 18 : 2,
          boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
        }}
      />
    </span>
  </label>
);
