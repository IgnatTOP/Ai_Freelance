"use client";

import type { KeyboardEvent } from "react";
import { useState } from "react";
import { cn } from "@/shared/lib/cn";
import { IconClose, IconPlus } from "./icons";

interface FilkaTagInputProps {
  readonly value: ReadonlyArray<string>;
  readonly onChange: (value: string[]) => void;
  readonly placeholder?: string;
  readonly maxTags?: number;
  readonly suggestions?: ReadonlyArray<string>;
  readonly hasError?: boolean;
  readonly disabled?: boolean;
  readonly className?: string;
}

export const FilkaTagInput = ({
  value,
  onChange,
  placeholder = "Введите и нажмите Enter",
  maxTags,
  suggestions,
  hasError,
  disabled,
  className,
}: FilkaTagInputProps) => {
  const [draft, setDraft] = useState("");
  const canAddMore = !maxTags || value.length < maxTags;

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    if (value.includes(tag)) return;
    if (!canAddMore) return;
    onChange([...value, tag]);
    setDraft("");
  };

  const removeTag = (idx: number) => {
    const next = value.filter((_, i) => i !== idx);
    onChange(next);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const filteredSuggestions = (suggestions ?? []).filter(
    (s) => !value.includes(s) && s.toLowerCase().includes(draft.toLowerCase()),
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-[var(--r-md)] border p-2 transition-all",
          hasError && "border-[var(--err)]",
        )}
        style={{
          background: "var(--bg-1)",
          borderColor: hasError ? "var(--err)" : "var(--line-2)",
          minHeight: 40,
        }}
      >
        {value.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs"
            style={{
              background: "rgba(102,58,243,0.1)",
              borderColor: "rgba(102,58,243,0.22)",
              color: "var(--mint-300)",
            }}
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(i)}
                className="grid h-4 w-4 place-items-center rounded-full hover:bg-[rgba(102,58,243,0.18)]"
                aria-label={`Удалить ${tag}`}
              >
                <IconClose size={10} />
              </button>
            )}
          </span>
        ))}
        {!disabled && canAddMore && (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            placeholder={value.length ? "" : placeholder}
            className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--fg-3)]"
          />
        )}
      </div>
      {filteredSuggestions.length > 0 && draft ? (
        <div className="flex flex-wrap gap-1.5">
          {filteredSuggestions.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:border-[var(--line-hover)]"
              style={{ background: "var(--bg-3)", borderColor: "var(--line-2)", color: "var(--fg-1)" }}
            >
              <IconPlus size={10} />
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};
