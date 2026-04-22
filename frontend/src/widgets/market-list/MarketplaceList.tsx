"use client";

import { useState, useMemo, useEffect } from "react";
import {
    Input,
    Select,
    SelectItem,
    Slider,
    Card,
    CardBody,
    Button,
    Chip,
    Pagination,
    Tooltip,
    Skeleton,
} from "@heroui/react";
import {
    Search,
    Filter,
    ArrowUpDown,
    Calendar,
    Clock,
    Heart,
    RotateCcw,
    SlidersHorizontal,
    LayoutGrid,
    List,
} from "lucide-react";
import { useMarketplaceOrders, useCategories, type OrdersFilter } from "@/features/order-management";
import { StatusBadge } from "@/shared/ui/status-badge/StatusBadge";
import { EmptyState } from "@/shared/ui/empty-state/EmptyState";
import NextLink from "next/link";
import { apiClient } from "@/shared/api/client";
import { wsManager } from "@/shared/ws/manager";

const SORT_OPTIONS = [
    { key: "newest", label: "Новые первыми" },
    { key: "budget_desc", label: "По бюджету ↓" },
    { key: "budget_asc", label: "По бюджету ↑" },
    { key: "deadline", label: "По дедлайну" },
];

const PAGE_SIZE = 10;
const NEW_ORDER_PULSE_MS = 30_000;

const formatRelativeDate = (dateStr: string): string => {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diff = now - date;
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);

    if (hours < 1) return "только что";
    if (hours < 24) return `${hours} ч. назад`;
    if (days < 7) return `${days} дн. назад`;
    return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
};

const formatDeadline = (dateStr: string): string => {
    const deadline = new Date(dateStr);
    const now = new Date();
    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000);

    if (daysLeft < 0) return "Просрочен";
    if (daysLeft === 0) return "Сегодня";
    if (daysLeft === 1) return "Завтра";
    if (daysLeft <= 7) return `${daysLeft} дн.`;
    return deadline.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
};

export const MarketplaceList = () => {
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("all");
    const [sort, setSort] = useState("newest");
    const [budgetRange, setBudgetRange] = useState<number | number[]>([0, 500000]);
    const [sliderValue, setSliderValue] = useState<number | number[]>([0, 500000]);
    const [deadlineFilter, setDeadlineFilter] = useState("all");
    const [publishedFilter, setPublishedFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [showFilters, setShowFilters] = useState(true);
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [aiLoading, setAiLoading] = useState(false);
    const [aiOnlyMode, setAiOnlyMode] = useState(false);
    const [aiHints, setAiHints] = useState<Record<string, { explanation: string; matchScore?: number }>>({});
    const [newOrderPulse, setNewOrderPulse] = useState<Record<string, number>>({});

    const { data: categoriesData } = useCategories();
    // Build categories list: hardcoded fallback + backend data
    const categories = useMemo(() => {
        const fallback = [
            { key: "all", label: "Все категории" },
            { key: "development", label: "Разработка" },
            { key: "design", label: "Дизайн" },
            { key: "marketing", label: "Маркетинг" },
            { key: "writing", label: "Копирайтинг" },
            { key: "other", label: "Другое" },
        ];

        if (categoriesData?.length) {
            return [
                { key: "all", label: "Все категории" },
                ...categoriesData.map((c) => ({ key: c.id, label: c.name })),
            ];
        }
        return fallback;
    }, [categoriesData]);

    const filter: OrdersFilter = { page, limit: PAGE_SIZE, sort };
    if (category !== "all") filter.category = category;
    if (Array.isArray(budgetRange) && budgetRange.length >= 2) {
        if (budgetRange[0] as number > 0) filter.min_budget = budgetRange[0] as number;
        if (budgetRange[1] as number < 500000) filter.max_budget = budgetRange[1] as number;
    }

    const { data, isLoading } = useMarketplaceOrders(filter);

    const orders = data?.items ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    useEffect(() => {
        const unsubscribe = wsManager.subscribe((event) => {
            if (event.type !== "order.created") return;
            const payload = event.data as { order_id?: string };
            if (!payload.order_id) return;
            setNewOrderPulse((prev) => ({ ...prev, [payload.order_id as string]: Date.now() }));
        });

        wsManager.connect();

        const pruneTimer = window.setInterval(() => {
            setNewOrderPulse((prev) => {
                const now = Date.now();
                const next: Record<string, number> = {};
                for (const [id, ts] of Object.entries(prev)) {
                    if (now - ts < NEW_ORDER_PULSE_MS) next[id] = ts;
                }
                return next;
            });
        }, 5000);

        return () => {
            unsubscribe();
            window.clearInterval(pruneTimer);
        };
    }, []);

    const filtered = useMemo(() => {
        const now = new Date();
        const nowMs = now.getTime();

        const bySearch = orders.filter((o) => {
            if (!search) return true;
            const q = search.toLowerCase();
            return o.title.toLowerCase().includes(q) || o.description.toLowerCase().includes(q);
        });

        const byDeadline = bySearch.filter((o) => {
            if (deadlineFilter === "all" || !o.deadline) return true;
            const deadlineMs = new Date(o.deadline).getTime();
            if (!Number.isFinite(deadlineMs)) return true;
            const daysLeft = (deadlineMs - nowMs) / 86_400_000;
            if (deadlineFilter === "3d") return daysLeft <= 3 && daysLeft >= 0;
            if (deadlineFilter === "7d") return daysLeft <= 7 && daysLeft >= 0;
            if (deadlineFilter === "14d") return daysLeft <= 14 && daysLeft >= 0;
            return true;
        });

        const byPublishedDate = byDeadline.filter((o) => {
            if (publishedFilter === "all") return true;
            const createdMs = new Date(o.created_at).getTime();
            if (!Number.isFinite(createdMs)) return false;
            const diffDays = (nowMs - createdMs) / 86_400_000;
            if (publishedFilter === "today") return diffDays < 1;
            if (publishedFilter === "week") return diffDays < 7;
            if (publishedFilter === "month") return diffDays < 30;
            return true;
        });

        if (!aiOnlyMode) return byPublishedDate;
        const allowed = new Set(Object.keys(aiHints));
        return byPublishedDate.filter((o) => allowed.has(o.id));
    }, [aiHints, aiOnlyMode, deadlineFilter, orders, publishedFilter, search]);

    const addedLastHour = useMemo(
        () =>
            filtered.filter((order) => {
                const createdAt = new Date(order.created_at).getTime();
                return Number.isFinite(createdAt) && Date.now() - createdAt <= 3_600_000;
            }).length,
        [filtered]
    );

    const fetchAIRecommendations = async () => {
        setAiLoading(true);
        try {
            const data = await apiClient.request<{
                recommended_order_ids?: string[];
                recommended_orders?: Array<{ order_id?: string; explanation?: string; match_score?: number }>;
            }>("/ai/orders/recommended?limit=30");

            const hints: Record<string, { explanation: string; matchScore?: number }> = {};

            for (const item of data.recommended_orders ?? []) {
                const orderId = item.order_id?.trim();
                if (!orderId) continue;
                const explanation = item.explanation?.trim() || "Подходит под ваш профиль и историю откликов";
                const matchScore = typeof item.match_score === "number" ? item.match_score : null;
                hints[orderId] = matchScore === null
                    ? { explanation }
                    : { explanation, matchScore };
            }

            for (const id of data.recommended_order_ids ?? []) {
                const orderId = id.trim();
                if (!orderId || hints[orderId]) continue;
                hints[orderId] = {
                    explanation: "Рекомендован на основе вашего профиля",
                };
            }

            setAiHints(hints);
            setAiOnlyMode(true);
        } finally {
            setAiLoading(false);
        }
    };

    const toggleFavorite = (id: string) => {
        setFavorites((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const resetFilters = () => {
        setSearch("");
        setCategory("all");
        setSort("newest");
        setBudgetRange([0, 500000]);
        setSliderValue([0, 500000]);
        setDeadlineFilter("all");
        setPublishedFilter("all");
        setAiOnlyMode(false);
        setAiHints({});
        setPage(1);
    };

    const hasActiveFilters = category !== "all" || search.length > 0 || sort !== "newest" ||
        (Array.isArray(budgetRange) && (budgetRange[0] as number > 0 || budgetRange[1] as number < 500000)) ||
        deadlineFilter !== "all" || publishedFilter !== "all" || aiOnlyMode;

    return (
        <div className="space-y-6">
            {/* Header with count + toggle */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <p className="text-sm text-zinc-400">
                        {isLoading ? (
                            <span className="inline-block h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                        ) : (
                            <>
                                Найдено <span className="text-emerald-400 font-semibold">{total}</span> заказов ·{" "}
                                <span className="text-zinc-300">{addedLastHour}</span> добавлено за час
                            </>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* View mode toggle */}
                    <div className="flex items-center bg-zinc-800/50 rounded-lg p-0.5 border border-white/[0.04]">
                        <button
                            type="button"
                            onClick={() => setViewMode("list")}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-emerald-600/20 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}
                            aria-label="Список"
                        >
                            <List size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("grid")}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-emerald-600/20 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}
                            aria-label="Сетка"
                        >
                            <LayoutGrid size={14} />
                        </button>
                    </div>
                    {hasActiveFilters && (
                        <Button
                            size="sm"
                            variant="flat"
                            className="text-zinc-400 hover:text-zinc-200"
                            startContent={<RotateCcw size={14} />}
                            onPress={resetFilters}
                        >
                            Сбросить
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="flat"
                        className={`${showFilters ? "text-emerald-400" : "text-zinc-400"}`}
                        startContent={<SlidersHorizontal size={14} />}
                        onPress={() => setShowFilters((v) => !v)}
                    >
                        Фильтры
                    </Button>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="glass-card rounded-2xl p-4 animate-fade-in-up space-y-4 sticky top-24 z-20">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Button
                            size="sm"
                            className="bg-[#7B2FFF] text-white hover:bg-[#8a42ff]"
                            onPress={fetchAIRecommendations}
                            isLoading={aiLoading}
                        >
                            AI: Подобрать под мой профиль
                        </Button>
                        {aiOnlyMode && (
                            <Button
                                size="sm"
                                variant="flat"
                                className="text-zinc-300"
                                onPress={() => setAiOnlyMode(false)}
                            >
                                Показать все заказы
                            </Button>
                        )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Input
                            placeholder="Поиск заказов..."
                            value={search}
                            onValueChange={setSearch}
                            startContent={<Search size={16} className="text-zinc-500" />}
                            variant="bordered"
                            classNames={{
                                inputWrapper: "bg-zinc-900/50 border-zinc-700/50 hover:border-emerald-500/40",
                                input: "text-zinc-200 placeholder:text-zinc-600",
                            }}
                            className="flex-1"
                        />
                        <Select
                            selectedKeys={[category]}
                            onSelectionChange={(keys) => {
                                setCategory(Array.from(keys)[0] as string);
                                setPage(1);
                            }}
                            variant="bordered"
                            startContent={<Filter size={16} className="text-zinc-500" />}
                            classNames={{
                                trigger: "bg-zinc-900/50 border-zinc-700/50 hover:border-emerald-500/40",
                                value: "text-zinc-200",
                            }}
                            className="sm:w-52"
                            aria-label="Категория"
                        >
                            {categories.map((c) => (
                                <SelectItem key={c.key}>{c.label}</SelectItem>
                            ))}
                        </Select>
                        <Select
                            selectedKeys={[sort]}
                            onSelectionChange={(keys) => {
                                setSort(Array.from(keys)[0] as string);
                                setPage(1);
                            }}
                            variant="bordered"
                            startContent={<ArrowUpDown size={16} className="text-zinc-500" />}
                            classNames={{
                                trigger: "bg-zinc-900/50 border-zinc-700/50 hover:border-emerald-500/40",
                                value: "text-zinc-200",
                            }}
                            className="sm:w-48"
                            aria-label="Сортировка"
                        >
                            {SORT_OPTIONS.map((opt) => (
                                <SelectItem key={opt.key}>{opt.label}</SelectItem>
                            ))}
                        </Select>
                        <Select
                            selectedKeys={[deadlineFilter]}
                            onSelectionChange={(keys) => {
                                setDeadlineFilter(Array.from(keys)[0] as string);
                                setPage(1);
                            }}
                            variant="bordered"
                            startContent={<Clock size={16} className="text-zinc-500" />}
                            classNames={{
                                trigger: "bg-zinc-900/50 border-zinc-700/50 hover:border-emerald-500/40",
                                value: "text-zinc-200",
                            }}
                            className="sm:w-48"
                            aria-label="Срок выполнения"
                        >
                            <SelectItem key="all">Срок: любой</SelectItem>
                            <SelectItem key="3d">Срок: до 3 дней</SelectItem>
                            <SelectItem key="7d">Срок: до 7 дней</SelectItem>
                            <SelectItem key="14d">Срок: до 14 дней</SelectItem>
                        </Select>
                        <Select
                            selectedKeys={[publishedFilter]}
                            onSelectionChange={(keys) => {
                                setPublishedFilter(Array.from(keys)[0] as string);
                                setPage(1);
                            }}
                            variant="bordered"
                            startContent={<Calendar size={16} className="text-zinc-500" />}
                            classNames={{
                                trigger: "bg-zinc-900/50 border-zinc-700/50 hover:border-emerald-500/40",
                                value: "text-zinc-200",
                            }}
                            className="sm:w-48"
                            aria-label="Дата публикации"
                        >
                            <SelectItem key="all">Публикация: любая</SelectItem>
                            <SelectItem key="today">Только сегодня</SelectItem>
                            <SelectItem key="week">За неделю</SelectItem>
                            <SelectItem key="month">За месяц</SelectItem>
                        </Select>
                    </div>
                    <div>
                        <Slider
                            label="Бюджет"
                            step={5000}
                            minValue={0}
                            maxValue={500000}
                            value={sliderValue}
                            onChange={setSliderValue}
                            onChangeEnd={(v) => {
                                setBudgetRange(v);
                                setPage(1);
                            }}
                            formatOptions={{ style: "currency", currency: "RUB", maximumFractionDigits: 0 }}
                            classNames={{
                                label: "text-zinc-400 text-sm",
                                value: "text-zinc-300 text-sm",
                                filler: "bg-emerald-600",
                                thumb: "bg-emerald-500 border-emerald-600",
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Order list */}
            {isLoading ? (
                <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "grid gap-4"}>
                    {Array.from({ length: viewMode === "grid" ? 4 : 3 }).map((_, i) => (
                        <Card key={i} className="glass-card">
                            <CardBody className="p-5 flex flex-col gap-3">
                                <div className="flex justify-between items-center z-10">
                                    <Skeleton className="rounded-lg w-2/3 h-6" classNames={{ base: "bg-zinc-800", content: "bg-zinc-700" }} />
                                    <Skeleton className="rounded-lg w-20 h-6" classNames={{ base: "bg-zinc-800", content: "bg-zinc-700" }} />
                                </div>
                                <div className="space-y-2 mt-1">
                                    <Skeleton className="rounded-lg w-full h-4" classNames={{ base: "bg-zinc-800", content: "bg-zinc-700" }} />
                                    <Skeleton className="rounded-lg w-4/5 h-4" classNames={{ base: "bg-zinc-800", content: "bg-zinc-700" }} />
                                    <Skeleton className="rounded-lg w-2/3 h-4" classNames={{ base: "bg-zinc-800", content: "bg-zinc-700" }} />
                                </div>
                                <div className="flex items-center gap-4 mt-2">
                                    <Skeleton className="rounded-lg w-32 h-5" classNames={{ base: "bg-zinc-800", content: "bg-zinc-700" }} />
                                    <Skeleton className="rounded-lg w-24 h-5" classNames={{ base: "bg-zinc-800", content: "bg-zinc-700" }} />
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={<Search size={24} />}
                    title="Заказы не найдены"
                    description="Попробуйте изменить фильтры или поисковый запрос"
                    {...(hasActiveFilters
                        ? { actionLabel: "Сбросить фильтры", onAction: resetFilters }
                        : {})}
                />
            ) : (
                <>
                    <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "grid gap-4"}>
                        {filtered.map((order, i) => (
                            <Card
                                key={order.id}
                                className={`glass-card card-hover-glow transition-all duration-200 animate-fade-in-up ${
                                    newOrderPulse[order.id] ? "ring-2 ring-[#00E5C8]/70 shadow-[0_0_0_2px_rgba(0,229,200,0.25)] animate-pulse" : ""
                                }`}
                                style={{ animationDelay: `${i * 60}ms` }}
                            >
                                <CardBody className="p-5">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <NextLink
                                            href={`/dashboard/orders/${order.id}`}
                                            className="text-base font-semibold text-zinc-200 line-clamp-1 hover:text-emerald-300 transition-colors flex-1"
                                        >
                                            {order.title}
                                        </NextLink>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <StatusBadge status={order.status} />
                                            <Tooltip content={favorites.has(order.id) ? "Убрать из избранного" : "В избранное"}>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleFavorite(order.id)}
                                                    className={`p-1.5 rounded-lg transition-all duration-200 ${favorites.has(order.id)
                                                        ? "text-red-400 bg-red-500/10 hover:bg-red-500/20"
                                                        : "text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.04]"
                                                        }`}
                                                    aria-label="В избранное"
                                                >
                                                    <Heart
                                                        size={16}
                                                        fill={favorites.has(order.id) ? "currentColor" : "none"}
                                                    />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </div>
                                    <p className="text-sm text-zinc-400 line-clamp-2 mb-3">{order.description}</p>
                                    {aiHints[order.id] && (
                                        <div className="mb-3 rounded-lg border border-[#2a2f58] bg-[#0f1226] px-3 py-2">
                                            <p className="text-xs text-zinc-200">
                                                ✦ Подходит: {aiHints[order.id]?.explanation}
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-sm font-medium text-emerald-400">
                                            ₽{order.budget_min.toLocaleString()} – ₽{order.budget_max.toLocaleString()}
                                        </span>

                                        {/* Deadline */}
                                        {order.deadline && (
                                            <Chip
                                                size="sm"
                                                variant="flat"
                                                startContent={<Calendar size={12} />}
                                                classNames={{
                                                    base: "bg-amber-500/10 border-amber-500/20 border",
                                                    content: "text-amber-300 text-xs",
                                                }}
                                            >
                                                {formatDeadline(order.deadline)}
                                            </Chip>
                                        )}

                                        {/* Skill tags */}
                                        {order.skill_tags.slice(0, 3).map((tag) => (
                                            <Chip
                                                key={tag}
                                                size="sm"
                                                variant="flat"
                                                classNames={{
                                                    base: "bg-emerald-500/10 border-emerald-500/20",
                                                    content: "text-emerald-300 text-xs",
                                                }}
                                            >
                                                {tag}
                                            </Chip>
                                        ))}
                                        {order.skill_tags.length > 3 && (
                                            <span className="text-xs text-zinc-600">+{order.skill_tags.length - 3}</span>
                                        )}

                                        {/* Right side: meta info */}
                                        <div className="ml-auto flex items-center gap-3 text-xs text-zinc-600">
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {formatRelativeDate(order.created_at)}
                                            </span>
                                            <span>{order.proposals_count} откликов</span>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center pt-4">
                            <Pagination
                                total={totalPages}
                                page={page}
                                onChange={setPage}
                                showControls
                                classNames={{
                                    item: "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 border-none",
                                    cursor: "bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/30",
                                    prev: "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700",
                                    next: "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700",
                                }}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
