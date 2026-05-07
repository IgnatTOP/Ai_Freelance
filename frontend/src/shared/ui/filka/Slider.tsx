"use client";

import type { InputHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

interface FilkaSliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  readonly value: number;
  readonly onValueChange: (value: number) => void;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly formatValue?: (value: number) => string;
}

export const FilkaSlider = ({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
  formatValue,
  id,
  ...rest
}: FilkaSliderProps) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <input
        type="range"
        id={id}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onValueChange(Number(e.target.value))}
        className="filka-slider"
        style={{
          background: `linear-gradient(90deg, var(--mint-400) 0%, var(--mint-400) ${pct}%, var(--bg-3) ${pct}%, var(--bg-3) 100%)`,
        }}
        {...rest}
      />
      {formatValue ? (
        <div className="t-mono text-right text-xs" style={{ color: "var(--fg-2)" }}>
          {formatValue(value)}
        </div>
      ) : null}
    </div>
  );
};
