"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useMarkAllRead, useMarkNotificationRead, useNotificationsInfinite } from "@/features/notification-list";
import {
    FilkaButton,
    FilkaCard,
    IconAlert as AlertCircle,
    IconBell as Bell,
    IconCheck as Check,
    IconCheck as CheckCheck,
    IconFile as FileText,
    IconChat as MessageSquare,
    IconSettings as Settings2,
    IconWallet as Wallet,
} from "@/shared/ui/filka";

type FilterKey = "all" | "unread" | "message" | "order" | "payment" | "system";

const TYPE_ICONS: Record<string, ReactNode> = {
    order: <FileText size={16} />,
    proposal: <MessageSquare size={16} />,
    message: <MessageSquare size={16} />,
    payment: <Wallet size={16} />,
    system: <AlertCircle size={16} />,
};

const TYPE_COLORS: Record<string, { backgroundColor: string; color: string }> = {
    order: { backgroundColor: "rgba(102,58,243,0.12)", color: "var(--mint-300)" },
    proposal: { backgroundColor: "rgba(125,211,252,0.12)", color: "var(--info)" },
    message: { backgroundColor: "rgba(186,215,247,0.12)", color: "var(--mint-200)" },
    payment: { backgroundColor: "rgba(245,226,122,0.12)", color: "var(--accent-sun)" },
    system: { backgroundColor: "rgba(255,179,138,0.12)", color: "var(--warn)" },
};

const formatTimestamp = (dateString: string): string => {
    const date = parseSafeDate(dateString);
    const now = Date.now();
    const diffHours = Math.floor((now - date.getTime()) / 3_600_000);
    if (diffHours < 1) return "сейчас";
    if (diffHours < 24) return `${diffHours} ч назад`;
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
};

const formatDateGroup = (dateString: string): string => {
    const date = parseSafeDate(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Сегодня";
    if (date.toDateString() === yesterday.toDateString()) return "Вчера";
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
};

const getSafeNotificationHref = (link?: string): string | null => {
    if (!link) return null;
    try {
        const url = new URL(link, window.location.origin);
        if (url.origin !== window.location.origin) return null;
        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return null;
    }
};

export const NotificationsPage = () => {
    const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useNotificationsInfinite(20);
    const markRead = useMarkNotificationRead();
    const markAllRead = useMarkAllRead();
    const [filter, setFilter] = useState<FilterKey>("all");

    const items = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
    const unreadCount = data?.pages[0]?.unread_count ?? items.filter((item) => !item.read).length;
    const filteredItems = useMemo(() => {
        switch (filter) {
            case "unread":
                return items.filter((item) => !item.read);
            case "message":
                return items.filter((item) => item.type === "message" || item.type === "proposal");
            case "order":
                return items.filter((item) => item.type === "order");
            case "payment":
                return items.filter((item) => item.type === "payment");
            case "system":
                return items.filter((item) => item.type === "system");
            default:
                return items;
        }
    }, [filter, items]);

    const filters = useMemo(
        () => [
            { key: "all" as const, title: "Все", count: items.length },
            { key: "unread" as const, title: "Непрочитанные", count: unreadCount },
            { key: "message" as const, title: "Сообщения", count: items.filter((item) => item.type === "message" || item.type === "proposal").length },
            { key: "order" as const, title: "Заказы", count: items.filter((item) => item.type === "order").length },
            { key: "payment" as const, title: "Платежи", count: items.filter((item) => item.type === "payment").length },
            { key: "system" as const, title: "Система", count: items.filter((item) => item.type === "system").length },
        ],
        [items, unreadCount],
    );

    const weekItems = useMemo(
        () => items.filter((item) => Date.now() - parseSafeDate(item.created_at).getTime() <= 7 * 86_400_000),
        [items],
    );
    const digestItem = filteredItems.find((item) => !item.read) ?? filteredItems[0];
    const digestHref = getSafeNotificationHref(digestItem?.link);
    const unreadById = useMemo(() => new Map(items.map((item) => [item.id, !item.read])), [items]);
    const groupedFilteredItems = useMemo(() => {
        const groups: Array<{ label: string; items: typeof filteredItems }> = [];
        for (const notification of filteredItems) {
            const label = formatDateGroup(notification.created_at);
            const last = groups[groups.length - 1];
            if (last?.label === label) {
                last.items.push(notification);
            } else {
                groups.push({ label, items: [notification] });
            }
        }
        return groups;
    }, [filteredItems]);

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
            { threshold: 0.1, rootMargin: "300px" },
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
            { threshold: 0.65 },
        );

        const targets = document.querySelectorAll<HTMLElement>("[data-notification-id]");
        targets.forEach((node) => observer.observe(node));
        return () => observer.disconnect();
    }, [filteredItems]);

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
            if (document.visibilityState === "visible") markVisibleUnread();
        };

        document.addEventListener("visibilitychange", onFocusOrVisible);
        window.addEventListener("focus", onFocusOrVisible);
        return () => {
            document.removeEventListener("visibilitychange", onFocusOrVisible);
            window.removeEventListener("focus", onFocusOrVisible);
        };
    }, [markVisibleUnread]);

    return (
        <div className="mx-auto grid max-w-[1320px] gap-6 xl:grid-cols-[240px_minmax(0,1fr)_320px]">
            <aside className="flex flex-col gap-1">
                <div className="px-4 pb-2 text-[10.5px] uppercase tracking-[0.08em] text-[var(--fg-3)]">ФИЛЬТРЫ</div>
                {filters.map((item) => {
                    const isActive = filter === item.key;
                    return (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => setFilter(item.key)}
                            className={`flex items-center gap-3 rounded-[10px] border px-4 py-2.5 text-left text-[13.5px] transition-colors ${isActive
                                ? "border-[var(--line)] bg-[var(--bg-2)] font-semibold text-[var(--fg-0)]"
                                : "border-transparent text-[var(--fg-2)] hover:bg-[var(--bg-2)]/60 hover:text-[var(--fg-1)]"
                                }`}
                        >
                            <span className="flex-1">{item.title}</span>
                            <span className="t-mono text-[10.5px] text-[var(--fg-3)]">{item.count}</span>
                        </button>
                    );
                })}
                <div className="pt-3">
                    <FilkaButton
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        loading={markAllRead.isPending}
                        onClick={() => unreadCount > 0 && markAllRead.mutate()}
                    >
                        Отметить всё прочитанным
                    </FilkaButton>
                </div>
            </aside>

            <div>
                <div className="mb-4">
                    <div className="t-eyebrow mb-2">АКТИВНОСТЬ · 30 ДНЕЙ</div>
                    <h1 className="text-[30px] font-bold tracking-[-0.03em] text-[var(--fg-0)]">Уведомления</h1>
                    <p className="mt-2 text-[14px] leading-[1.55] text-[var(--fg-2)]">
                        Непрочитанных: <span className="font-semibold text-[var(--mint-300)]">{unreadCount}</span> · всё, что происходит с заказами, сообщениями и платежами.
                    </p>
                </div>

                <FilkaCard className="overflow-hidden rounded-[14px] bg-[var(--bg-1)]">
                    {isLoading ? (
                        <div className="space-y-3 p-5">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <div key={index} className="rounded-[12px] border border-[var(--line)] bg-[var(--bg-2)] p-4">
                                    <div className="mb-2 h-4 w-1/2 animate-pulse rounded bg-[var(--bg-3)]" />
                                    <div className="h-3 w-full animate-pulse rounded bg-[var(--bg-3)]" />
                                </div>
                            ))}
                        </div>
                    ) : filteredItems.length > 0 ? (
                        <>
                            {groupedFilteredItems.map((group, groupIndex) => (
                                <div key={group.label} className={groupIndex > 0 ? "border-t border-[var(--line)]" : ""}>
                                    <div className="bg-[var(--bg-2)] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--fg-3)]">
                                        {group.label}
                                    </div>
                                    {group.items.map((notification, index) => {
                                        const style = TYPE_COLORS[notification.type] ?? TYPE_COLORS.system;
                                        const icon = TYPE_ICONS[notification.type] ?? TYPE_ICONS.system;
                                        const href = getSafeNotificationHref(notification.link);
                                return (
                                    <button
                                        key={notification.id}
                                        type="button"
                                        data-notification-id={notification.id}
                                        data-read={notification.read ? "true" : "false"}
                                        onClick={() => {
                                            if (!notification.read) markRead.mutate(notification.id);
                                            if (href) window.location.assign(href);
                                        }}
                                        className={`relative flex w-full gap-4 px-5 py-4 text-left transition-colors hover:bg-[rgba(255,255,255,0.02)] ${index > 0 ? "border-t border-[var(--line)]" : ""} ${notification.read ? "" : "bg-[rgba(255,255,255,0.015)]"}`}
                                    >
                                        {!notification.read ? <span className="absolute left-3 top-6 h-1.5 w-1.5 rounded-full bg-[var(--mint-400)]" /> : null}
                                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={style}>
                                            {icon}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-1 flex items-center gap-3">
                                                <div className={`line-clamp-1 text-[14px] ${notification.read ? "font-medium text-[var(--fg-1)]" : "font-bold text-[var(--fg-0)]"}`}>
                                                    {notification.title}
                                                </div>
                                                <div className="ml-auto shrink-0 text-[11px] text-[var(--fg-3)]">{formatTimestamp(notification.created_at)}</div>
                                            </div>
                                            <div className="text-[12px] text-[var(--fg-3)]">{notification.type}</div>
                                            <div className="mt-1 text-[13px] leading-[1.5] text-[var(--fg-2)]">{notification.message}</div>
                                        </div>
                                        <div className="hidden shrink-0 items-center sm:flex">
                                            {notification.read ? <CheckCheck size={17} className="text-[var(--fg-3)]" /> : <Check size={17} className="text-[var(--mint-300)]" />}
                                        </div>
                                    </button>
                                );
                                    })}
                                </div>
                            ))}
                            <div ref={loadMoreAnchorRef} className="px-5 py-3 text-center text-[12px] text-[var(--fg-3)]">
                                {isFetchingNextPage ? "Загружаем ещё…" : hasNextPage ? "Прокрутите ниже для загрузки" : "Все уведомления загружены"}
                            </div>
                        </>
                    ) : (
                        <div className="px-5 py-14 text-center">
                            <Bell size={34} className="mx-auto mb-4 text-[var(--fg-3)] opacity-60" />
                            <div className="text-[16px] font-semibold text-[var(--fg-0)]">Уведомлений по этому фильтру нет</div>
                            <div className="mt-2 text-[13px] text-[var(--fg-2)]">Когда появятся новые события, они автоматически окажутся здесь.</div>
                        </div>
                    )}
                </FilkaCard>
            </div>

            <aside className="space-y-4">
                <FilkaCard className="rounded-[14px] border-[rgba(102,58,243,0.22)] bg-[linear-gradient(135deg,rgba(102,58,243,0.10),transparent_65%),var(--bg-1)] p-5">
                    <div className="mb-3 flex items-center gap-3">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-[rgba(102,58,243,0.12)] text-[var(--mint-300)]">
                            <Bell size={14} />
                        </div>
                        <div className="t-mono text-[11px] text-[var(--mint-300)]">AI-ДАЙДЖЕСТ</div>
                    </div>
                    <div className="mb-2 text-[15px] font-bold leading-[1.3] text-[var(--fg-0)]">На что обратить внимание сейчас</div>
                    <div className="mb-4 text-[13px] leading-[1.55] text-[var(--fg-1)]">
                        {digestItem
                            ? <>
                                <strong>{digestItem.title}</strong> — {digestItem.message}
                            </>
                            : "Пока всё спокойно: непрочитанных алертов нет, критических действий не требуется."}
                    </div>
                    {digestHref ? (
                        <a href={digestHref} className="block">
                            <FilkaButton size="sm" className="w-full">Открыть событие</FilkaButton>
                        </a>
                    ) : (
                        <Link href="/dashboard/settings">
                            <FilkaButton size="sm" className="w-full">Открыть настройки</FilkaButton>
                        </Link>
                    )}
                </FilkaCard>

                <FilkaCard className="rounded-[14px] bg-[var(--bg-1)] p-5">
                    <div className="t-eyebrow mb-3">СВОДКА · 7 ДНЕЙ</div>
                    <div className="space-y-2">
                        {[
                            ["Уведомлений", String(weekItems.length)],
                            ["Прочитано", String(weekItems.filter((item) => item.read).length)],
                            ["Непрочитано", String(weekItems.filter((item) => !item.read).length)],
                            ["Текущий фильтр", filters.find((item) => item.key === filter)?.title ?? "Все"],
                        ].map(([label, value], index) => (
                            <div key={label} className={`flex items-center justify-between py-2 text-[13px] ${index > 0 ? "border-t border-[var(--line)]" : ""}`}>
                                <span className="text-[var(--fg-2)]">{label}</span>
                                <span className="font-semibold text-[var(--fg-0)]">{value}</span>
                            </div>
                        ))}
                    </div>
                </FilkaCard>

                <FilkaCard className="rounded-[14px] bg-[var(--bg-1)] p-5">
                    <div className="t-eyebrow mb-3">КАНАЛЫ · АКТИВНЫ</div>
                    <div className="space-y-2">
                        {[
                            { title: "Email", on: true },
                            { title: "Пуш на устройство", on: true },
                            { title: "Системные алерты", on: true },
                            { title: "SMS · только срочное", on: false },
                        ].map((channel, index) => (
                            <div key={channel.title} className={`flex items-center justify-between py-2 text-[13px] ${index > 0 ? "border-t border-[var(--line)]" : ""}`}>
                                <span className={channel.on ? "text-[var(--fg-1)]" : "text-[var(--fg-3)]"}>{channel.title}</span>
                                <span className={`relative h-4 w-7 rounded-full ${channel.on ? "bg-[var(--mint-400)]" : "bg-[var(--bg-3)]"}`}>
                                    <span className="absolute top-0.5 h-3 w-3 rounded-full bg-white" style={{ left: channel.on ? 14 : 2 }} />
                                </span>
                            </div>
                        ))}
                    </div>
                    <Link href="/dashboard/settings" className="mt-4 block">
                        <FilkaButton variant="ghost" size="sm" className="w-full" startContent={<Settings2 size={14} />}>
                            Настроить каналы
                        </FilkaButton>
                    </Link>
                </FilkaCard>
            </aside>
        </div>
    );
};

function parseSafeDate(dateString: string | undefined | null): Date {
    if (!dateString) return new Date();
    const date = new Date(dateString);
    return Number.isNaN(date.getTime()) ? new Date() : date;
}
