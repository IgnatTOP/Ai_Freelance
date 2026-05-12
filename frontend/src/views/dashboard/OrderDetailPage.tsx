"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionStore } from "@/shared/store/session.store";
import { profileApi } from "@/shared/api/endpoints/profile";
import { useOrderDetail, usePublishOrder, useDeleteOrder } from "@/features/order-management";
import {
    useMyOrderProposal,
    useOrderProposals,
    useSubmitProposal,
    useUpdateProposalStatus,
} from "@/features/proposal-management";
import { useBalance, useEscrowStatus, useReleaseEscrow } from "@/features/balance-management";
import { apiClient } from "@/shared/api/client";
import {
    InsufficientFundsModal,
    isInsufficientFundsError,
    parseInsufficientFundsError,
} from "@/shared/ui/insufficient-funds-modal/InsufficientFundsModal";
import { StatusBadge } from "@/shared/ui/status-badge/StatusBadge";
import { formatMoney } from "@/shared/lib/money";
import {
    FilkaAISphere,
    FilkaAvatar,
    FilkaButton,
    FilkaCard,
    FilkaChip,
    FilkaField,
    FilkaInput,
    FilkaModal,
    FilkaModalBody,
    FilkaModalFooter,
    FilkaModalHeader,
    FilkaModalTitle,
    FilkaProgressBar,
    FilkaSegmented,
    FilkaSpinner,
    FilkaTabs,
    FilkaTextarea,
    IconArrowRight,
    IconCheck,
    IconChat,
    IconClock,
    IconShield,
    IconSpark,
    IconStar,
    IconTrash,
    useFilkaToast,
} from "@/shared/ui/filka";

interface OrderDetailPageProps {
    readonly orderId: string;
}

const STATUS_TIMELINE = [
    { id: "draft", label: "Черновик", percent: 5 },
    { id: "published", label: "Опубликован", percent: 25 },
    { id: "in_progress", label: "В работе", percent: 65 },
    { id: "completed", label: "Завершён", percent: 100 },
] as const;

const formatDeadline = (dateString: string): string => {
    if (!dateString) return "без срока";
    const date = new Date(dateString);
    if (!Number.isFinite(date.getTime())) return "без срока";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(date);
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / 86_400_000);
    if (diffDays <= 0) return "сегодня";
    if (diffDays === 1) return "1 день";
    if (diffDays < 5) return `${diffDays} дня`;
    return `${diffDays} дней`;
};

const formatRelative = (dateString: string): string => {
    const date = new Date(dateString);
    if (!Number.isFinite(date.getTime())) return "недавно";
    const diffMin = Math.floor((Date.now() - date.getTime()) / 60_000);
    if (diffMin < 60) return diffMin <= 0 ? "только что" : `${diffMin} мин назад`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} ч назад`;
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
};

export const OrderDetailPage = ({ orderId }: OrderDetailPageProps) => {
    const router = useRouter();
    const queryClient = useQueryClient();
    const role = useSessionStore((s) => s.role);
    const userId = useSessionStore((s) => s.userId);
    const toast = useFilkaToast();
    const { data: order, isLoading } = useOrderDetail(orderId);
    const { data: clientProfile } = useQuery({
        queryKey: ["profile", "public", order?.client_id],
        queryFn: () => profileApi.getPublicProfile(order?.client_id ?? ""),
        enabled: Boolean(order?.client_id),
        retry: false,
    });
    const isClient = role === "client" && order?.client_id === userId;
    const isFreelancer = role === "freelancer";
    const { data: proposalsData } = useOrderProposals(orderId, Boolean(isClient));
    const { data: myProposalData } = useMyOrderProposal(orderId, isFreelancer);
    const submitProposal = useSubmitProposal();
    const updateStatus = useUpdateProposalStatus();
    const publish = usePublishOrder();
    const remove = useDeleteOrder();
    const releaseEscrow = useReleaseEscrow();
    const { data: escrow } = useEscrowStatus(orderId);
    const { data: balance } = useBalance();

    const [proposalOpen, setProposalOpen] = useState(false);
    const [coverLetter, setCoverLetter] = useState("");
    const [proposedBudget, setProposedBudget] = useState("");
    const [estimatedDays, setEstimatedDays] = useState("");
    const [isAiWriting, setIsAiWriting] = useState(false);
    const [insufficient, setInsufficient] = useState<{ available: number; required: number } | null>(null);
    const [pendingAcceptProposalId, setPendingAcceptProposalId] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<"match" | "price" | "deadline">("match");
    const [tab, setTab] = useState<"proposals" | "details">("proposals");

    const proposals = useMemo(() => {
        const list = [...(proposalsData?.items ?? [])];
        switch (sortBy) {
            case "price":
                list.sort((a, b) => a.proposed_budget - b.proposed_budget);
                break;
            case "deadline":
                list.sort((a, b) => a.estimated_days - b.estimated_days);
                break;
            case "match":
            default:
                list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                break;
        }
        return list;
    }, [proposalsData?.items, sortBy]);

    const myProposal = useMemo(
        () => myProposalData ?? (proposalsData?.items ?? []).find((p) => p.freelancer_id === userId) ?? null,
        [myProposalData, proposalsData?.items, userId],
    );

    const bestId = proposalsData?.best_recommendation?.proposal_id;
    const visibleProposalCount = Math.max(order?.proposals_count ?? 0, proposals.length);
    const currentStatusIdx = STATUS_TIMELINE.findIndex((s) => s.id === order?.status);
    const escrowPercent =
        order?.status === "completed"
            ? 100
            : order?.status === "in_progress"
              ? 65
              : order?.status === "published"
                ? 25
                : 0;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <FilkaSpinner size={28} />
            </div>
        );
    }

    if (!order) {
        return (
            <FilkaCard className="px-6 py-12 text-center">
                <h2 className="t-h3 mb-2">Заказ не найден</h2>
                <p className="t-body-sm" style={{ color: "var(--fg-2)" }}>
                    Возможно, он был удалён или ссылка устарела.
                </p>
                <Link href="/dashboard/orders" className="mt-5 inline-flex">
                    <FilkaButton size="sm">К списку заказов</FilkaButton>
                </Link>
            </FilkaCard>
        );
    }

    const handleSubmitProposal = async () => {
        if (!coverLetter.trim() || !proposedBudget || !estimatedDays) {
            toast.warn("Заполните все поля отклика");
            return;
        }
        try {
            await submitProposal.mutateAsync({
                orderId,
                input: {
                    cover_letter: coverLetter.trim(),
                    proposed_budget: Number(proposedBudget),
                    estimated_days: Number(estimatedDays),
                },
            });
            toast.success("Отклик отправлен");
            setProposalOpen(false);
            setCoverLetter("");
            setProposedBudget("");
            setEstimatedDays("");
        } catch (e) {
            toast.error("Не удалось отправить отклик", e instanceof Error ? e.message : undefined);
        }
    };

    const handleAccept = async (proposalId: string) => {
        try {
            await updateStatus.mutateAsync({ orderId, proposalId, status: "accepted" });
            setPendingAcceptProposalId(null);
            toast.success("Отклик принят", "Эскроу зарезервирован");
        } catch (e) {
            if (isInsufficientFundsError(e)) {
                const parsed = parseInsufficientFundsError((e as Error).message);
                setPendingAcceptProposalId(proposalId);
                setInsufficient(parsed ?? {
                    available: balance?.available ?? 0,
                    required: order?.budget_max ?? order?.budget_min ?? 0,
                });
                return;
            }
            const message = e instanceof Error ? e.message : "";
            toast.error(
                "Не удалось принять отклик",
                /repository|sql|destination|updated_at|conversation/i.test(message)
                    ? "Обновите страницу и повторите действие"
                    : message || undefined,
            );
        }
    };

    const handleReject = async (proposalId: string) => {
        if (typeof window !== "undefined" && !window.confirm("Отклонить этот отклик?")) return;
        try {
            await updateStatus.mutateAsync({ orderId, proposalId, status: "rejected" });
            toast.info("Отклик отклонён");
        } catch (e) {
            toast.error("Не удалось отклонить", e instanceof Error ? e.message : undefined);
        }
    };

    const handlePublishOrder = async () => {
        try {
            await publish.mutateAsync(orderId);
            toast.success("Заказ опубликован");
        } catch (e) {
            toast.error("Не удалось опубликовать", e instanceof Error ? e.message : undefined);
        }
    };

    const handleDelete = async () => {
        if (typeof window !== "undefined" && !window.confirm("Удалить заказ безвозвратно?")) return;
        try {
            await remove.mutateAsync(orderId);
            toast.success("Заказ удалён");
            router.replace("/dashboard/orders" as never);
        } catch (e) {
            toast.error("Не удалось удалить", e instanceof Error ? e.message : undefined);
        }
    };

    const handleOpenChat = async () => {
        try {
            const conv = await apiClient.request<{ id: string }>(`/orders/${orderId}/chat`, { method: "GET" });
            router.push(`/dashboard/messages/${conv.id}` as never);
        } catch {
            toast.error("Чат пока недоступен");
        }
    };

    const handleCompleteByFreelancer = async () => {
        try {
            await apiClient.request<unknown>(`/orders/${orderId}/complete-by-freelancer`, { method: "POST" });
            await queryClient.invalidateQueries({ queryKey: ["orders", orderId] });
            await queryClient.invalidateQueries({ queryKey: ["orders"] });
            toast.success("Работа отправлена на приёмку");
        } catch (e) {
            toast.error("Не удалось завершить", e instanceof Error ? e.message : undefined);
        }
    };

    const handleReleaseEscrow = async () => {
        if (typeof window !== "undefined" && !window.confirm("Подтвердить выполнение и выплатить исполнителю?")) return;
        try {
            await releaseEscrow.mutateAsync(orderId);
            toast.success("Эскроу выплачен исполнителю");
        } catch (e) {
            toast.error("Не удалось выполнить", e instanceof Error ? e.message : undefined);
        }
    };

    const handleAIHelp = async () => {
        setIsAiWriting(true);
        try {
            const prompt = `Ты помогаешь фрилансеру написать отклик на заказ. Заказ: "${order.title}". Описание: "${(order.description ?? "").slice(0, 400)}". Бюджет: ${formatMoney(order.budget_min ?? 0)}–${formatMoney(order.budget_max ?? 0)}. Напиши короткий конкретный текст отклика (3-4 предложения) от первого лица. Только текст, без заголовков.`;
            const data = await apiClient.request<{ response?: string; data?: { response?: string } }>("/ai/assistant", {
                method: "POST",
                body: JSON.stringify({ message: prompt }),
            });
            const text = data.response ?? data.data?.response ?? "";
            if (text) setCoverLetter(text);
        } catch {
            toast.warn("Не удалось сгенерировать текст");
        } finally {
            setIsAiWriting(false);
        }
    };

    return (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-w-0 flex-col gap-5">
                <FilkaCard className="p-6">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        <StatusBadge status={order.status} />
                        <FilkaChip tone="muted">{order.category || "Без категории"}</FilkaChip>
                        <span className="t-caption ml-auto">опубликовано {formatRelative(order.created_at)}</span>
                    </div>
                    <h1 className="t-h2 mb-4">{order.title}</h1>
                    <p className="t-body whitespace-pre-wrap" style={{ color: "var(--fg-1)" }}>
                        {order.description}
                    </p>

                    <div
                        className="mt-6 grid grid-cols-2 gap-3 border-t pt-4 lg:grid-cols-4"
                        style={{ borderColor: "var(--line)" }}
                    >
                        <div>
                            <div className="t-caption">Бюджет</div>
                            <div className="text-[20px] font-bold tracking-[-0.01em]">
                                {formatMoney(order.budget_min)} – {formatMoney(order.budget_max)}
                            </div>
                        </div>
                        <div>
                            <div className="t-caption">Срок</div>
                            <div className="text-[16px] font-semibold">{formatDeadline(order.deadline)}</div>
                        </div>
                        <div>
                            <div className="t-caption">Откликов</div>
                            <div className="text-[16px] font-semibold">{visibleProposalCount}</div>
                        </div>
                        <div>
                            <div className="t-caption">AI-совпадений</div>
                            <div className="text-[16px] font-semibold" style={{ color: "var(--mint-300)" }}>
                                {bestId ? "1 топ" : "—"}
                            </div>
                        </div>
                    </div>

                    {(order.skill_tags ?? []).length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {(order.skill_tags ?? []).map((tag) => (
                                <FilkaChip key={tag} tone="muted">
                                    {tag}
                                </FilkaChip>
                            ))}
                        </div>
                    ) : null}

                    {order.status === "cancelled" ? (
                        <div
                            className="mt-4 rounded-[12px] border px-4 py-3 text-[13px] font-medium"
                            style={{ borderColor: "rgba(248,113,113,0.35)", background: "rgba(248,113,113,0.07)", color: "var(--err)" }}
                        >
                            Заказ отменён — принятие откликов и новые сообщения недоступны.
                        </div>
                    ) : order.status === "completed" && escrow?.status === "released" ? (
                        <div
                            className="mt-4 rounded-[12px] border px-4 py-3 text-[13px] font-medium"
                            style={{ borderColor: "rgba(54,211,153,0.3)", background: "rgba(54,211,153,0.07)", color: "var(--mint-300)" }}
                        >
                            ✓ Заказ завершён — работа принята и оплачена.
                        </div>
                    ) : null}

                    <div
                        className="mt-6 flex flex-wrap gap-2 border-t pt-4"
                        style={{ borderColor: "var(--line)" }}
                    >
                        {isFreelancer ? (
                            myProposal ? (
                                <FilkaButton variant="ghost" disabled>
                                    Отклик отправлен · {myProposal.status}
                                </FilkaButton>
                            ) : order.status === "published" ? (
                                <FilkaButton variant="primary" onClick={() => setProposalOpen(true)} endContent={<IconArrowRight size={14} />}>
                                    Откликнуться
                                </FilkaButton>
                            ) : null
                        ) : null}

                        {isFreelancer && order.status === "in_progress" && myProposal?.status === "accepted" ? (
                            <FilkaButton variant="primary" onClick={handleCompleteByFreelancer} startContent={<IconCheck size={14} />}>
                                Сдать работу
                            </FilkaButton>
                        ) : null}

                        {isClient && order.status === "draft" ? (
                            <FilkaButton variant="primary" onClick={handlePublishOrder} loading={publish.isPending}>
                                Опубликовать <IconArrowRight size={14} />
                            </FilkaButton>
                        ) : null}

                        {isClient && ["in_progress", "completed"].includes(order.status) && escrow?.status !== "released" ? (
                            <FilkaButton
                                variant="primary"
                                onClick={handleReleaseEscrow}
                                loading={releaseEscrow.isPending}
                                startContent={<IconCheck size={14} />}
                            >
                                Принять работу и выплатить
                            </FilkaButton>
                        ) : null}

                        {["in_progress", "completed"].includes(order.status) ? (
                            <FilkaButton variant="ghost" onClick={handleOpenChat} startContent={<IconChat size={14} />}>
                                Открыть чат
                            </FilkaButton>
                        ) : null}

                        {isClient && (order.status === "draft" || order.status === "cancelled") ? (
                            <FilkaButton
                                variant="ghost"
                                onClick={handleDelete}
                                startContent={<IconTrash size={14} />}
                                className="ml-auto"
                            >
                                Удалить
                            </FilkaButton>
                        ) : null}
                    </div>
                </FilkaCard>

                {bestId ? (
                    <FilkaCard
                        glow
                        className="relative overflow-hidden p-5"
                        style={{
                            background: "linear-gradient(135deg, rgba(102,58,243,0.10), rgba(79,43,199,0.04))",
                            borderColor: "rgba(102,58,243,0.32)",
                        }}
                    >
                        <div className="absolute -right-8 -top-8 opacity-40">
                            <FilkaAISphere size={150} />
                        </div>
                        <div className="t-eyebrow mb-2">AI-рекомендация</div>
                        <div className="mb-1 max-w-[420px] text-[16px] font-semibold">
                            {proposalsData?.best_recommendation?.justification ??
                                "AI выделил наиболее подходящий отклик"}
                        </div>
                        {typeof proposalsData?.best_recommendation?.score === "number" ? (
                            <div className="mt-2 max-w-[300px]">
                                <FilkaProgressBar value={proposalsData.best_recommendation.score} max={100} />
                                <div className="t-mono mt-1 text-xs" style={{ color: "var(--mint-300)" }}>
                                    {proposalsData.best_recommendation.score}% совпадение
                                </div>
                            </div>
                        ) : null}
                    </FilkaCard>
                ) : null}

                <FilkaTabs
                    value={tab}
                    onChange={setTab}
                    items={[
                        { id: "proposals", label: `Отклики · ${proposals.length}` },
                        { id: "details", label: "Подробности" },
                    ]}
                />

                {tab === "proposals" ? (
                    <FilkaCard className="p-5">
                        <div className="mb-4 flex flex-wrap items-center gap-3">
                            <h3 className="t-h4 m-0">Все отклики</h3>
                            <FilkaChip>{proposals.length}</FilkaChip>
                            <div className="ml-auto">
                                <FilkaSegmented
                                    value={sortBy}
                                    onChange={setSortBy}
                                    items={[
                                        { id: "match", label: "По AI" },
                                        { id: "price", label: "По цене" },
                                        { id: "deadline", label: "По сроку" },
                                    ]}
                                />
                            </div>
                        </div>

                        {proposals.length === 0 ? (
                            <div className="py-8 text-center text-sm" style={{ color: "var(--fg-2)" }}>
                                Откликов пока нет — поделитесь ссылкой или дайте AI ещё немного времени.
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {proposals.map((p) => {
                                    const isBest = p.id === bestId;
                                    return (
                                        <div
                                            key={p.id}
                                            className="flex flex-col gap-3 rounded-[var(--r-lg)] border p-4 sm:flex-row"
                                            style={{
                                                background: isBest
                                                    ? "rgba(102,58,243,0.06)"
                                                    : "var(--bg-1)",
                                                borderColor: isBest
                                                    ? "rgba(102,58,243,0.32)"
                                                    : "var(--line)",
                                            }}
                                        >
                                            <FilkaAvatar
                                                name={p.freelancer_name ?? "Исполнитель"}
                                                size={42}
                                                rounded="full"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {isBest ? <FilkaChip>Лучшее совпадение AI</FilkaChip> : null}
                                                    <Link
                                                        href={`/dashboard/profile/${p.freelancer_id}` as never}
                                                        className="font-semibold hover:text-[var(--mint-300)]"
                                                    >
                                                        {p.freelancer_name ?? "Исполнитель"}
                                                    </Link>
                                                    <StatusBadge status={p.status} />
                                                    <span className="t-caption ml-auto">
                                                        {formatRelative(p.created_at)}
                                                    </span>
                                                </div>
                                                <p
                                                    className="mt-2 text-[13.5px] leading-[1.5]"
                                                    style={{ color: "var(--fg-1)" }}
                                                >
                                                    {p.cover_letter}
                                                </p>
                                                <div className="mt-3 flex flex-wrap items-center gap-4 text-[13px]">
                                                    <div>
                                                        <span className="t-caption">Цена</span>
                                                        <div className="font-bold">
                                                            {formatMoney(p.proposed_budget)}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="t-caption">Срок</span>
                                                        <div className="font-medium">
                                                            <IconClock size={12} className="inline" /> {p.estimated_days || "—"} дн.
                                                        </div>
                                                    </div>
                                                    <div className="ml-auto flex flex-wrap gap-2">
                                                        {isClient && order.status === "published" ? (
                                                            <>
                                                                <FilkaButton
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleReject(p.id)}
                                                                    loading={updateStatus.isPending}
                                                                >
                                                                    Отклонить
                                                                </FilkaButton>
                                                                <FilkaButton
                                                                    size="sm"
                                                                    variant="primary"
                                                                    onClick={() => handleAccept(p.id)}
                                                                    loading={updateStatus.isPending}
                                                                    startContent={<IconCheck size={12} />}
                                                                >
                                                                    Принять
                                                                </FilkaButton>
                                                            </>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </FilkaCard>
                ) : (
                    <FilkaCard className="p-5">
                        <h3 className="t-h4 mb-3">Подробности заказа</h3>
                        <div className="space-y-3 text-[14px]" style={{ color: "var(--fg-1)" }}>
                            <div className="flex justify-between">
                                <span style={{ color: "var(--fg-2)" }}>Идентификатор</span>
                                <span className="t-mono">{order.id}</span>
                            </div>
                            <div className="flex justify-between">
                                <span style={{ color: "var(--fg-2)" }}>Создан</span>
                                <span>{new Date(order.created_at).toLocaleString("ru-RU")}</span>
                            </div>
                            <div className="flex justify-between">
                                <span style={{ color: "var(--fg-2)" }}>Обновлён</span>
                                <span>{new Date(order.updated_at).toLocaleString("ru-RU")}</span>
                            </div>
                            <div className="flex justify-between">
                                <span style={{ color: "var(--fg-2)" }}>Срок</span>
                                <span>{formatDeadline(order.deadline)}</span>
                            </div>
                        </div>
                    </FilkaCard>
                )}
            </div>

            <div className="space-y-4">
                <FilkaCard className="p-5">
                    <div className="t-eyebrow mb-3 flex items-center gap-2">
                        <IconShield size={12} /> Эскроу
                    </div>
                    <div className="text-[24px] font-bold tracking-[-0.02em]">
                        {escrow ? formatMoney(escrow.amount) : formatMoney(order.budget_max || order.budget_min || 0)}
                    </div>
                    <div className="t-caption mb-4">
                        {escrow?.status === "held"
                            ? "заморожено"
                            : escrow?.status === "released"
                              ? "выплачено"
                              : escrow?.status === "refunded"
                                ? "возвращено"
                                : "будет заморожено при принятии отклика"}
                    </div>
                    <FilkaProgressBar value={escrowPercent} />
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                        {STATUS_TIMELINE.map((step, i) => {
                            const reached = currentStatusIdx >= i;
                            return (
                                <div key={step.id} className="flex items-center gap-1.5">
                                    <span
                                        className="grid h-4 w-4 place-items-center rounded-full text-[8px] font-bold"
                                        style={{
                                            background: reached ? "var(--mint-400)" : "var(--bg-3)",
                                            color: reached ? "#062219" : "var(--fg-3)",
                                        }}
                                    >
                                        {reached ? "✓" : i + 1}
                                    </span>
                                    <span style={{ color: reached ? "var(--fg-0)" : "var(--fg-3)" }}>
                                        {step.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </FilkaCard>

                <FilkaCard className="p-5">
                    <div className="t-eyebrow mb-3">Заказчик</div>
                    <div className="flex items-center gap-3">
                        <FilkaAvatar size={44} rounded="full" />
                        <div className="min-w-0 flex-1">
                            <Link
                                href={`/dashboard/profile/${order.client_id}` as never}
                                className="block truncate text-[15px] font-semibold hover:text-[var(--mint-300)]"
                            >
                                {clientProfile?.name ?? "Заказчик"}
                            </Link>
                            <div className="t-caption flex items-center gap-1 text-[11px]">
                                <IconStar size={11} style={{ color: "var(--accent-sun)" }} /> 4.92 · 38 заказов
                            </div>
                        </div>
                    </div>
                </FilkaCard>

                <FilkaCard className="p-5">
                    <div className="mb-3 flex items-center gap-2">
                        <IconSpark size={14} className="text-[var(--mint-300)]" />
                        <div className="t-eyebrow">AI-совет</div>
                    </div>
                    <p className="text-[13px] leading-[1.5]" style={{ color: "var(--fg-1)" }}>
                        {isClient
                            ? "Принимайте отклики с лучшим AI-совпадением — это сократит время поиска и риски споров."
                            : "Чтобы повысить шанс принятия, добавьте релевантный кейс из портфолио в текст отклика."}
                    </p>
                </FilkaCard>
            </div>

            <FilkaModal
                open={proposalOpen}
                onClose={() => setProposalOpen(false)}
                size="xl"
            >
                <FilkaModalHeader>
                    <FilkaModalTitle>Отклик на заказ</FilkaModalTitle>
                </FilkaModalHeader>
                <FilkaModalBody className="p-0">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px]">
                        <div className="flex flex-col gap-4 p-5">
                            <FilkaField label="Сопроводительное письмо">
                                <div className="relative">
                                    <FilkaTextarea
                                        autoFocus
                                        value={coverLetter}
                                        onChange={(e) => setCoverLetter(e.target.value)}
                                        rows={7}
                                        placeholder="Расскажите, почему вы подходите. Кратко и по делу."
                                        disabled={isAiWriting}
                                    />
                                    {isAiWriting ? (
                                        <div className="absolute inset-0 flex items-center justify-center rounded-[12px] bg-[var(--bg-1)] opacity-80">
                                            <FilkaSpinner size={20} />
                                        </div>
                                    ) : null}
                                </div>
                                <FilkaButton
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2"
                                    loading={isAiWriting}
                                    startContent={!isAiWriting ? <IconSpark size={13} /> : undefined}
                                    onClick={handleAIHelp}
                                >
                                    {isAiWriting ? "Генерирую текст…" : "Помоги написать отклик"}
                                </FilkaButton>
                            </FilkaField>
                            <div className="grid grid-cols-2 gap-3">
                                <FilkaField label="Ваша цена, ₽">
                                    <FilkaInput
                                        type="number"
                                        inputMode="numeric"
                                        value={proposedBudget}
                                        onChange={(e) => setProposedBudget(e.target.value)}
                                        placeholder={String(order.budget_max || order.budget_min || "")}
                                    />
                                </FilkaField>
                                <FilkaField label="Срок, дней">
                                    <FilkaInput
                                        type="number"
                                        inputMode="numeric"
                                        value={estimatedDays}
                                        onChange={(e) => setEstimatedDays(e.target.value)}
                                        placeholder="14"
                                    />
                                </FilkaField>
                            </div>
                        </div>

                        <div
                            className="hidden flex-col gap-3 overflow-y-auto border-l p-5 lg:flex"
                            style={{ borderColor: "var(--line)", background: "var(--bg-1)", maxHeight: 480 }}
                        >
                            <div className="t-eyebrow">Заказ</div>
                            <div className="text-[15px] font-bold leading-[1.3]">{order.title}</div>
                            {order.category ? (
                                <FilkaChip tone="muted" className="w-fit text-[11px]">{order.category}</FilkaChip>
                            ) : null}
                            <p className="line-clamp-8 text-[12.5px] leading-[1.55]" style={{ color: "var(--fg-2)" }}>
                                {order.description}
                            </p>
                            <div className="flex flex-wrap gap-3 pt-1 text-[13px]">
                                <div>
                                    <div className="t-caption">Бюджет</div>
                                    <div className="font-semibold">{formatMoney(order.budget_min ?? 0)} – {formatMoney(order.budget_max ?? 0)}</div>
                                </div>
                                <div>
                                    <div className="t-caption">Срок</div>
                                    <div className="font-semibold">{formatDeadline(order.deadline)}</div>
                                </div>
                            </div>
                            {(order.skill_tags ?? []).length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {(order.skill_tags ?? []).map((tag) => (
                                        <FilkaChip key={tag} tone="muted" className="text-[11px]">{tag}</FilkaChip>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </FilkaModalBody>
                <FilkaModalFooter>
                    <FilkaButton variant="ghost" onClick={() => setProposalOpen(false)}>
                        Отмена
                    </FilkaButton>
                    <FilkaButton
                        variant="primary"
                        onClick={handleSubmitProposal}
                        loading={submitProposal.isPending}
                    >
                        Отправить отклик
                    </FilkaButton>
                </FilkaModalFooter>
            </FilkaModal>

            {insufficient ? (
                <InsufficientFundsModal
                    isOpen={insufficient !== null}
                    onClose={() => setInsufficient(null)}
                    availableBalance={insufficient.available}
                    requiredAmount={insufficient.required}
                    onDepositSuccess={() => {
                        setInsufficient(null);
                        if (pendingAcceptProposalId) {
                            void handleAccept(pendingAcceptProposalId);
                        }
                    }}
                />
            ) : null}
        </div>
    );
};
