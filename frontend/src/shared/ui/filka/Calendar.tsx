"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react-dom";
import { cn } from "@/shared/lib/cn";
import { IconCalendar, IconChevronLeft, IconChevronRight } from "./icons";

const RU_MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const RU_DAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const stripTime = (d: Date) => {
  const cleared = new Date(d);
  cleared.setHours(0, 0, 0, 0);
  return cleared;
};

const buildMonthGrid = (anchor: Date): Date[] => {
  const start = startOfMonth(anchor);
  const startWeekday = (start.getDay() + 6) % 7;
  const gridStart = new Date(start);
  gridStart.setDate(gridStart.getDate() - startWeekday);
  return Array.from({ length: 42 }).map((_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
};

const formatRu = (d: Date) =>
  d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });

interface FilkaCalendarProps {
  readonly value?: Date | null | undefined;
  readonly onChange: (value: Date) => void;
  readonly minDate?: Date;
  readonly maxDate?: Date;
  readonly className?: string;
}

export const FilkaCalendar = ({ value, onChange, minDate, maxDate, className }: FilkaCalendarProps) => {
  const [anchor, setAnchor] = useState<Date>(() => value ?? new Date());
  const grid = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const today = stripTime(new Date());
  const month = anchor.getMonth();

  const prevMonth = () => {
    const d = new Date(anchor);
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    setAnchor(d);
  };
  const nextMonth = () => {
    const d = new Date(anchor);
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    setAnchor(d);
  };

  return (
    <div
      className={cn("rounded-[var(--r-lg)] border p-3", className)}
      style={{ background: "var(--bg-2)", borderColor: "var(--line-2)", minWidth: 280 }}
    >
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="grid h-8 w-8 place-items-center rounded-md text-[var(--fg-2)] hover:bg-[var(--bg-3)] hover:text-[var(--fg-0)]"
          aria-label="Предыдущий месяц"
        >
          <IconChevronLeft size={16} />
        </button>
        <div className="text-sm font-semibold">
          {RU_MONTHS[month]} {anchor.getFullYear()}
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className="grid h-8 w-8 place-items-center rounded-md text-[var(--fg-2)] hover:bg-[var(--bg-3)] hover:text-[var(--fg-0)]"
          aria-label="Следующий месяц"
        >
          <IconChevronRight size={16} />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1 px-1">
        {RU_DAYS_SHORT.map((d) => (
          <div
            key={d}
            className="text-center text-[11px] font-semibold uppercase"
            style={{ color: "var(--fg-3)", letterSpacing: "0.06em" }}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.map((d, i) => {
          const sameMonth = d.getMonth() === month;
          const isSelected = value && stripTime(value).getTime() === stripTime(d).getTime();
          const isToday = stripTime(d).getTime() === today.getTime();
          const beforeMin = minDate ? stripTime(d).getTime() < stripTime(minDate).getTime() : false;
          const afterMax = maxDate ? stripTime(d).getTime() > stripTime(maxDate).getTime() : false;
          const disabled = beforeMin || afterMax;
          return (
            <button
              key={i}
              type="button"
              onClick={() => !disabled && onChange(stripTime(d))}
              disabled={disabled}
              className={cn(
                "relative grid h-9 place-items-center rounded-md text-sm transition-all",
                disabled && "cursor-not-allowed opacity-30",
                !disabled && !isSelected && "hover:bg-[var(--bg-3)]",
              )}
              style={{
                color: isSelected ? "#062219" : sameMonth ? "var(--fg-0)" : "var(--fg-3)",
                background: isSelected ? "var(--mint-400)" : "transparent",
                fontWeight: isSelected ? 700 : isToday ? 600 : 400,
                outline: isToday && !isSelected ? "1px solid var(--mint-400)" : undefined,
              }}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface FilkaDatePickerProps {
  readonly value?: Date | null | undefined;
  readonly onChange: (value: Date) => void;
  readonly minDate?: Date;
  readonly maxDate?: Date;
  readonly className?: string;
  readonly placeholder?: string;
  readonly id?: string;
  readonly hasError?: boolean;
  readonly disabled?: boolean;
}

export const FilkaDatePicker = ({
  value,
  onChange,
  placeholder = "Выберите дату",
  id,
  hasError,
  disabled,
  ...rest
}: FilkaDatePickerProps) => {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles } = useFloating({
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    open,
  });
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t)) return;
      if (refs.reference.current && (refs.reference.current as HTMLElement).contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, refs]);

  return (
    <>
      <button
        type="button"
        id={id}
        ref={refs.setReference}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-[var(--r-md)] border px-3 text-left text-sm",
          disabled && "cursor-not-allowed opacity-50",
        )}
        style={{
          background: "var(--bg-1)",
          borderColor: hasError ? "var(--err)" : "var(--line-2)",
          color: value ? "var(--fg-0)" : "var(--fg-3)",
        }}
      >
        <IconCalendar size={14} className="text-[var(--fg-2)]" />
        <span className="flex-1">{value ? formatRu(value) : placeholder}</span>
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div ref={refs.setFloating} style={{ ...floatingStyles, zIndex: 95 }}>
              <div ref={popoverRef}>
                <FilkaCalendar
                  {...rest}
                  value={value ?? null}
                  onChange={(d) => {
                    onChange(d);
                    setOpen(false);
                  }}
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
};
