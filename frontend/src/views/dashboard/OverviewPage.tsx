"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSessionStore } from "@/shared/store/session.store";
import { useBalance } from "@/features/balance-management";
import { useMyOrders, useMarketplaceOrders } from "@/features/order-management";
import { useMyConversations } from "@/features/conversation-list";
import { useNotificationCenter } from "@/features/notification-center";
import { useProfileProgress } from "@/features/dashboard-stats/useProfileProgress";
import { useOnlineCount } from "@/features/dashboard-stats/useOnlineCount";
import { useCategories } from "@/features/order-management";
import { useAIRecommendedOrders } from "@/features/onboarding/hooks/useAIRecommendedOrders";
import { formatMoney } from "@/shared/lib/money";
import {
    FilkaAISphere,
    FilkaAvatar,
    FilkaButton,
    FilkaCard,
    FilkaChip,
    FilkaLiveDot,
    FilkaProgressBar,
    FilkaSkeleton,
    IconArrowRight,
    IconBriefcase,
    IconChat,
    IconLightning,
    IconShield,
    IconSpark,
    IconStar,
    IconUsers,
    IconWallet,
} from "@/shared/ui/filka";

const formatDeadline = (dateString: string): string => {
    if (!dateString) return "без дедлайна";
    const date = new Date(dateString);
    if (!Number.isFinite(date.getTime())) return "без дедлайна";
    const diffDays = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
    if (diffDays <= 0) return "сегодня";
    if (diffDays === 1) return "1 день";
    if (diffDays < 5) return `${diffDays} дня`;
    return `${diffDays} дней`;
};

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

export const OverviewPage = () => {
    const role = useSessionStore((s) => s.role);
    const { data: balance } = useBalance();
    const { data: myOrdersData, isLoading: isOrdersLoading } = useMyOrders({ limit: 6 });
    const { data: marketplaceData, isLoading: isMarketplaceLoading } = useMarketplaceOrders({ limit: 6, sort: "newest" });
    const { data: conversations } = useMyConversations();
    const { unreadCount } = useNotificationCenter();
    const profileProgress = useProfileProgress();
    const { data: onlineData } = useOnlineCount();
    const onlineCount = onlineData?.online_count ?? onlineData?.count ?? 0;
    const { data: categories } = useCategories();

    const [categoryFilter, setCategoryFilter] = useState<string>("all");

    // Для фрилансера тянем AI-рекомендации (с match_score). Если AI вернул
    // пусто — fallback на общий маркетплейс.
    const { orders: aiOrders, scoreById: aiScoreById, fetch: fetchAiOrders, isLoading: isAiSpotlightLoading } = useAIRecommendedOrders();
    useEffect(() => {
        if (role === "freelancer") fetchAiOrders();
    }, [role, fetchAiOrders]);

    const spotlightOrdersAll = useMemo(() => {
        if (role !== "freelancer") return myOrdersData?.items ?? [];
        if (isAiSpotlightLoading && aiOrders.length === 0) return [];
        if (aiOrders.length > 0) return aiOrders;
        return marketplaceData?.items ?? [];
    }, [role, aiOrders, marketplaceData?.items, myOrdersData?.items, isAiSpotlightLoading]);

    const isSpotlightListLoading =
        (role === "freelancer" && isAiSpotlightLoading && aiOrders.length === 0) ||
        (role === "freelancer" && aiOrders.length === 0 && isMarketplaceLoading) ||
        (isOrdersLoading && role !== "freelancer");

    const spotlightOrders = useMemo(() => {
        if (categoryFilter === "all") return spotlightOrdersAll;
        return spotlightOrdersAll.filter((order) => order.category === categoryFilter);
    }, [spotlightOrdersAll, categoryFilter]);

    const activeOrdersCount = useMemo(
        () =>
            (myOrdersData?.items ?? []).filter((order) => order.status === "published" || order.status === "in_progress")
                .length,
        [myOrdersData?.items],
    );
    const conversationCount = conversations?.length ?? 0;
    const balanceLabel = role === "client" ? "В эскроу" : "Доступно";
    const balanceValue = role === "client" ? balance?.pending : balance?.available;
    const marketTotal = marketplaceData?.total ?? 0;
    const recentChats = (conversations ?? []).slice(0, 4);

    const metrics =
        role === "freelancer"
            ? [
                  {
                      label: "Новых заказов",
                      value: String(marketTotal),
                      delta: "лента за сегодня",
                      icon: IconLightning,
                  },
                  {
                      label: balanceLabel,
                      value: typeof balanceValue === "number" ? formatMoney(balanceValue) : "—",
                      delta: "готово к выводу",
                      icon: IconWallet,
                  },
                  {
                      label: "Диалогов",
                      value: String(conversationCount),
                      delta: unreadCount > 0 ? `${unreadCount} непрочитано` : "без пропущенных",
                      icon: IconChat,
                  },
                  {
                      label: "Профиль",
                      value: `${profileProgress.percentage}%`,
                      delta: "заполненность",
                      icon: IconStar,
                  },
              ]
            : [
                  {
                      label: "В работе",
                      value: String(activeOrdersCount),
                      delta: "активные сделки",
                      icon: IconLightning,
                  },
                  {
                      label: balanceLabel,
                      value: typeof balanceValue === "number" ? formatMoney(balanceValue) : "—",
                      delta: "резерв по сделкам",
                      icon: IconShield,
                  },
                  {
                      label: "Чаты",
                      value: String(conversationCount),
                      delta: unreadCount > 0 ? `${unreadCount} непрочитано` : "все просмотрены",
                      icon: IconChat,
                  },
                  {
                      label: "Профиль",
                      value: `${profileProgress.percentage}%`,
                      delta: "готовность аккаунта",
                      icon: IconStar,
                  },
              ];

    const filterOptions = useMemo(() => {
        const cats = (categories ?? []).slice(0, 5).map((c) => ({ id: c.slug ?? c.id, label: c.name }));
        return [{ id: "all", label: "Все" }, ...cats];
    }, [categories]);

    return (
        <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => {
                    const Icon = metric.icon;
                    return (
                        <FilkaCard key={metric.label} className="p-4">
                            <div className="mb-3 flex items-center gap-3">
                                <span
                                    className="grid h-9 w-9 place-items-center rounded-[10px]"
                                    style={{
                                        background: "rgba(102,58,243,0.1)",
                                        border: "1px solid rgba(102,58,243,0.22)",
                                        color: "var(--mint-300)",
                                    }}
                                >
                                    <Icon size={17} />
                                </span>
                                <div className="t-caption">{metric.label}</div>
                            </div>
                            <div className="text-[28px] font-bold tracking-[-0.02em]">{metric.value}</div>
                            <div className="mt-1 text-[12px]" style={{ color: "var(--mint-300)" }}>
                                {metric.delta}
                            </div>
                        </FilkaCard>
                    );
                })}
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                            <h2 className="t-h3 m-0 whitespace-nowrap">
                                {role === "freelancer" ? "Подходящие заказы" : "Мои активные заказы"}
                            </h2>
                            <FilkaChip className="shrink-0 whitespace-nowrap">
                                {role === "freelancer"
                                    ? `AI отфильтровал из ${marketTotal || 0}`
                                    : `${spotlightOrdersAll.length} в фокусе`}
                            </FilkaChip>
                        </div>
                        <div className="flex flex-wrap gap-2 lg:ml-auto">
                            {filterOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setCategoryFilter(opt.id)}
                                    className={
                                        categoryFilter === opt.id ? "filka-chip" : "filka-chip filka-chip-muted"
                                    }
                                    style={{ cursor: "pointer" }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {isSpotlightListLoading ? (
                        <div className="grid gap-3">
                            {Array.from({ length: 3 }).map((_, index) => (
                                <FilkaCard key={index} className="p-5">
                                    <FilkaSkeleton width="60%" height={20} className="mb-3" />
                                    <FilkaSkeleton width="100%" height={14} className="mb-2" />
                                    <FilkaSkeleton width="50%" height={14} />
                                </FilkaCard>
                            ))}
                        </div>
                    ) : spotlightOrders.length > 0 ? (
                        <div className="grid gap-3">
                            {spotlightOrders.slice(0, 4).map((order) => (
                                <Link key={order.id} href={`/dashboard/orders/${order.id}` as never} className="block">
                                    <FilkaCard className="p-5 transition-all hover:-translate-y-0.5">
                                        <div className="mb-3 flex gap-3">
                                            <FilkaAvatar
                                                name={order.title}
                                                size={40}
                                                rounded="md"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="mb-1 line-clamp-2 text-[15.5px] font-semibold tracking-[-0.01em]">
                                                    {order.title}
                                                </div>
                                                <div className="t-caption flex gap-2 text-[11px]">
                                                    <span>{order.category || "Без категории"}</span>
                                                    <span aria-hidden="true">·</span>
                                                    <span>{formatRelative(order.created_at)}</span>
                                                </div>
                                            </div>
                                            {role === "freelancer" ? (
                                                <FilkaChip>
                                                    <IconSpark size={11} />
                                                    {aiScoreById[order.id] ? `AI · ${aiScoreById[order.id]}%` : "AI-совпадение"}
                                                </FilkaChip>
                                            ) : null}
                                        </div>

                                        <div className="mb-4 flex flex-wrap gap-2">
                                            {(order.skill_tags ?? []).slice(0, 4).map((tag) => (
                                                <FilkaChip key={tag} tone="muted">
                                                    {tag}
                                                </FilkaChip>
                                            ))}
                                        </div>

                                        <div
                                            className="flex items-center gap-5 border-t pt-3 text-[13px]"
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
                                                <div className="t-caption">
                                                    {role === "freelancer" ? "Откликов" : "Статус"}
                                                </div>
                                                <div className="font-medium" style={{ color: "var(--fg-1)" }}>
                                                    {role === "freelancer"
                                                        ? order.proposals_count ?? 0
                                                        : order.status}
                                                </div>
                                            </div>
                                            <div className="ml-auto">
                                                <span className="filka-btn filka-btn-soft filka-btn-sm">
                                                    {role === "freelancer" ? "Откликнуться" : "Открыть"}
                                                    <IconArrowRight size={14} />
                                                </span>
                                            </div>
                                        </div>
                                    </FilkaCard>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <FilkaCard className="p-7 text-center">
                            <div
                                className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-[14px]"
                                style={{
                                    background: "rgba(102,58,243,0.1)",
                                    border: "1px solid rgba(102,58,243,0.18)",
                                    color: "var(--mint-300)",
                                }}
                            >
                                <IconBriefcase size={20} />
                            </div>
                            <div className="text-[16px] font-semibold">
                                {role === "freelancer"
                                    ? "Подходящих заказов пока нет"
                                    : "У вас пока нет активных заказов"}
                            </div>
                            <div className="mt-2 text-[13px]" style={{ color: "var(--fg-2)" }}>
                                {role === "freelancer"
                                    ? "AI-лента обновится, как только появятся новые релевантные задачи."
                                    : "Создайте первый заказ и платформа начнёт собирать отклики."}
                            </div>
                            {role === "client" ? (
                                <Link href="/dashboard/orders/new">
                                    <FilkaButton className="mt-4" variant="primary" endContent={<IconArrowRight size={14} />}>
                                        Создать заказ
                                    </FilkaButton>
                                </Link>
                            ) : null}
                        </FilkaCard>
                    )}
                </div>

                <div className="space-y-4">
                    <FilkaCard
                        className="relative overflow-hidden p-5"
                        glow
                        style={{
                            background: "linear-gradient(180deg,rgba(102,58,243,0.12),rgba(79,43,199,0.02))",
                            borderColor: "rgba(102,58,243,0.22)",
                        }}
                    >
                        <div className="absolute -right-12 -top-10 opacity-50">
                            <FilkaAISphere size={170} />
                        </div>
                        <div className="t-eyebrow mb-2">AI-АССИСТЕНТ</div>
                        <div className="mb-3 max-w-[210px] text-[18px] font-bold leading-[1.25] tracking-[-0.015em]">
                            {role === "client"
                                ? "Создайте заказ голосом за 40 секунд"
                                : "AI отберёт лучшие заказы под ваш профиль"}
                        </div>
                        <div
                            className="mb-4 max-w-[250px] text-[13px] leading-[1.5]"
                            style={{ color: "var(--fg-1)" }}
                        >
                            {role === "client"
                                ? "Опишите задачу — AI соберёт техзадание, оценит сроки и поможет с подбором исполнителей."
                                : "AI разберёт рынок, подсветит сильные совпадения и подготовит быстрые ответы для откликов."}
                        </div>
                        <Link href={role === "client" ? "/dashboard/orders/new" : "/dashboard/ai"}>
                            <FilkaButton size="sm" className="w-full">
                                {role === "client" ? "Открыть конструктор" : "Открыть AI-ассистента"}
                            </FilkaButton>
                        </Link>
                    </FilkaCard>

                    <FilkaCard className="p-4">
                        <div className="t-eyebrow mb-3">АКТИВНОСТЬ</div>
                        <div className="space-y-3">
                            {recentChats.length > 0 ? (
                                recentChats.map((conversation) => (
                                    <div key={conversation.id} className="flex gap-3">
                                        <div
                                            className="mt-2 h-1.5 w-1.5 rounded-full"
                                            style={{ background: "var(--mint-300)" }}
                                        />
                                        <div className="min-w-0 text-[13px] leading-[1.45]">
                                            <span className="font-semibold">
                                                {conversation.other_user?.display_name ?? "Диалог"}
                                            </span>{" "}
                                            <span style={{ color: "var(--fg-1)" }}>
                                                {conversation.last_message?.content ||
                                                    (role === "client"
                                                        ? "готов обсудить детали заказа"
                                                        : "оставил новое сообщение")}
                                            </span>
                                            <div className="t-caption mt-1 text-[11px]">
                                                {conversation.last_message?.created_at
                                                    ? formatRelative(conversation.last_message.created_at)
                                                    : "недавно"}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-[13px]" style={{ color: "var(--fg-2)" }}>
                                    Как только появятся диалоги и сделки, здесь появится живая активность.
                                </div>
                            )}
                        </div>
                    </FilkaCard>

                    <FilkaCard className="p-4">
                        <div className="mb-3 flex items-center gap-2">
                            <IconUsers size={15} className="text-[var(--mint-300)]" />
                            <span className="text-[13px] font-semibold">Профиль и присутствие</span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-[13px]">
                                <span style={{ color: "var(--fg-2)" }}>Заполненность</span>
                                <span className="font-semibold" style={{ color: "var(--mint-300)" }}>
                                    {profileProgress.percentage}%
                                </span>
                            </div>
                            <FilkaProgressBar value={profileProgress.percentage} />
                            <div className="flex items-center gap-2 text-[13px]">
                                <FilkaLiveDot />
                                <span>
                                    <strong>{onlineCount.toLocaleString("ru-RU")}</strong> онлайн сейчас
                                </span>
                            </div>
                            {profileProgress.missingSteps.length > 0 ? (
                                <div className="text-[12px] leading-[1.5]" style={{ color: "var(--fg-2)" }}>
                                    Следующий шаг: {profileProgress.missingSteps[0]}.
                                </div>
                            ) : (
                                <div className="text-[12px] leading-[1.5]" style={{ color: "var(--fg-2)" }}>
                                    Профиль выглядит полно и готов к выдаче.
                                </div>
                            )}
                        </div>
                    </FilkaCard>
                </div>
            </div>
        </div>
    );
};
