"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { autoUpdate, flip, offset, shift, size, useFloating } from "@floating-ui/react-dom";
import { cn } from "@/shared/lib/cn";
import { IconChevronDown, IconCheck, IconClose, IconSearch } from "./icons";

export interface FilkaSelectOption<T extends string | number> {
  readonly value: T;
  readonly label: ReactNode;
  readonly description?: ReactNode;
  readonly icon?: ReactNode;
  readonly disabled?: boolean;
}

interface BaseProps<T extends string | number> {
  readonly options: ReadonlyArray<FilkaSelectOption<T>>;
  readonly placeholder?: string;
  readonly searchPlaceholder?: string;
  readonly searchable?: boolean;
  readonly disabled?: boolean;
  readonly hasError?: boolean;
  readonly id?: string;
  readonly className?: string;
  readonly emptyText?: string;
}

interface SingleProps<T extends string | number> extends BaseProps<T> {
  readonly multiple?: false;
  readonly value: T | null;
  readonly onChange: (value: T | null) => void;
  readonly clearable?: boolean;
}

interface MultiProps<T extends string | number> extends BaseProps<T> {
  readonly multiple: true;
  readonly value: ReadonlyArray<T>;
  readonly onChange: (value: T[]) => void;
}

type FilkaSelectProps<T extends string | number> = SingleProps<T> | MultiProps<T>;

export const FilkaSelect = <T extends string | number>(props: FilkaSelectProps<T>) => {
  const {
    options,
    placeholder = "Выберите…",
    searchPlaceholder = "Поиск…",
    searchable = false,
    disabled,
    hasError,
    id,
    className,
    emptyText = "Ничего не найдено",
  } = props;
  const isMulti = props.multiple === true;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const generatedId = useId();
  const triggerId = id ?? `flk-select-${generatedId.replace(/[^a-z0-9]/gi, "")}`;

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) =>
      [o.label, o.description, o.value].some((field) => String(field ?? "").toLowerCase().includes(q)),
    );
  }, [options, query, searchable]);

  const { refs, floatingStyles } = useFloating({
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(6),
      flip(),
      shift({ padding: 8 }),
      size({
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, {
            minWidth: `${rects.reference.width}px`,
          });
        },
      }),
    ],
    open,
  });

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (refs.floating.current?.contains(t)) return;
      if (refs.reference.current && (refs.reference.current as HTMLElement).contains(t)) return;
      setOpen(false);
      setQuery("");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const opt = filtered[activeIndex];
        if (opt && !opt.disabled) handleSelect(opt.value);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filtered, activeIndex]);

  useEffect(() => {
    if (open && searchable) inputRef.current?.focus();
    if (open) setActiveIndex(0);
  }, [open, searchable]);

  const handleSelect = (val: T) => {
    if (isMulti) {
      const current = props.value;
      const next = current.includes(val) ? current.filter((v) => v !== val) : [...current, val];
      props.onChange(next as T[]);
    } else {
      props.onChange(val);
      setOpen(false);
      setQuery("");
    }
  };

  const display = useMemo<ReactNode>(() => {
    if (isMulti) {
      const arr = (props as MultiProps<T>).value;
      if (arr.length === 0) return null;
      if (arr.length <= 2) {
        const labels: ReactNode[] = [];
        arr.forEach((v, i) => {
          if (i > 0) labels.push(", ");
          labels.push(options.find((o) => o.value === v)?.label ?? String(v));
        });
        return labels;
      }
      return `Выбрано: ${arr.length}`;
    }
    const single = (props as SingleProps<T>).value;
    if (single === null || single === undefined) return null;
    return options.find((o) => o.value === single)?.label ?? String(single);
  }, [isMulti, options, props]);

  return (
    <>
      <button
        type="button"
        id={triggerId}
        ref={refs.setReference}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-[var(--r-md)] border px-3 text-left text-sm outline-none transition-all",
          "focus-visible:ring-2",
          hasError && "border-[var(--err)]",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
        style={{
          background: "var(--bg-1)",
          borderColor: hasError ? "var(--err)" : "var(--line-2)",
          color: display ? "var(--fg-0)" : "var(--fg-3)",
        }}
      >
        <span className="flex-1 truncate">{display ?? placeholder}</span>
        {!isMulti && (props as SingleProps<T>).clearable && props.value !== null ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              (props as SingleProps<T>).onChange(null);
            }}
            className="grid h-5 w-5 place-items-center rounded text-[var(--fg-2)] hover:text-[var(--fg-0)]"
          >
            <IconClose size={12} />
          </span>
        ) : null}
        <IconChevronDown size={14} className={cn("shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={refs.setFloating}
              style={{ ...floatingStyles, zIndex: 95 }}
              className="overflow-hidden rounded-[var(--r-lg)] border bg-[var(--bg-2)] shadow-[var(--shadow-lg)]"
            >
              {searchable ? (
                <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: "var(--line)" }}>
                  <IconSearch size={14} className="text-[var(--fg-2)]" />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--fg-3)]"
                  />
                </div>
              ) : null}
              <div ref={listRef} className="max-h-64 overflow-y-auto py-1 f-scroll" role="listbox">
                {filtered.length === 0 ? (
                  <div className="px-3 py-3 text-center text-sm" style={{ color: "var(--fg-2)" }}>
                    {emptyText}
                  </div>
                ) : (
                  filtered.map((opt, i) => {
                    const selected = isMulti
                      ? props.value.includes(opt.value)
                      : props.value === opt.value;
                    const active = i === activeIndex;
                    return (
                      <button
                        key={String(opt.value)}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        disabled={opt.disabled}
                        onClick={() => handleSelect(opt.value)}
                        onMouseEnter={() => setActiveIndex(i)}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                          opt.disabled && "cursor-not-allowed opacity-50",
                        )}
                        style={{
                          background: active ? "var(--bg-3)" : "transparent",
                          color: selected ? "var(--mint-300)" : "var(--fg-0)",
                        }}
                      >
                        {opt.icon ? <span className="shrink-0 text-[var(--fg-2)]">{opt.icon}</span> : null}
                        <span className="flex-1 truncate">
                          <span className="block truncate">{opt.label}</span>
                          {opt.description ? (
                            <span className="block truncate text-xs" style={{ color: "var(--fg-2)" }}>
                              {opt.description}
                            </span>
                          ) : null}
                        </span>
                        {selected ? <IconCheck size={14} className="shrink-0 text-[var(--mint-400)]" /> : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
};
