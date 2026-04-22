"use client";

import { useState, useCallback } from "react";
import { Card, CardBody, Avatar, Button, Link, Chip } from "@heroui/react";
import { FileText, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/shared/store/session.store";
import { useMyProposals, useUpdateProposalStatus } from "@/features/proposal-management";
import type { Proposal } from "@/shared/api/endpoints/proposals";
import { StatusBadge } from "@/shared/ui/status-badge/StatusBadge";
import { EmptyState } from "@/shared/ui/empty-state/EmptyState";
import { PageHeader } from "@/shared/ui/page-header/PageHeader";
import {
    InsufficientFundsModal,
    parseInsufficientFundsError,
    isInsufficientFundsError,
} from "@/shared/ui/insufficient-funds-modal/InsufficientFundsModal";


const formatCurrency = (value: number | null | undefined): string => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return "—";
    }
    return `₽${value.toLocaleString("ru-RU")}`;
};

const formatDays = (value: number | null | undefined): string => {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        return "срок не указан";
    }
    return `${value} дней`;
};

const formatTerm = (proposal: Proposal): string => {
    if (typeof proposal.estimated_days === "number" && Number.isFinite(proposal.estimated_days) && proposal.estimated_days > 0) {
        return `${proposal.estimated_days} дней`;
    }

    if (proposal.proposed_deadline) {
        const deadline = new Date(proposal.proposed_deadline);
        if (Number.isFinite(deadline.getTime())) {
            return `до ${deadline.toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            })}`;
        }
    }

    return "срок не указан";
};

const formatOrderBudget = (proposal: Proposal): string => {
    if (typeof proposal.order_budget_min === "number" && typeof proposal.order_budget_max === "number") {
        return `₽${proposal.order_budget_min.toLocaleString("ru-RU")} - ₽${proposal.order_budget_max.toLocaleString("ru-RU")}`;
    }
    return "Бюджет заказа не указан";
};

const formatOrderDeadline = (proposal: Proposal): string => {
    if (!proposal.order_deadline) return "Дедлайн заказа не указан";
    const d = new Date(proposal.order_deadline);
    if (!Number.isFinite(d.getTime())) return "Дедлайн заказа не указан";
    return `до ${d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
};

const groupByOrder = (items: Proposal[]): Array<{ orderId: string; orderTitle: string; items: Proposal[] }> => {
    const map = new Map<string, { orderId: string; orderTitle: string; items: Proposal[] }>();
    for (const item of items) {
        const orderId = item.order_id || "unknown-order";
        const orderTitle = item.order_title?.trim() || "Без названия заказа";
        const existing = map.get(orderId);
        if (existing) {
            existing.items.push(item);
        } else {
            map.set(orderId, { orderId, orderTitle, items: [item] });
        }
    }

    return [...map.values()].sort((a, b) => {
        const aTs = new Date(a.items[0]?.created_at ?? 0).getTime();
        const bTs = new Date(b.items[0]?.created_at ?? 0).getTime();
        return bTs - aTs;
    });
};

export const ProposalsPage = () => {
    const router = useRouter();
    const role = useSessionStore((s) => s.role);
    const currentRole = role === "client" ? "client" : "freelancer";
    const { data, isLoading } = useMyProposals(currentRole);
    const updateStatus = useUpdateProposalStatus();
    const proposals = data?.items ?? [];

    const heading = role === "client" ? "Отклики на заказы" : "Мои отклики";
    const subtitle = role === "client" ? "Управляйте откликами фрилансеров" : "Статусы ваших предложений";
    const groupedByOrder = role === "client" ? groupByOrder(proposals) : [];

    // InsufficientFundsModal state
    const [fundsModal, setFundsModal] = useState<{
        isOpen: boolean;
        available: number;
        required: number;
        retryOrderId: string;
        retryProposalId: string;
    }>({ isOpen: false, available: 0, required: 0, retryOrderId: "", retryProposalId: "" });

    const handleAcceptProposal = useCallback((orderId: string, proposalId: string) => {
        updateStatus.mutate(
            { orderId, proposalId, status: "accepted" },
            {
                onError: (error) => {
                    if (isInsufficientFundsError(error)) {
                        const parsed = parseInsufficientFundsError((error as Error).message);
                        setFundsModal({
                            isOpen: true,
                            available: parsed?.available ?? 0,
                            required: parsed?.required ?? 0,
                            retryOrderId: orderId,
                            retryProposalId: proposalId,
                        });
                    }
                },
            }
        );
    }, [updateStatus]);

    const handleDepositSuccess = useCallback(() => {
        if (fundsModal.retryOrderId && fundsModal.retryProposalId) {
            updateStatus.mutate({
                orderId: fundsModal.retryOrderId,
                proposalId: fundsModal.retryProposalId,
                status: "accepted",
            });
        }
    }, [fundsModal, updateStatus]);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <PageHeader title={heading} description={subtitle} />
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="glass-card rounded-2xl p-6 animate-pulse">
                        <div className="h-5 bg-zinc-800 rounded w-2/3 mb-3" />
                        <div className="h-4 bg-zinc-800 rounded w-full mb-2" />
                        <div className="h-4 bg-zinc-800 rounded w-1/2" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            <PageHeader title={heading} description={subtitle} />

            {proposals.length === 0 ? (
                <EmptyState
                    icon={<FileText size={24} />}
                    title={role === "client" ? "Пока нет откликов" : "Вы ещё не откликались"}
                    description={role === "client" ? "Опубликуйте заказ, чтобы получить отклики" : "Перейдите в маркетплейс и найдите подходящий заказ"}
                    action={
                        <Button
                            className="bg-emerald-600 text-white shadow-lg glow-sm hover:bg-emerald-500 transition-all font-medium"
                            onPress={() => router.push("/dashboard/orders")}
                        >
                            {role === "client" ? "Мои заказы" : "Маркетплейс"}
                        </Button>
                    }
                />
            ) : role === "client" ? (
                <div className="space-y-6">
                    {groupedByOrder.map((group, groupIdx) => (
                        <div key={group.orderId} className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <button
                                    type="button"
                                    className="text-left"
                                    onClick={() => router.push(`/dashboard/orders/${group.orderId}`)}
                                >
                                    <p className="text-sm text-zinc-500">Заказ</p>
                                    <p className="text-base font-semibold text-zinc-100 hover:text-emerald-400 transition-colors">
                                        {group.orderTitle}
                                    </p>
                                </button>
                                <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    {group.items.length} откликов
                                </span>
                            </div>
                            <div className="grid gap-4">
                                {group.items.map((p, i) => (
                                    <Card
                                        key={p.id}
                                        className="glass-card hover:border-emerald-500/20 transition-all duration-200 animate-fade-in-up"
                                        style={{ animationDelay: `${(groupIdx * 4 + i) * 60}ms` }}
                                    >
                                        <CardBody className="p-5">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <Avatar size="sm" showFallback classNames={{ base: "bg-emerald-600/20", icon: "text-emerald-400" }} />
                                                    <div>
                                                        <p className="text-sm font-medium text-zinc-200">{p.freelancer_name ?? "Фрилансер"}</p>
                                                        <p className="text-xs text-zinc-500">{formatCurrency(p.proposed_budget)} · {formatTerm(p)}</p>
                                                    </div>
                                                </div>
                                                <StatusBadge status={p.status} />
                                            </div>
                                            <p className="text-sm text-zinc-300 line-clamp-2 mb-3">{p.cover_letter}</p>
                                            {p.status === "pending" && (
                                                <div className="flex gap-2">
                                                    <Button size="sm" className="bg-green-600/20 text-green-400 border border-green-600/30" startContent={<Check size={14} />} onPress={() => handleAcceptProposal(p.order_id, p.id)}>
                                                        Принять
                                                    </Button>
                                                    <Button size="sm" className="bg-red-600/20 text-red-400 border border-red-600/30" startContent={<X size={14} />} onPress={() => updateStatus.mutate({ orderId: p.order_id, proposalId: p.id, status: "rejected" })}>
                                                        Отклонить
                                                    </Button>
                                                </div>
                                            )}
                                        </CardBody>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid gap-4">
                    {proposals.map((p, i) => (
                        <Card
                            key={p.id}
                            className="glass-card hover:border-emerald-500/20 transition-all duration-200 animate-fade-in-up"
                            style={{ animationDelay: `${i * 60}ms` }}
                        >
                            <CardBody className="p-5">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="min-w-0">
                                        <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Заказ</p>
                                        <Link href={`/dashboard/orders/${p.order_id}`} className="text-base font-semibold text-zinc-100 hover:text-emerald-400 block truncate">
                                            {p.order_title ?? `Заказ #${p.order_id.slice(0, 8)}`}
                                        </Link>
                                        <p className="text-xs text-zinc-500 mt-1">{formatOrderBudget(p)} · {formatOrderDeadline(p)}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                                        <StatusBadge status={p.status} />
                                        {p.order_status && (
                                            <Chip size="sm" variant="flat" className="text-zinc-400 bg-zinc-800/70 border border-zinc-700/60">
                                                Статус заказа: {p.order_status}
                                            </Chip>
                                        )}
                                    </div>
                                </div>
                                <div className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-3 mb-3">
                                    <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Ваше предложение</p>
                                    <p className="text-xs text-zinc-400 mb-2">{formatCurrency(p.proposed_budget)} · {formatTerm(p)}</p>
                                    <p className="text-sm text-zinc-300 line-clamp-3">{p.cover_letter}</p>
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}

            <InsufficientFundsModal
                isOpen={fundsModal.isOpen}
                onClose={() => setFundsModal((prev) => ({ ...prev, isOpen: false }))}
                availableBalance={fundsModal.available}
                requiredAmount={fundsModal.required}
                onDepositSuccess={handleDepositSuccess}
            />
        </div>
    );
};
