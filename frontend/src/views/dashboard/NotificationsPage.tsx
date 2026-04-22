"use client";

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Button, Chip } from "@heroui/react";
import { Bell, Check, CheckCheck, FileText, MessageSquare, Wallet, AlertCircle, Settings2 } from "lucide-react";
import NextLink from "next/link";
import { useNotificationsInfinite, useMarkNotificationRead, useMarkAllRead } from "@/features/notification-list";
import { PageHeader } from "@/shared/ui/page-header/PageHeader";
import { EmptyState } from "@/shared/ui/empty-state/EmptyState";

const TYPE_ICONS: Record<string, ReactNode> = {
  order: <FileText size={18} />,
  proposal: <MessageSquare size={18} />,
  message: <MessageSquare size={18} />,
  payment: <Wallet size={18} />,
  system: <AlertCircle size={18} />,
};

const TYPE_COLORS: Record<string, string> = {
  order: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  proposal: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  message: "bg-green-500/10 text-green-400 border-green-500/20",
  payment: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  system: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export const NotificationsPage = () => {
  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useNotificationsInfinite(20);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();

  const items = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  const unreadCount = data?.pages[0]?.unread_count ?? items.filter((n) => !n.read).length;
  const hasUnread = unreadCount > 0;
  const unreadById = useMemo(() => new Map(items.map((item) => [item.id, !item.read])), [items]);

  const loadMoreAnchorRef = useRef<HTMLDivElement | null>(null);
  const visibleUnreadIdsRef = useRef<Set<string>>(new Set());
  const readingNowRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const anchor = loadMoreAnchorRef.current;
    if (!anchor || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: "300px" }
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = entry.target as HTMLElement;
          const id = target.dataset.notificationId;
          const isRead = target.dataset.read === "true";
          if (!id || isRead) continue;
          if (entry.isIntersecting) visibleUnreadIdsRef.current.add(id);
          else visibleUnreadIdsRef.current.delete(id);
        }
      },
      { threshold: 0.65 }
    );

    const targets = document.querySelectorAll<HTMLElement>("[data-notification-id]");
    targets.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [items]);

  const markVisibleUnread = useCallback(() => {
    const ids = [...visibleUnreadIdsRef.current].filter((id) => unreadById.get(id));
    for (const id of ids) {
      if (readingNowRef.current.has(id)) continue;
      readingNowRef.current.add(id);
      markRead.mutate(id, {
        onSettled: () => {
          readingNowRef.current.delete(id);
          visibleUnreadIdsRef.current.delete(id);
        },
      });
    }
  }, [markRead, unreadById]);

  useEffect(() => {
    const onFocusOrVisible = () => {
      if (document.visibilityState === "visible") {
        markVisibleUnread();
      }
    };

    document.addEventListener("visibilitychange", onFocusOrVisible);
    window.addEventListener("focus", onFocusOrVisible);
    return () => {
      document.removeEventListener("visibilitychange", onFocusOrVisible);
      window.removeEventListener("focus", onFocusOrVisible);
    };
  }, [markVisibleUnread]);

  return (
    <div className="space-y-6 animate-fade-in-up max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <PageHeader
            title="Уведомления"
            description="Важная информация и обновления"
          />
          {unreadCount > 0 && (
            <Chip size="sm" color="secondary" variant="shadow" className="font-bold shrink-0">
              {unreadCount} новых
            </Chip>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            as={NextLink}
            href="/dashboard/settings"
            variant="flat"
            className="text-zinc-300"
            startContent={<Settings2 size={16} />}
          >
            Настройки уведомлений
          </Button>
          {items.length > 0 && (
            <Button
              variant="flat"
              color={hasUnread ? "secondary" : "default"}
              className={hasUnread ? "bg-purple-500/20 text-purple-300 font-medium shrink-0" : "text-zinc-500 font-medium shrink-0 opacity-50"}
              startContent={<CheckCheck size={16} />}
              onPress={() => hasUnread && markAllRead.mutate()}
              isLoading={markAllRead.isPending}
              isDisabled={!hasUnread}
            >
              Прочитать все
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 animate-pulse border border-white/[0.02]">
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-xl bg-zinc-800 shrink-0" />
                <div className="flex-1 py-1">
                  <div className="h-4 bg-zinc-800 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-zinc-800 rounded w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="pt-12">
          <EmptyState
            icon={<Bell size={32} />}
            title="Нет новых уведомлений"
            description="Здесь будут появляться отклики на заказы, новые сообщения и обновления статусов."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {groupByDate(items).map(([dateLabel, groupItems]) => (
            <div key={dateLabel}>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-1">{dateLabel}</p>
              <div className="space-y-3">
                {groupItems.map((n, i) => {
                  const styleColor = TYPE_COLORS[n.type] ?? TYPE_COLORS.system;
                  const icon = TYPE_ICONS[n.type] ?? TYPE_ICONS.system;

                  return (
                    <button
                      key={n.id}
                      type="button"
                      data-notification-id={n.id}
                      data-read={n.read ? "true" : "false"}
                      onClick={() => {
                        if (!n.read) markRead.mutate(n.id);
                        if (n.link) window.location.href = n.link;
                      }}
                      className={`w-full text-left glass-card rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:border-purple-500/30 hover:bg-zinc-900/80 animate-fade-in-up relative overflow-hidden ${
                        !n.read ? "border-l-2 border-l-purple-500 bg-purple-500/[0.02]" : "opacity-80 hover:opacity-100"
                      }`}
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      {!n.read && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-indigo-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                      )}

                      <div className="flex gap-4">
                        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${styleColor}`}>
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start sm:items-center justify-between gap-4 mb-1">
                            <div className="flex items-center gap-2">
                              <h4 className={`text-base font-semibold truncate ${!n.read ? "text-zinc-100" : "text-zinc-300"}`}>
                                {n.title}
                              </h4>
                              {!n.read && <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />}
                            </div>
                            <span className="text-xs text-zinc-500 shrink-0 whitespace-nowrap">
                              {parseSafeDate(n.created_at).toLocaleDateString("ru-RU", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className={`text-sm line-clamp-2 ${!n.read ? "text-zinc-300" : "text-zinc-500"}`}>
                            {n.message}
                          </p>
                        </div>
                        <div className="hidden sm:flex items-center shrink-0 pl-2">
                          {n.read ? (
                            <CheckCheck size={18} className="text-zinc-600" />
                          ) : (
                            <div className="w-8 h-8 rounded-full hover:bg-white/[0.04] flex items-center justify-center transition-colors">
                              <Check size={18} className="text-purple-400" />
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div ref={loadMoreAnchorRef} className="h-8 flex items-center justify-center text-xs text-zinc-500">
            {isFetchingNextPage ? "Загружаем уведомления..." : hasNextPage ? "Прокрутите ниже для загрузки" : "Все уведомления загружены"}
          </div>
        </div>
      )}
    </div>
  );
};

function groupByDate(items: { id: string; type: string; title: string; message: string; read: boolean; created_at: string; link?: string }[]): [string, typeof items][] {
  const groups: Record<string, typeof items> = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const item of items) {
    const d = parseSafeDate(item.created_at);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = "Сегодня";
    else if (d.toDateString() === yesterday.toDateString()) label = "Вчера";
    else label = d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

    if (!groups[label]) groups[label] = [];
    groups[label]!.push(item);
  }

  return Object.entries(groups);
}

function parseSafeDate(dateStr: string | undefined | null): Date {
  if (!dateStr) return new Date();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}
