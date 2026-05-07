"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSessionStore } from "@/shared/store/session.store";
import {
    useDeleteOrder,
    useMarketplaceOrders,
    useMyOrders,
    usePublishOrder,
} from "@/features/order-management";
import { useCategories } from "@/features/order-management";
import { useAIRecommendedOrders } from "@/features/onboarding/hooks/useAIRecommendedOrders";
import { StatusBadge } from "@/shared/ui/status-badge/StatusBadge";
import {
    FilkaButton,
    FilkaCard,
    FilkaChip,
    FilkaInput,
    FilkaMenu,
    FilkaMenuItem,
    FilkaSegmented,
    FilkaTabs,
    IconArrowRight,
    IconBriefcase,
    IconExternalLink,
    IconMore,
    IconPlus,
    IconSearch,
    IconSpark,
    IconTrash,
    useFilkaToast,
} from "@/shared/ui/filka";
import { formatMoney } from "@/shared/lib/money";

const formatRelative = (dateString: string): string => {
    const date = new Date(dateString);
    if (!Number.isFinite(date.getTime())) return "недавно";
    const diffMin = Math.floor((Date.now() - date.getTime()) / 60_000);
    if (diffMin < 1) return "только что";
    if (diffMin < 60) return `${diffMin} мин назад`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} ч назад`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} дн назад`;
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
};

const formatDeadline = (dateString: string): string => {
    if (!dateString) return "без срока";
    const date = new Date(dateString);
    if (!Number.isFinite(date.getTime())) return "без срока";
    const diffDays = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
    if (diffDays <= 0) return "сегодня";
    if (diffDays === 1) return "1 день";
    if (diffDays < 5) return `${diffDays} дня`;
    return `${diffDays} дней`;
};

type ClientStatusFilter = "all" | "draft" | "published" | "in_progress" | "completed" | "cancelled";

const CLIENT_STATUS_TABS: ReadonlyArray<{ id: ClientStatusFilter; label: string }> = [
    { id: "all", label: "Все" },
    { id: "draft", label: "Черновики" },
    { id: "published", label: "Опубликованы" },
    { id: "in_progress", label: "В работе" },
    { id: "completed", label: "Завершены" },
    { id: "cancelled", label: "Отменены" },
];

const ClientOrders = () => {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<ClientStatusFilter>("all");
    const { data, isLoading } = useMyOrders({ limit: 50 });
    const orders = data?.items ?? [];
    const publish = usePublishOrder();
    const remove = useDeleteOrder();
    const toast = useFilkaToast();

    const filteredOrders = useMemo(() => {
        const query = search.trim().toLowerCase();
        return orders.filter((order) => {
            const statusMatch = statusFilter === "all" || order.status === statusFilter;
            const searchMatch =
                !query ||
                order.title.toLowerCase().includes(query) ||
                order.description.toLowerCase().includes(query) ||
                (order.category ?? "").toLowerCase().includes(query);
            return statusMatch && searchMatch;
        });
    }, [orders, search, statusFilter]);

    const counters = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const order of orders) counts[order.status] = (counts[order.status] ?? 0) + 1;
        return counts;
    }, [orders]);

    const handlePublish = (id: string) => {
        publish.mutate(id, {
            onSuccess: () => toast.success("Заказ опубликован"),
            onError: () => toast.error("Не удалось опубликовать заказ"),
        });
    };

    const handleDelete = (id: string) => {
        if (typeof window !== "undefined" && !window.confirm("Удалить заказ безвозвратно?")) return;
        remove.mutate(id, {
            onSuccess: () => toast.success("Заказ удалён"),
            onError: () => toast.error("Не удалось удалить заказ"),
        });
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="t-eyebrow mb-2">Контроль заказов</div>
                    <h1 className="text-[28px] font-bold tracking-[-0.03em]">Мои заказы</h1>
                    <p
                        className="mt-2 max-w-[640px] text-[14px] leading-[1.55]"
                        style={{ color: "var(--fg-2)" }}
                    >
                        Следите за статусами, откликами и AI-подсказками по каждому опубликованному заказу.
                    </p>
                </div>
                <Link href="/dashboard/orders/new">
                    <FilkaButton startContent={<IconPlus size={16} />}>Создать заказ</FilkaButton>
                </Link>
            </div>

            <FilkaTabs
                value={statusFilter}
                onChange={setStatusFilter}
                items={CLIENT_STATUS_TABS.map((t) => ({
                    id: t.id,
                    label: t.label,
                    badge:
                        t.id !== "all" && counters[t.id] ? (
                            <FilkaChip tone="muted">{counters[t.id]}</FilkaChip>
                        ) : null,
                }))}
            />

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative max-w-[420px] flex-1">
                    <IconSearch
                        size={15}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-3)]"
                    />
                    <FilkaInput
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Поиск по заказам"
                        className="pl-9"
                    />
                </div>
                <div className="flex flex-wrap gap-2 lg:ml-auto">
                    <FilkaChip>{filteredOrders.length} заказов</FilkaChip>
                    <FilkaChip tone="muted">
                        {orders.filter((order) => (order.proposals_count ?? 0) > 0).length} с откликами
                    </FilkaChip>
                </div>
            </div>

            {isLoading ? (
                <div className="grid gap-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <FilkaCard key={index} className="p-5">
                            <div className="h-5 w-2/3 animate-pulse rounded" style={{ background: "var(--bg-3)" }} />
                        </FilkaCard>
                    ))}
                </div>
            ) : filteredOrders.length > 0 ? (
                <div className="grid gap-3">
                    {filteredOrders.map((order) => (
                        <FilkaCard key={order.id} className="p-5">
                            <div className="mb-3 flex gap-3">
                                <Link
                                    href={`/dashboard/orders/${order.id}` as Route}
                                    className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] text-[13px] font-bold"
                                    style={{
                                        background: "linear-gradient(135deg,#B6D9FC,#1a0e4a)",
                                        color: "#05060f",
                                    }}
                                >
                                    {order.title.slice(0, 2).toUpperCase()}
                                </Link>
                                <div className="min-w-0 flex-1">
                                    <Link
                                        href={`/dashboard/orders/${order.id}` as Route}
                                        className="mb-1 line-clamp-2 block text-[15.5px] font-semibold tracking-[-0.01em] hover:text-[var(--mint-300)]"
                                    >
                                        {order.title}
                                    </Link>
                                    <div className="t-caption flex flex-wrap gap-2 text-[11px]">
                                        <span>{order.category || "Без категории"}</span>
                                        <span aria-hidden="true">·</span>
                                        <span>{formatRelative(order.created_at)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={order.status} />
                                    <FilkaMenu
                                        align="end"
                                        trigger={
                                            <button
                                                type="button"
                                                className="grid h-8 w-8 place-items-center rounded-md text-[var(--fg-2)] hover:bg-[var(--bg-3)] hover:text-[var(--fg-0)]"
                                                aria-label="Действия"
                                            >
                                                <IconMore size={14} />
                                            </button>
                                        }
                                    >
                                        <Link href={`/dashboard/orders/${order.id}` as Route}>
                                            <FilkaMenuItem icon={<IconExternalLink size={14} />} label="Открыть" />
                                        </Link>
                                        {order.status === "draft" ? (
                                            <FilkaMenuItem
                                                icon={<IconArrowRight size={14} />}
                                                label="Опубликовать"
                                                onSelect={() => handlePublish(order.id)}
                                            />
                                        ) : null}
                                        {order.status === "draft" || order.status === "cancelled" ? (
                                            <FilkaMenuItem
                                                icon={<IconTrash size={14} />}
                                                label="Удалить"
                                                tone="danger"
                                                onSelect={() => handleDelete(order.id)}
                                            />
                                        ) : null}
                                    </FilkaMenu>
                                </div>
                            </div>

                            {(order.skill_tags ?? []).length > 0 ? (
                                <div className="mb-4 flex flex-wrap gap-2">
                                    {(order.skill_tags ?? []).slice(0, 6).map((tag) => (
                                        <FilkaChip key={tag} tone="muted">
                                            {tag}
                                        </FilkaChip>
                                    ))}
                                </div>
                            ) : null}

                            <div
                                className="flex flex-wrap items-center gap-5 border-t pt-3 text-[13px]"
                                style={{ borderColor: "var(--line)" }}
                            >
                                <div>
                                    <div className="t-caption">Бюджет</div>
                                    <div className="text-[15px] font-bold">
                                        {formatMoney(order.budget_min)} – {formatMoney(order.budget_max)}
                                    </div>
                                </div>
                                <div>
                                    <div className="t-caption">Срок</div>
                                    <div className="font-medium" style={{ color: "var(--fg-1)" }}>
                                        {formatDeadline(order.deadline)}
                                    </div>
                                </div>
                                <div>
                                    <div className="t-caption">Откликов</div>
                                    <div className="font-medium" style={{ color: "var(--fg-1)" }}>
                                        {order.proposals_count ?? 0}
                                    </div>
                                </div>
                                <div className="ml-auto">
                                    <Link
                                        href={`/dashboard/orders/${order.id}` as Route}
                                        className="filka-btn filka-btn-soft filka-btn-sm"
                                    >
                                        Открыть <IconArrowRight size={14} />
                                    </Link>
                                </div>
                            </div>
                        </FilkaCard>
                    ))}
                </div>
            ) : (
                <FilkaCard className="px-6 py-12 text-center">
                    <IconBriefcase size={30} className="mx-auto mb-4 text-[var(--mint-300)]" />
                    <div className="text-[16px] font-semibold">У вас пока нет заказов</div>
                    <div className="mt-2 text-[13px]" style={{ color: "var(--fg-2)" }}>
                        Создайте первый заказ, и платформа начнёт собирать отклики исполнителей.
                    </div>
                    <Link href="/dashboard/orders/new" className="mt-5 inline-flex">
                        <FilkaButton size="sm">Создать заказ</FilkaButton>
                    </Link>
                </FilkaCard>
            )}
        </div>
    );
};

type SortKey = "newest" | "budget_desc" | "budget_asc" | "deadline";

const SORT_OPTIONS: ReadonlyArray<{ id: SortKey; label: string }> = [
    { id: "newest", label: "Новые" },
    { id: "budget_desc", label: "Бюджет ↓" },
    { id: "budget_asc", label: "Бюджет ↑" },
    { id: "deadline", label: "Срок" },
];

const FreelancerOrders = () => {
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<SortKey>("newest");
    const [activeCategory, setActiveCategory] = useState<string>("all");
    const { data, isLoading } = useMarketplaceOrders({ limit: 30, sort });
    const { data: categoriesData } = useCategories();
    const { orders: aiOrders, scoreById: aiScoreById, fetch: fetchAiOrders } = useAIRecommendedOrders();
    useEffect(() => {
        fetchAiOrders();
    }, [fetchAiOrders]);
    const marketplaceOrders = data?.items ?? [];
    const orders = aiOrders.length > 0 ? aiOrders : marketplaceOrders;

    const categories = useMemo(() => {
        const list = (categoriesData ?? []).map((c) => ({ id: c.name, label: c.name }));
        return [{ id: "all", label: "Все" }, ...list];
    }, [categoriesData]);

    const filteredOrders = useMemo(() => {
        const query = search.trim().toLowerCase();
        return orders.filter((order) => {
            const categoryMatches = activeCategory === "all" || order.category === activeCategory;
            const searchMatches =
                !query ||
                order.title.toLowerCase().includes(query) ||
                order.description.toLowerCase().includes(query) ||
                (order.skill_tags ?? []).some((tag) => tag.toLowerCase().includes(query));
            return categoryMatches && searchMatches;
        });
    }, [activeCategory, orders, search]);

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="t-eyebrow mb-2">Биржа · AI-подбор</div>
                    <h1 className="text-[28px] font-bold tracking-[-0.03em]">Подходящие заказы</h1>
                    <p
                        className="mt-2 max-w-[700px] text-[14px] leading-[1.55]"
                        style={{ color: "var(--fg-2)" }}
                    >
                        AI уже отобрал задачи по вашему стеку. Откликайтесь быстро, пока заказ ещё в свежей выдаче.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <FilkaChip>{filteredOrders.length} релевантных</FilkaChip>
                    <FilkaChip tone="muted">{orders.length} всего в ленте</FilkaChip>
                </div>
            </div>

            <FilkaCard className="p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                    <div className="relative max-w-[420px] flex-1">
                        <IconSearch
                            size={15}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-3)]"
                        />
                        <FilkaInput
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Поиск по задачам, стеку или описанию"
                            className="pl-9"
                        />
                    </div>
                    <div className="xl:ml-auto">
                        <FilkaSegmented value={sort} onChange={setSort} items={SORT_OPTIONS} />
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    {categories.map((category) => (
                        <button
                            key={category.id}
                            type="button"
                            onClick={() => setActiveCategory(category.id)}
                            className={
                                activeCategory === category.id ? "filka-chip" : "filka-chip filka-chip-muted"
                            }
                            style={{ cursor: "pointer" }}
                        >
                            {category.label}
                        </button>
                    ))}
                </div>
            </FilkaCard>

            {isLoading ? (
                <div className="grid gap-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <FilkaCard key={index} className="p-5">
                            <div className="h-5 w-2/3 animate-pulse rounded" style={{ background: "var(--bg-3)" }} />
                        </FilkaCard>
                    ))}
                </div>
            ) : filteredOrders.length > 0 ? (
                <div className="grid gap-3">
                    {filteredOrders.map((order) => (
                        <Link key={order.id} href={`/dashboard/orders/${order.id}` as Route} className="block">
                            <FilkaCard className="p-5 transition-all hover:-translate-y-0.5">
                                <div className="mb-3 flex gap-3">
                                    <div
                                        className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] text-[13px] font-bold"
                                        style={{
                                            background: "linear-gradient(135deg,#B6D9FC,#1a0e4a)",
                                            color: "#05060f",
                                        }}
                                    >
                                        {order.title.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1 line-clamp-2 text-[15.5px] font-semibold tracking-[-0.01em]">
                                            {order.title}
                                        </div>
                                        <div className="t-caption flex flex-wrap gap-2 text-[11px]">
                                            <span>{order.category || "Без категории"}</span>
                                            <span aria-hidden="true">·</span>
                                            <span>{formatRelative(order.created_at)}</span>
                                        </div>
                                    </div>
                                    <FilkaChip>
                                        <IconSpark size={11} />
                                        {aiScoreById[order.id] ? `AI · ${aiScoreById[order.id]}%` : "AI-совпадение"}
                                    </FilkaChip>
                                </div>

                                {(order.skill_tags ?? []).length > 0 ? (
                                    <div className="mb-4 flex flex-wrap gap-2">
                                        {(order.skill_tags ?? []).slice(0, 6).map((tag) => (
                                            <FilkaChip key={tag} tone="muted">
                                                {tag}
                                            </FilkaChip>
                                        ))}
                                    </div>
                                ) : null}

                                <div
                                    className="flex flex-wrap items-center gap-5 border-t pt-3 text-[13px]"
                                    style={{ borderColor: "var(--line)" }}
                                >
                                    <div>
                                        <div className="t-caption">Бюджет</div>
                                        <div className="text-[15px] font-bold">
                                            {formatMoney(order.budget_max || order.budget_min || 0)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="t-caption">Срок</div>
                                        <div className="font-medium" style={{ color: "var(--fg-1)" }}>
                                            {formatDeadline(order.deadline)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="t-caption">Откликов</div>
                                        <div className="font-medium" style={{ color: "var(--fg-1)" }}>
                                            {order.proposals_count ?? 0}
                                        </div>
                                    </div>
                                    <div className="ml-auto">
                                        <span className="filka-btn filka-btn-soft filka-btn-sm">
                                            Откликнуться <IconArrowRight size={14} />
                                        </span>
                                    </div>
                                </div>
                            </FilkaCard>
                        </Link>
                    ))}
                </div>
            ) : (
                <FilkaCard className="px-6 py-12 text-center">
                    <IconSearch size={30} className="mx-auto mb-4 text-[var(--mint-300)]" />
                    <div className="text-[16px] font-semibold">По этим фильтрам ничего не найдено</div>
                    <div className="mt-2 text-[13px]" style={{ color: "var(--fg-2)" }}>
                        Попробуйте сбросить категорию или поиск, чтобы вернуть полную AI-ленту заказов.
                    </div>
                </FilkaCard>
            )}
        </div>
    );
};

export const OrdersPage = () => {
    const role = useSessionStore((s) => s.role);
    return role === "freelancer" ? <FreelancerOrders /> : <ClientOrders />;
};
