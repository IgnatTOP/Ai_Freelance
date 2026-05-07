"use client";

import { useEffect, useMemo, useState } from "react";
import { useGlobalSearch } from "@/features/global-search";
import { debounce } from "@/shared/lib/debounce";
import {
  FilkaModal,
  FilkaModalBody,
  IconSearch,
} from "@/shared/ui/filka";

const SCOPE_LABEL = {
  orders: "Заказы",
  users: "Исполнители",
  chats: "Чаты",
} as const;

type CommandPaletteProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const HISTORY_KEY = "vb_cmdk_history";
const HISTORY_LIMIT = 8;

export const CommandPalette = ({ isOpen, onOpenChange }: CommandPaletteProps) => {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  const debouncedSetQuery = useMemo(
    () =>
      debounce((value: string) => {
        setQuery(value);
      }, 300),
    [],
  );

  useEffect(() => () => debouncedSetQuery.cancel(), [debouncedSetQuery]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) {
        setHistory(parsed.filter((item) => typeof item === "string").slice(0, HISTORY_LIMIT));
      }
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setInput("");
      setQuery("");
    }
  }, [isOpen]);

  const { data, isLoading } = useGlobalSearch(query);
  const grouped = useMemo(() => {
    const items = data ?? [];
    return {
      orders: items.filter((item) => item.scope === "orders"),
      users: items.filter((item) => item.scope === "users"),
      chats: items.filter((item) => item.scope === "chats"),
    };
  }, [data]);

  const rememberQuery = (value: string) => {
    const normalized = value.trim();
    if (normalized.length < 2 || typeof window === "undefined") return;
    setHistory((prev) => {
      const next = [normalized, ...prev.filter((item) => item !== normalized)].slice(0, HISTORY_LIMIT);
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <FilkaModal open={isOpen} onClose={() => onOpenChange(false)} size="lg" hideCloseButton>
      <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: "var(--line)" }}>
        <IconSearch size={16} className="text-[var(--fg-2)]" />
        <input
          autoFocus
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            debouncedSetQuery(e.target.value);
          }}
          placeholder="Поиск по заказам, исполнителям и чатам…"
          className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--fg-3)]"
        />
        <span className="t-mono shrink-0 rounded border px-1.5 py-0.5 text-[10px]" style={{ borderColor: "var(--line-2)", color: "var(--fg-3)" }}>
          ESC
        </span>
      </div>
      <FilkaModalBody className="max-h-[60vh] overflow-y-auto p-3 f-scroll">
        {isLoading ? (
          <p className="text-sm" style={{ color: "var(--fg-2)" }}>
            Ищем…
          </p>
        ) : query.trim().length < 2 ? (
          history.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--fg-3)" }}>
              Введите минимум 2 символа
            </p>
          ) : (
            <div>
              <p className="t-eyebrow px-2 py-1">Недавние запросы</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {history.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="filka-chip filka-chip-muted cursor-pointer"
                    onClick={() => {
                      setInput(item);
                      setQuery(item);
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )
        ) : (data?.length ?? 0) === 0 ? (
          <p className="text-sm" style={{ color: "var(--fg-3)" }}>
            Ничего не найдено
          </p>
        ) : (
          (Object.keys(grouped) as Array<keyof typeof grouped>).map((scope) =>
            grouped[scope].length > 0 ? (
              <div key={scope} className="mb-4">
                <p className="t-eyebrow px-2 py-1">{SCOPE_LABEL[scope]}</p>
                <div className="space-y-1">
                  {grouped[scope].map((item) => (
                    <a
                      key={`${scope}:${item.id}`}
                      href={item.href}
                      className="block rounded-[var(--r-md)] border border-transparent px-3 py-2 transition-colors hover:bg-[var(--bg-3)]"
                      onClick={() => {
                        rememberQuery(query);
                        onOpenChange(false);
                      }}
                    >
                      <p className="text-sm font-medium">{item.title}</p>
                      {item.subtitle ? (
                        <p className="text-xs" style={{ color: "var(--fg-2)" }}>
                          {item.subtitle}
                        </p>
                      ) : null}
                    </a>
                  ))}
                </div>
              </div>
            ) : null,
          )
        )}
      </FilkaModalBody>
    </FilkaModal>
  );
};
