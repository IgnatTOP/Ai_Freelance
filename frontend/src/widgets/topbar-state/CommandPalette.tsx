"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal, ModalBody, ModalContent, Input, Kbd } from "@heroui/react";
import { Search } from "lucide-react";
import { useGlobalSearch } from "@/features/global-search";
import { debounce } from "@/shared/lib/debounce";

const SCOPE_LABEL = {
  orders: "Заказы",
  users: "Исполнители",
  chats: "Чаты"
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
    []
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

  const { data, isLoading } = useGlobalSearch(query);
  const grouped = useMemo(() => {
    const items = data ?? [];
    return {
      orders: items.filter((item) => item.scope === "orders"),
      users: items.filter((item) => item.scope === "users"),
      chats: items.filter((item) => item.scope === "chats")
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
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      hideCloseButton
      size="2xl"
      backdrop="blur"
      classNames={{ base: "bg-[#10102a] border border-white/10" }}
    >
      <ModalContent>
        <ModalBody className="p-0">
          <div className="border-b border-white/10 p-3">
            <Input
              autoFocus
              value={input}
              onValueChange={(value) => {
                setInput(value);
                debouncedSetQuery(value);
              }}
              placeholder="Поиск по заказам, исполнителям и чатам..."
              startContent={<Search size={16} className="text-zinc-500" />}
              endContent={<Kbd keys={["enter"]}>Open</Kbd>}
              classNames={{
                inputWrapper: "bg-zinc-900/60 border border-zinc-700/60",
                input: "text-zinc-200 placeholder:text-zinc-500"
              }}
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-3 scrollbar-styled">
            {isLoading ? (
              <p className="text-sm text-zinc-400">Ищем...</p>
            ) : query.trim().length < 2 ? (
              history.length === 0 ? (
                <p className="text-sm text-zinc-500">Введите минимум 2 символа</p>
              ) : (
                <div>
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Недавние запросы</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {history.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="rounded-full border border-zinc-700/70 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 hover:border-emerald-500/40 hover:bg-emerald-500/10"
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
              <p className="text-sm text-zinc-500">Ничего не найдено</p>
            ) : (
              (Object.keys(grouped) as Array<keyof typeof grouped>).map((scope) =>
                grouped[scope].length > 0 ? (
                  <div key={scope} className="mb-4">
                    <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      {SCOPE_LABEL[scope]}
                    </p>
                    <div className="space-y-1">
                      {grouped[scope].map((item) => (
                        <a
                          key={`${scope}:${item.id}`}
                          href={item.href}
                          className="block rounded-lg border border-transparent px-3 py-2 hover:border-emerald-500/40 hover:bg-emerald-500/10"
                          onClick={() => {
                            rememberQuery(query);
                            onOpenChange(false);
                          }}
                        >
                          <p className="text-sm font-medium text-zinc-200">{item.title}</p>
                          {item.subtitle ? <p className="text-xs text-zinc-500">{item.subtitle}</p> : null}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null
              )
            )}
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
