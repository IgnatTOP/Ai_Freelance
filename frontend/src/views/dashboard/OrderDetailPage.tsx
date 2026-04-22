"use client";

import { useState, useMemo } from "react";
import { Button, Card, CardBody, Chip, Textarea, Input, Avatar, Divider, Progress, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/react";
import {
    ArrowLeft, Send, Check, X, MessageSquare, Calendar, Tag, Wallet,
    Clock, Sparkles, Pencil, Save, Search, Users, Timer,
    ArrowUpDown, ChevronDown, ChevronUp, Zap, Shield, Star,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/shared/store/session.store";
import { apiClient } from "@/shared/api/client";
import { useOrderDetail, useUpdateOrder } from "@/features/order-management";
import { useMyProposals, useOrderProposals, useSubmitProposal, useUpdateProposalStatus } from "@/features/proposal-management";
import { StatusBadge } from "@/shared/ui/status-badge/StatusBadge";
import {
    InsufficientFundsModal,
    parseInsufficientFundsError,
    isInsufficientFundsError,
} from "@/shared/ui/insufficient-funds-modal/InsufficientFundsModal";

interface OrderDetailPageProps {
    readonly orderId: string;
}

/* ── Status timeline ── */
const STATUS_FLOW = [
    { key: "draft", label: "Черновик" },
    { key: "published", label: "Опубликован" },
    { key: "in_progress", label: "В работе" },
    { key: "completed", label: "Завершён" },
];

const OrderTimeline = ({ currentStatus }: { currentStatus: string }) => {
    const currentIdx = STATUS_FLOW.findIndex((s) => s.key === currentStatus);
    const isCancelled = currentStatus === "cancelled";

    return (
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {STATUS_FLOW.map((step, i) => {
                const isPast = i <= currentIdx && !isCancelled;
                const isCurrent = i === currentIdx && !isCancelled;
                return (
                    <div key={step.key} className="flex items-center shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${isCurrent
                                    ? "bg-purple-600 text-white shadow-lg shadow-purple-500/40 ring-2 ring-purple-500/20 ring-offset-2 ring-offset-zinc-950"
                                    : isPast
                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                        : "bg-zinc-800/60 text-zinc-600 border border-zinc-700/40"
                                    }`}>
                                    {isPast && !isCurrent ? <Check size={12} /> : i + 1}
                                </div>
                                {isCurrent && (
                                    <span className="absolute inset-0 rounded-full bg-purple-500/30 animate-ping" />
                                )}
                            </div>
                            <span className={`text-xs font-medium transition-colors ${isCurrent ? "text-purple-300" : isPast ? "text-zinc-300" : "text-zinc-600"}`}>
                                {step.label}
                            </span>
                        </div>
                        {i < STATUS_FLOW.length - 1 && (
                            <div className={`w-10 h-0.5 mx-2 rounded-full transition-colors ${isPast ? "bg-gradient-to-r from-emerald-500/40 to-emerald-500/10" : "bg-zinc-800/60"}`} />
                        )}
                    </div>
                );
            })}
            {isCancelled && (
                <div className="flex items-center gap-2 ml-2">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center">
                        <X size={12} />
                    </div>
                    <span className="text-xs font-medium text-red-400">Отменён</span>
                </div>
            )}
        </div>
    );
};

const formatCurrency = (value: number | null | undefined): string => {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "—";
    return `₽${value.toLocaleString("ru-RU")}`;
};

const formatDays = (value: number | null | undefined): string => {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "—";
    return `${value} дн`;
};

const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
};

const getDaysUntilDeadline = (deadline: string | null | undefined): number | null => {
    if (!deadline) return null;
    const diff = new Date(deadline).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/* ── Waiting for proposals animation ── */
const WaitingForProposals = () => (
    <div className="relative py-12 px-4">
        {/* Radar animation */}
        <div className="flex flex-col items-center justify-center relative">
            <div className="relative w-28 h-28 mb-8">
                {/* Radar rings */}
                <div className="absolute inset-0 rounded-full border border-purple-500/20 animate-radar-ping" />
                <div className="absolute inset-0 rounded-full border border-purple-500/15 animate-radar-ping-delay" />
                <div className="absolute inset-0 rounded-full border border-purple-500/10 animate-radar-ping-delay-2" />
                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-lg shadow-purple-500/10">
                        <Search size={24} className="text-purple-400" />
                    </div>
                </div>
            </div>

            <h3 className="text-lg font-semibold text-white mb-2">Ищем исполнителей</h3>
            <p className="text-sm text-zinc-400 mb-1 flex items-center gap-1">
                Ваш заказ виден исполнителям
                <span className="inline-flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-purple-400 animate-typing-dot-1" />
                    <span className="w-1 h-1 rounded-full bg-purple-400 animate-typing-dot-2" />
                    <span className="w-1 h-1 rounded-full bg-purple-400 animate-typing-dot-3" />
                </span>
            </p>
            <p className="text-xs text-zinc-600 mb-8">Обычно первые отклики приходят в течение 1–2 часов</p>

            {/* Shimmer placeholder cards */}
            <div className="w-full max-w-md space-y-3">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className="glass-card rounded-xl p-4 animate-fade-in-up"
                        style={{ animationDelay: `${i * 150}ms`, opacity: 1 - i * 0.25 }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-zinc-800 shimmer" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3.5 bg-zinc-800 rounded-lg w-2/5 shimmer" />
                                <div className="h-3 bg-zinc-800 rounded-lg w-4/5 shimmer" />
                            </div>
                            <div className="h-6 w-16 bg-zinc-800 rounded-full shimmer" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

/* ── AI Recommendation Hero Card ── */
const AIRecommendationCard = ({
    bestRecommendation,
    proposals,
}: {
    bestRecommendation: { proposal_id: string; justification: string; score?: number };
    proposals: { id: string; freelancer_name?: string }[];
}) => {
    const bestProposal = proposals.find((p) => p.id === bestRecommendation.proposal_id);

    return (
        <div className="relative rounded-2xl overflow-hidden animate-fade-in-up">
            {/* Animated gradient border */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-600/40 via-indigo-500/40 to-fuchsia-500/40 animate-gradient-border" />
            <div className="m-[1px] rounded-2xl bg-zinc-950/90 backdrop-blur-xl p-5">
                <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border border-purple-500/20 flex items-center justify-center shrink-0">
                        <Sparkles size={20} className="text-purple-300 animate-sparkle" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-bold text-purple-200">AI-рекомендация</h3>
                            {bestRecommendation.score != null && (
                                <Chip size="sm" classNames={{ base: "bg-purple-500/15 border border-purple-500/25", content: "text-purple-300 text-xs font-bold" }}>
                                    {bestRecommendation.score}% совпадение
                                </Chip>
                            )}
                        </div>
                        {bestProposal?.freelancer_name && (
                            <p className="text-xs text-purple-400/70 mb-2">
                                Лучший кандидат: <span className="text-purple-300 font-medium">{bestProposal.freelancer_name}</span>
                            </p>
                        )}
                        <p className="text-sm text-zinc-300 leading-relaxed">{bestRecommendation.justification}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ── Proposals Stats Bar ── */
const ProposalsStats = ({
    proposals,
}: {
    proposals: { proposed_budget: number; estimated_days: number; ai_analysis_for_client?: string | null }[];
}) => {
    const withBudget = proposals.filter((p) => p.proposed_budget > 0);
    const withDays = proposals.filter((p) => p.estimated_days > 0);
    const avgBudget = withBudget.length > 0
        ? Math.round(withBudget.reduce((s, p) => s + p.proposed_budget, 0) / withBudget.length)
        : 0;
    const avgDays = withDays.length > 0
        ? Math.round(withDays.reduce((s, p) => s + p.estimated_days, 0) / withDays.length)
        : 0;
    const aiAnalyzed = proposals.filter((p) => p.ai_analysis_for_client).length;

    const stats = [
        { icon: <Users size={14} />, label: "Откликов", value: String(proposals.length), color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
        { icon: <Wallet size={14} />, label: "Средняя цена", value: formatCurrency(avgBudget), color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
        { icon: <Timer size={14} />, label: "Средний срок", value: formatDays(avgDays), color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
        { icon: <Sparkles size={14} />, label: "AI-анализ", value: `${aiAnalyzed}/${proposals.length}`, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in-up">
            {stats.map((s) => (
                <div key={s.label} className="glass-card rounded-xl p-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${s.bg} ${s.color}`}>
                        {s.icon}
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-zinc-500 truncate">{s.label}</p>
                        <p className={`text-sm font-semibold ${s.color}`}>{s.value}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

/* ── AI Analysis In-Progress Banner ── */
const AIAnalysisInProgress = ({ analyzed, total }: { analyzed: number; total: number }) => {
    const pct = total > 0 ? Math.round((analyzed / total) * 100) : 0;

    return (
        <div className="rounded-xl bg-indigo-500/[0.06] border border-indigo-500/15 p-4 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-3">
                <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                    <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 border-t-indigo-400 animate-spin" />
                    <Sparkles size={14} className="text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-indigo-200">AI анализирует отклики</p>
                    <p className="text-xs text-zinc-500">
                        Проанализировано {analyzed} из {total}
                        <span className="inline-flex gap-0.5 ml-1">
                            <span className="w-1 h-1 rounded-full bg-indigo-400 animate-typing-dot-1" />
                            <span className="w-1 h-1 rounded-full bg-indigo-400 animate-typing-dot-2" />
                            <span className="w-1 h-1 rounded-full bg-indigo-400 animate-typing-dot-3" />
                        </span>
                    </p>
                </div>
                <span className="text-xs font-bold text-indigo-300">{pct}%</span>
            </div>
            <Progress
                value={pct}
                size="sm"
                classNames={{
                    track: "bg-zinc-800/60 h-1.5",
                    indicator: "bg-gradient-to-r from-indigo-500 to-purple-500",
                }}
            />
        </div>
    );
};

/* ── Sort options ── */
type SortKey = "date" | "budget_asc" | "budget_desc" | "ai";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "date", label: "По дате" },
    { key: "budget_asc", label: "Цена ↑" },
    { key: "budget_desc", label: "Цена ↓" },
    { key: "ai", label: "AI-анализ" },
];

type ProposalFilterKey = "all" | "pending" | "accepted" | "rejected";

const PROPOSAL_FILTERS: { key: ProposalFilterKey; label: string }[] = [
    { key: "all", label: "Все" },
    { key: "pending", label: "Новые" },
    { key: "accepted", label: "Принятые" },
    { key: "rejected", label: "Отклонённые" },
];

export const OrderDetailPage = ({ orderId }: OrderDetailPageProps) => {
    const router = useRouter();
    const role = useSessionStore((s) => s.role);
    const userId = useSessionStore((s) => s.userId);
    const { data: order, isLoading } = useOrderDetail(orderId);
    const { data: proposalsData } = useOrderProposals(orderId);
    const { data: myProposalsData } = useMyProposals();
    const submitProposal = useSubmitProposal();
    const updateStatus = useUpdateProposalStatus();
    const updateOrder = useUpdateOrder();
    const proposalStatusModal = useDisclosure();

    const [isEditing, setIsEditing] = useState(false);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editBudgetMin, setEditBudgetMin] = useState("");
    const [editBudgetMax, setEditBudgetMax] = useState("");
    const [editDeadline, setEditDeadline] = useState("");
    const [editSkills, setEditSkills] = useState("");

    const [coverLetter, setCoverLetter] = useState("");
    const [proposedBudget, setProposedBudget] = useState("");
    const [estimatedDays, setEstimatedDays] = useState("");
    const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
    const [isSuggestingTerms, setIsSuggestingTerms] = useState(false);
    const [aiHint, setAiHint] = useState("");
    const [aiError, setAiError] = useState("");
    const [sortBy, setSortBy] = useState<SortKey>("date");
    const [proposalFilter, setProposalFilter] = useState<ProposalFilterKey>("all");
    const [proposalActionNotice, setProposalActionNotice] = useState("");
    const [proposalFormError, setProposalFormError] = useState("");
    const [expandedAI, setExpandedAI] = useState<Set<string>>(new Set());
    const [pendingStatusAction, setPendingStatusAction] = useState<{
        proposalId: string;
        status: "accepted" | "rejected";
    } | null>(null);
    const [fundsModal, setFundsModal] = useState<{
        isOpen: boolean;
        available: number;
        required: number;
        retryProposalId: string;
    }>({ isOpen: false, available: 0, required: 0, retryProposalId: "" });

    const proposals = proposalsData?.items ?? [];
    const myProposals = myProposalsData?.items ?? [];
    const bestRecommendation = proposalsData?.best_recommendation;
    const existingProposal =
        proposals.find((proposal) => proposal.freelancer_id === userId) ??
        myProposals.find((proposal) => proposal.order_id === orderId);
    const hasExistingProposal = Boolean(existingProposal);

    const sortedProposals = useMemo(() => {
        const sorted = [...proposals];
        switch (sortBy) {
            case "budget_asc":
                sorted.sort((a, b) => a.proposed_budget - b.proposed_budget);
                break;
            case "budget_desc":
                sorted.sort((a, b) => b.proposed_budget - a.proposed_budget);
                break;
            case "ai":
                sorted.sort((a, b) => (b.ai_analysis_for_client ? 1 : 0) - (a.ai_analysis_for_client ? 1 : 0));
                break;
            default:
                sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
        // Best recommendation always first
        if (bestRecommendation) {
            const idx = sorted.findIndex((p) => p.id === bestRecommendation.proposal_id);
            if (idx > 0) {
                const [best] = sorted.splice(idx, 1);
                if (best) {
                    sorted.unshift(best);
                }
            }
        }
        return sorted;
    }, [proposals, sortBy, bestRecommendation]);

    const proposalCounters = useMemo(
        () => ({
            all: proposals.length,
            pending: proposals.filter((proposal) => proposal.status === "pending").length,
            accepted: proposals.filter((proposal) => proposal.status === "accepted").length,
            rejected: proposals.filter((proposal) => proposal.status === "rejected").length,
        }),
        [proposals]
    );

    const visibleProposals = useMemo(() => {
        if (proposalFilter === "all") return sortedProposals;
        return sortedProposals.filter((proposal) => proposal.status === proposalFilter);
    }, [proposalFilter, sortedProposals]);

    const toggleAIExpanded = (id: string) => {
        setExpandedAI((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSubmitProposal = () => {
        if (hasExistingProposal) return;
        if (!order) return;
        const normalizedCoverLetter = coverLetter.trim();
        const budget = Number(proposedBudget);
        const days = Number(estimatedDays);

        if (normalizedCoverLetter.length < 40) {
            setProposalFormError("Добавьте чуть больше деталей в отклик (минимум 40 символов).");
            return;
        }
        if (!Number.isFinite(budget) || budget <= 0) {
            setProposalFormError("Укажите корректную цену больше 0.");
            return;
        }
        if (budget < order.budget_min || budget > order.budget_max) {
            setProposalFormError(`Сумма отклика должна быть в диапазоне ${formatCurrency(order.budget_min)} - ${formatCurrency(order.budget_max)}.`);
            return;
        }
        if (!Number.isFinite(days) || days <= 0) {
            setProposalFormError("Укажите корректный срок в днях.");
            return;
        }

        setProposalFormError("");
        submitProposal.mutate({
            orderId,
            input: {
                cover_letter: normalizedCoverLetter,
                proposed_budget: budget,
                estimated_days: days,
            },
        }, {
            onError: () => {
                setProposalFormError("Не удалось отправить отклик. Попробуйте снова.");
            },
            onSuccess: () => {
                setProposalFormError("");
                setCoverLetter("");
                setProposedBudget("");
                setEstimatedDays("");
            },
        });
    };

    const handleStatusUpdate = (proposalId: string, status: "accepted" | "rejected") => {
        setPendingStatusAction({ proposalId, status });
        proposalStatusModal.onOpen();
    };

    const closeStatusModal = () => {
        if (updateStatus.isPending) return;
        setPendingStatusAction(null);
        proposalStatusModal.onClose();
    };

    const confirmStatusUpdate = () => {
        if (!pendingStatusAction) return;
        setProposalActionNotice("");
        updateStatus.mutate({ orderId, proposalId: pendingStatusAction.proposalId, status: pendingStatusAction.status }, {
            onSuccess: () => {
                setProposalActionNotice(pendingStatusAction.status === "accepted" ? "Отклик принят." : "Отклик отклонён.");
            },
            onError: (error) => {
                if (isInsufficientFundsError(error)) {
                    const parsed = parseInsufficientFundsError((error as Error).message);
                    setFundsModal({
                        isOpen: true,
                        available: parsed?.available ?? 0,
                        required: parsed?.required ?? 0,
                        retryProposalId: pendingStatusAction.proposalId,
                    });
                } else {
                    setProposalActionNotice("Не удалось обновить статус отклика. Повторите попытку.");
                }
            },
            onSettled: () => {
                setPendingStatusAction(null);
                proposalStatusModal.onClose();
            },
        });
    };

    const handleFundsDepositSuccess = () => {
        if (fundsModal.retryProposalId) {
            updateStatus.mutate(
                { orderId, proposalId: fundsModal.retryProposalId, status: "accepted" },
                {
                    onSuccess: () => setProposalActionNotice("Отклик принят."),
                    onError: () => setProposalActionNotice("Не удалось принять отклик после пополнения. Попробуйте ещё раз."),
                }
            );
        }
    };

    const handleGenerateProposalWithAI = async () => {
        setAiError("");
        setAiHint("");
        setIsGeneratingProposal(true);
        try {
            const data = await apiClient.request<{ proposal?: string }>(`/ai/orders/${orderId}/proposal`, {
                method: "POST",
                body: JSON.stringify({}),
            });
            const proposal = (data.proposal ?? "").trim();
            if (proposal) {
                setCoverLetter(proposal);
            } else {
                setAiError("ИИ не смог сгенерировать текст. Попробуйте ещё раз.");
            }
        } catch {
            setAiError("Не удалось получить текст отклика от ИИ.");
        } finally {
            setIsGeneratingProposal(false);
        }
    };

    const handleSuggestTermsWithAI = async () => {
        setAiError("");
        setAiHint("");
        setIsSuggestingTerms(true);
        try {
            const data = await apiClient.request<{
                recommended_amount?: number | null;
                min_amount?: number | null;
                max_amount?: number | null;
                recommended_days?: number | null;
                min_days?: number | null;
                max_days?: number | null;
                explanation?: string;
            }>(`/ai/orders/${orderId}/price-timeline`);

            const amount = data.recommended_amount ?? data.min_amount ?? data.max_amount ?? null;
            const days = data.recommended_days ?? data.min_days ?? data.max_days ?? null;

            if (typeof amount === "number" && Number.isFinite(amount)) {
                setProposedBudget(String(Math.max(1, Math.round(amount))));
            }
            if (typeof days === "number" && Number.isFinite(days)) {
                setEstimatedDays(String(Math.max(1, Math.round(days))));
            }
            if (data.explanation) {
                setAiHint(data.explanation);
            }
        } catch {
            setAiError("Не удалось получить рекомендацию по цене и сроку.");
        } finally {
            setIsSuggestingTerms(false);
        }
    };

    const startEditing = () => {
        if (!order) return;
        setEditTitle(order.title);
        setEditDescription(order.description);
        setEditBudgetMin(String(order.budget_min));
        setEditBudgetMax(String(order.budget_max));
        setEditDeadline(order.deadline ? order.deadline.slice(0, 10) : "");
        setEditSkills(order.skill_tags.join(", "));
        setIsEditing(true);
    };

    const handleSaveOrder = async () => {
        if (!order) return;
        const nextBudgetMin = Number(editBudgetMin) || order.budget_min;
        const nextBudgetMax = Number(editBudgetMax) || order.budget_max;
        if (nextBudgetMin <= 0 || nextBudgetMax <= 0) {
            setProposalActionNotice("Бюджет заказа должен быть больше 0.");
            return;
        }
        if (nextBudgetMin > nextBudgetMax) {
            setProposalActionNotice("Минимальный бюджет не может быть больше максимального.");
            return;
        }
        await updateOrder.mutateAsync({
            id: order.id,
            input: {
                title: editTitle.trim(),
                description: editDescription.trim(),
                budget_min: nextBudgetMin,
                budget_max: nextBudgetMax,
                deadline: editDeadline || order.deadline,
                skill_tags: editSkills
                    .split(",")
                    .map((skill) => skill.trim())
                    .filter(Boolean),
            },
        });
        setIsEditing(false);
    };

    /* ── Loading skeleton ── */
    if (isLoading) {
        return (
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header skeleton */}
                <div className="glass-card rounded-2xl p-8 animate-pulse">
                    <div className="flex items-start justify-between mb-6">
                        <div className="space-y-3 flex-1">
                            <div className="h-8 bg-zinc-800 rounded-lg w-2/3 shimmer" />
                            <div className="h-4 bg-zinc-800 rounded-lg w-1/4 shimmer" />
                        </div>
                        <div className="h-7 w-24 bg-zinc-800 rounded-full shimmer" />
                    </div>
                    <div className="flex items-center gap-3 mb-6">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-zinc-800 rounded-full shimmer" />
                                <div className="h-3 w-16 bg-zinc-800 rounded shimmer" />
                                {i < 3 && <div className="w-10 h-0.5 bg-zinc-800 mx-1" />}
                            </div>
                        ))}
                    </div>
                    <Divider className="bg-white/[0.04] my-6" />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-3">
                            <div className="h-4 bg-zinc-800 rounded w-full shimmer" />
                            <div className="h-4 bg-zinc-800 rounded w-full shimmer" />
                            <div className="h-4 bg-zinc-800 rounded w-3/4 shimmer" />
                            <div className="flex gap-2 pt-3">
                                {[0, 1, 2].map((i) => (
                                    <div key={i} className="h-6 w-16 bg-zinc-800 rounded-full shimmer" />
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                            {[0, 1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-zinc-800 rounded-lg shimmer" />
                                    <div className="space-y-1.5 flex-1">
                                        <div className="h-3 w-16 bg-zinc-800 rounded shimmer" />
                                        <div className="h-4 w-24 bg-zinc-800 rounded shimmer" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/* Proposals skeleton */}
                <div className="space-y-3">
                    {[0, 1].map((i) => (
                        <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
                            <div className="flex gap-3">
                                <div className="w-10 h-10 bg-zinc-800 rounded-full shimmer" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-1/3 bg-zinc-800 rounded shimmer" />
                                    <div className="h-3 w-full bg-zinc-800 rounded shimmer" />
                                    <div className="h-3 w-2/3 bg-zinc-800 rounded shimmer" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up">
                <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 border border-zinc-700/30 flex items-center justify-center text-zinc-500 mb-4">
                    <Search size={24} />
                </div>
                <p className="text-zinc-400 mb-4">Заказ не найден</p>
                <Button variant="light" className="text-purple-400" onPress={() => router.back()}>
                    Назад
                </Button>
            </div>
        );
    }

    const isOwner = role === "client" && userId === order.client_id;
    const isLongDescription = order.description.trim().length > 700;
    const daysUntilDeadline = getDaysUntilDeadline(order.deadline);
    const normalizedCoverLetter = coverLetter.trim();
    const proposalBudget = Number(proposedBudget);
    const proposalDays = Number(estimatedDays);
    const canSubmitProposal =
        normalizedCoverLetter.length >= 40 &&
        Number.isFinite(proposalBudget) &&
        proposalBudget > 0 &&
        Number.isFinite(proposalDays) &&
        proposalDays > 0 &&
        !submitProposal.isPending &&
        !hasExistingProposal;

    const inputClasses = {
        inputWrapper: "bg-zinc-900/50 border-zinc-700/50 hover:border-purple-500/40 group-data-[focus=true]:border-purple-500/60",
        label: "text-zinc-400",
        input: "text-zinc-200",
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in-up">
            <Button variant="light" className="text-zinc-400 hover:text-zinc-200" onPress={() => router.back()} startContent={<ArrowLeft size={16} />}>
                Назад
            </Button>

            {/* ═══ Order header + timeline ═══ */}
            <div className="glass-card rounded-2xl overflow-hidden relative">
                {/* Decorative background gradient */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600/[0.04] rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-600/[0.03] rounded-full blur-[60px] pointer-events-none" />

                <div className="relative p-6 space-y-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-3 flex-1 min-w-0">
                            {isEditing ? (
                                <Input
                                    value={editTitle}
                                    onValueChange={setEditTitle}
                                    variant="bordered"
                                    classNames={inputClasses}
                                />
                            ) : (
                                <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">{order.title}</h1>
                            )}
                            <div className="flex items-center gap-3 flex-wrap">
                                <StatusBadge status={order.status} />
                                {order.created_at && (
                                    <span className="text-xs text-zinc-500">
                                        Создан {formatDate(order.created_at)}
                                    </span>
                                )}
                                {isOwner && !isEditing && (
                                    <Button
                                        size="sm"
                                        variant="light"
                                        className="text-zinc-500 hover:text-purple-400"
                                        startContent={<Pencil size={13} />}
                                        onPress={startEditing}
                                    >
                                        Редактировать
                                    </Button>
                                )}
                                {isEditing && (
                                    <>
                                        <Button
                                            size="sm"
                                            className="bg-purple-600/20 text-purple-300 border border-purple-500/30"
                                            startContent={<Save size={14} />}
                                            isLoading={updateOrder.isPending}
                                            onPress={() => { void handleSaveOrder(); }}
                                        >
                                            Сохранить
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="light"
                                            className="text-zinc-400"
                                            onPress={() => setIsEditing(false)}
                                        >
                                            Отмена
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <OrderTimeline currentStatus={order.status} />
                </div>

                <Divider className="bg-white/[0.04]" />

                {/* ── Order body ── */}
                <div className="relative p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main content */}
                    <div className="lg:col-span-2 space-y-5">
                        {isEditing ? (
                            <Textarea
                                value={editDescription}
                                onValueChange={setEditDescription}
                                variant="bordered"
                                minRows={6}
                                classNames={{ ...inputClasses, input: "text-zinc-200 min-h-[140px]" }}
                            />
                        ) : (
                            <div className="space-y-2">
                                <div className={`relative ${isLongDescription && !isDescriptionExpanded ? "max-h-56 overflow-hidden" : ""}`}>
                                    <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed text-[15px]">{order.description}</p>
                                    {isLongDescription && !isDescriptionExpanded && (
                                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[rgba(15,15,25,0.95)] to-transparent" />
                                    )}
                                </div>
                                {isLongDescription && (
                                    <button
                                        type="button"
                                        className="text-sm font-medium text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                                        onClick={() => setIsDescriptionExpanded((prev) => !prev)}
                                    >
                                        {isDescriptionExpanded ? (
                                            <>Свернуть <ChevronUp size={14} /></>
                                        ) : (
                                            <>Показать полностью <ChevronDown size={14} /></>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}

                        {!isEditing && order.skill_tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {order.skill_tags.map((tag) => (
                                    <Chip
                                        key={tag}
                                        size="sm"
                                        variant="flat"
                                        classNames={{
                                            base: "bg-purple-500/10 border border-purple-500/15 hover:bg-purple-500/20 hover:border-purple-500/30 hover:shadow-[0_0_8px_rgba(139,92,246,0.15)] transition-all duration-200 cursor-default",
                                            content: "text-purple-300 text-xs font-medium",
                                        }}
                                    >
                                        {tag}
                                    </Chip>
                                ))}
                            </div>
                        )}

                        {isEditing && (
                            <Input
                                label="Навыки (через запятую)"
                                value={editSkills}
                                onValueChange={setEditSkills}
                                variant="bordered"
                                classNames={inputClasses}
                            />
                        )}
                    </div>

                    {/* ── Sidebar meta ── */}
                    <div className="space-y-4">
                        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 space-y-5">
                            {/* Budget */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                                    <Wallet size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-zinc-500 mb-0.5">Бюджет</p>
                                    {isEditing ? (
                                        <div className="grid grid-cols-2 gap-2 pt-1">
                                            <Input size="sm" label="От" type="number" value={editBudgetMin} onValueChange={setEditBudgetMin} variant="bordered" classNames={inputClasses} />
                                            <Input size="sm" label="До" type="number" value={editBudgetMax} onValueChange={setEditBudgetMax} variant="bordered" classNames={inputClasses} />
                                        </div>
                                    ) : (
                                        <p className="text-base font-bold gradient-text">
                                            {formatCurrency(order.budget_min)} – {formatCurrency(order.budget_max)}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Deadline */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                                    <Calendar size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-zinc-500 mb-0.5">Дедлайн</p>
                                    {isEditing ? (
                                        <Input size="sm" type="date" value={editDeadline} onValueChange={setEditDeadline} variant="bordered" classNames={inputClasses} />
                                    ) : (
                                        <div>
                                            <p className="text-sm text-zinc-200 font-medium">
                                                {order.deadline ? new Date(order.deadline).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                                            </p>
                                            {daysUntilDeadline != null && daysUntilDeadline > 0 && (
                                                <p className={`text-xs mt-0.5 flex items-center gap-1 ${daysUntilDeadline <= 7 ? "text-amber-400" : "text-zinc-500"}`}>
                                                    <Clock size={10} />
                                                    Осталось {daysUntilDeadline} дн
                                                </p>
                                            )}
                                            {daysUntilDeadline != null && daysUntilDeadline <= 0 && (
                                                <p className="text-xs text-red-400 mt-0.5 flex items-center gap-1">
                                                    <Clock size={10} />
                                                    Просрочен
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Category */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                    <Tag size={18} />
                                </div>
                                <div>
                                    <p className="text-xs text-zinc-500 mb-0.5">Категория</p>
                                    <p className="text-sm text-zinc-200 font-medium">{order.category}</p>
                                </div>
                            </div>

                            {/* Responses count */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                    <MessageSquare size={18} />
                                </div>
                                <div>
                                    <p className="text-xs text-zinc-500 mb-0.5">Откликов</p>
                                    <p className="text-sm text-zinc-200 font-medium">{proposals.length}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ Client: proposals section ═══ */}
            {isOwner && (
                <div className="space-y-5">
                    {proposalCounters.pending > 0 && (
                        <div className="sticky top-20 z-20 rounded-xl border border-purple-500/20 bg-zinc-950/90 backdrop-blur p-3 flex items-center justify-between gap-3">
                            <p className="text-sm text-zinc-300">
                                Новых откликов: <span className="text-purple-300 font-semibold">{proposalCounters.pending}</span>
                            </p>
                            <Button
                                size="sm"
                                className="bg-purple-600/20 text-purple-300 border border-purple-500/25"
                                onPress={() => setProposalFilter("pending")}
                            >
                                Разобрать новые
                            </Button>
                        </div>
                    )}

                    {/* Section header */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                <MessageSquare size={16} className="text-purple-400" />
                            </div>
                            Отклики
                            {proposals.length > 0 && (
                                <Chip size="sm" classNames={{ base: "bg-purple-500/15 border border-purple-500/25", content: "text-purple-300 text-xs font-bold" }}>
                                    {proposals.length}
                                </Chip>
                            )}
                        </h2>

                        {/* Sort buttons */}
                        {proposals.length > 1 && (
                            <div className="flex items-center gap-1.5">
                                <ArrowUpDown size={13} className="text-zinc-500 mr-1" />
                                {SORT_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.key}
                                        type="button"
                                        onClick={() => setSortBy(opt.key)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${sortBy === opt.key
                                            ? "bg-purple-500/15 text-purple-300 border border-purple-500/25"
                                            : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Status filters */}
                    {proposals.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            {PROPOSAL_FILTERS.map((filter) => (
                                <button
                                    key={filter.key}
                                    type="button"
                                    onClick={() => setProposalFilter(filter.key)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${proposalFilter === filter.key
                                        ? "bg-purple-500/15 text-purple-200 border-purple-500/30"
                                        : "bg-white/[0.01] text-zinc-400 border-white/[0.06] hover:text-zinc-200"
                                        }`}
                                >
                                    {filter.label} · {proposalCounters[filter.key]}
                                </button>
                            ))}
                        </div>
                    )}

                    {proposalActionNotice && (
                        <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/60 px-4 py-3">
                            <p className="text-sm text-zinc-300">{proposalActionNotice}</p>
                        </div>
                    )}

                    {/* Stats bar */}
                    {proposals.length > 0 && (
                        <ProposalsStats proposals={proposals} />
                    )}

                    {/* AI analysis in progress */}
                    {proposals.length > 0 && proposals.some((p) => !p.ai_analysis_for_client) && (
                        <AIAnalysisInProgress
                            analyzed={proposals.filter((p) => p.ai_analysis_for_client).length}
                            total={proposals.length}
                        />
                    )}

                    {/* AI recommendation */}
                    {bestRecommendation && (
                        <AIRecommendationCard bestRecommendation={bestRecommendation} proposals={proposals} />
                    )}

                    {/* Empty state with animation */}
                    {proposals.length === 0 ? (
                        <Card className="glass-card overflow-visible">
                            <CardBody className="p-0">
                                <WaitingForProposals />
                            </CardBody>
                        </Card>
                    ) : visibleProposals.length === 0 ? (
                        <Card className="glass-card">
                            <CardBody className="p-6">
                                <p className="text-sm text-zinc-400">В текущем фильтре откликов нет.</p>
                            </CardBody>
                        </Card>
                    ) : (
                        /* ── Proposal cards ── */
                        <div className="space-y-4">
                            {visibleProposals.map((p, i) => {
                                const isBestRecommended = bestRecommendation?.proposal_id === p.id;
                                const isAIExpanded = expandedAI.has(p.id);

                                return (
                                    <div
                                        key={p.id}
                                        className="animate-fade-in-up"
                                        style={{ animationDelay: `${i * 60}ms` }}
                                    >
                                        <Card className={`glass-card card-hover-glow transition-all duration-300 ${isBestRecommended ? "ring-1 ring-purple-500/25 shadow-[0_0_24px_rgba(139,92,246,0.08)]" : ""}`}>
                                            <CardBody className="p-5">
                                                {/* Best recommended badge */}
                                                {isBestRecommended && (
                                                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-purple-500/10">
                                                        <Chip
                                                            size="sm"
                                                            startContent={<Star size={11} className="ml-1" />}
                                                            classNames={{
                                                                base: "bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/25",
                                                                content: "text-purple-200 text-xs font-bold",
                                                            }}
                                                        >
                                                            AI рекомендует
                                                        </Chip>
                                                        {bestRecommendation.score != null && (
                                                            <span className="text-xs text-purple-400/70">{bestRecommendation.score}% match</span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Header row */}
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar
                                                            size="md"
                                                            showFallback
                                                            name={p.freelancer_name?.charAt(0)?.toUpperCase() ?? ""}
                                                            classNames={{
                                                                base: `${isBestRecommended ? "bg-purple-600/30 ring-2 ring-purple-500/20" : "bg-purple-600/15"} w-11 h-11`,
                                                                icon: "text-purple-400",
                                                                name: "text-purple-300 font-bold text-sm",
                                                            }}
                                                        />
                                                        <div>
                                                            <p className="text-sm font-semibold text-zinc-100">{p.freelancer_name ?? "Фрилансер"}</p>
                                                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                                                <span className="text-xs text-yellow-400 font-medium flex items-center gap-1">
                                                                    <Star size={11} className="fill-yellow-400/20" />
                                                                    <span>4.9</span>
                                                                </span>
                                                                {p.proposed_budget > 0 && (
                                                                    <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                                                                        <Wallet size={11} />
                                                                        {formatCurrency(p.proposed_budget)}
                                                                    </span>
                                                                )}
                                                                {p.estimated_days > 0 && (
                                                                    <span className="text-xs text-amber-400/80 flex items-center gap-1">
                                                                        <Timer size={11} />
                                                                        {formatDays(p.estimated_days)}
                                                                    </span>
                                                                )}
                                                                <span className="text-xs text-zinc-600">
                                                                    {formatDate(p.created_at)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <StatusBadge status={p.status} />
                                                        <Button
                                                            size="sm"
                                                            variant="light"
                                                            className="text-zinc-400 hover:text-purple-400 h-7 text-xs px-2"
                                                            onPress={() => router.push(`/dashboard/profile/${p.freelancer_id}` as never)}
                                                        >
                                                            Профиль
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Cover letter */}
                                                <p className="text-sm text-zinc-300 leading-relaxed mb-4">{p.cover_letter}</p>

                                                {/* AI Analysis */}
                                                {p.ai_analysis_for_client && (
                                                    <div className="rounded-xl bg-indigo-500/[0.07] border border-indigo-500/15 overflow-hidden mb-4">
                                                        <button
                                                            type="button"
                                                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-indigo-500/[0.05] transition-colors"
                                                            onClick={() => toggleAIExpanded(p.id)}
                                                        >
                                                            <span className="text-xs text-indigo-300 font-medium flex items-center gap-1.5">
                                                                <Sparkles size={12} />
                                                                AI-анализ отклика
                                                            </span>
                                                            {isAIExpanded ? <ChevronUp size={13} className="text-indigo-400" /> : <ChevronDown size={13} className="text-indigo-400" />}
                                                        </button>
                                                        {isAIExpanded && (
                                                            <div className="px-4 pb-3 animate-fade-in-up" style={{ animationDuration: "0.3s" }}>
                                                                <p className="text-sm text-zinc-300 leading-relaxed">{p.ai_analysis_for_client}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Action buttons */}
                                                {p.status === "pending" && (
                                                    <div className="flex items-center gap-2 pt-1">
                                                        <Button
                                                            size="sm"
                                                            className="bg-emerald-600/15 text-emerald-400 border border-emerald-600/25 hover:bg-emerald-600/25 hover:shadow-[0_0_12px_rgba(52,211,153,0.1)] transition-all"
                                                            startContent={<Check size={14} />}
                                                            onPress={() => handleStatusUpdate(p.id, "accepted")}
                                                        >
                                                            Принять
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="bg-red-600/10 text-red-400 border border-red-600/20 hover:bg-red-600/20 transition-all"
                                                            startContent={<X size={14} />}
                                                            onPress={() => handleStatusUpdate(p.id, "rejected")}
                                                        >
                                                            Отклонить
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="light"
                                                            className="text-zinc-500 hover:text-purple-400 ml-auto"
                                                            startContent={<MessageSquare size={13} />}
                                                            onPress={() => router.push("/dashboard/messages")}
                                                        >
                                                            Написать
                                                        </Button>
                                                    </div>
                                                )}
                                                {p.status === "accepted" && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-purple-600/15 text-purple-400 border border-purple-500/25 hover:bg-purple-600/25 transition-all"
                                                        startContent={<MessageSquare size={14} />}
                                                        onPress={() => router.push("/dashboard/messages")}
                                                    >
                                                        Начать чат
                                                    </Button>
                                                )}
                                            </CardBody>
                                        </Card>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ Freelancer: submit proposal ═══ */}
            {role === "freelancer" && (
                <div id="respond" className="glass-card rounded-2xl overflow-hidden relative">
                    {/* Decorative gradient */}
                    <div className="absolute top-0 left-0 w-48 h-48 bg-purple-600/[0.03] rounded-full blur-[60px] pointer-events-none" />

                    <div className="relative p-6 space-y-5">
                        {submitProposal.isSuccess || hasExistingProposal ? (
                            <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-fade-in-up">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.15)] border border-emerald-500/20">
                                    <Check size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-white">Отклик отправлен</h3>
                                <p className="text-sm text-zinc-400 text-center max-w-sm">
                                    Вы уже откликнулись на этот заказ. Заказчик увидит ваше предложение и свяжется с вами.
                                    {existingProposal?.status && (
                                        <span className="block mt-2">
                                            Статус: <StatusBadge status={existingProposal.status} />
                                        </span>
                                    )}
                                </p>
                                <Button
                                    className="mt-2 bg-purple-600/15 text-purple-400 hover:bg-purple-600/25 font-medium border border-purple-500/20"
                                    onPress={() => router.push("/dashboard/orders")}
                                >
                                    Вернуться к маркетплейсу
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                            <Send size={15} className="text-purple-400" />
                                        </div>
                                        Откликнуться
                                    </h2>
                                </div>

                                {/* AI helper buttons */}
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        className="bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 hover:shadow-[0_0_12px_rgba(139,92,246,0.1)] transition-all"
                                        startContent={<Sparkles size={14} />}
                                        onPress={() => { void handleGenerateProposalWithAI(); }}
                                        isLoading={isGeneratingProposal}
                                    >
                                        Сгенерировать текст
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 hover:shadow-[0_0_12px_rgba(99,102,241,0.1)] transition-all"
                                        startContent={<Zap size={14} />}
                                        onPress={() => { void handleSuggestTermsWithAI(); }}
                                        isLoading={isSuggestingTerms}
                                    >
                                        Подсказать цену и срок
                                    </Button>
                                </div>

                                {aiHint && (
                                    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.07] px-4 py-3 animate-fade-in-up" style={{ animationDuration: "0.3s" }}>
                                        <p className="text-xs text-indigo-200 flex items-start gap-2">
                                            <Sparkles size={13} className="shrink-0 mt-0.5 text-indigo-400" />
                                            {aiHint}
                                        </p>
                                    </div>
                                )}
                                {aiError && (
                                    <div className="rounded-xl border border-red-500/20 bg-red-500/[0.07] px-4 py-2.5">
                                        <p className="text-xs text-red-400 flex items-center gap-2">
                                            <Shield size={13} />
                                            {aiError}
                                        </p>
                                    </div>
                                )}

                                <Textarea
                                    label="Сопроводительное письмо"
                                    placeholder="Расскажите, почему вы подходите для этого заказа..."
                                    value={coverLetter}
                                    onValueChange={setCoverLetter}
                                    variant="bordered"
                                    minRows={4}
                                    description="Минимум 40 символов: релевантный опыт, подход и ожидаемый результат."
                                    classNames={{ ...inputClasses, input: "text-zinc-200 min-h-[100px]" }}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Ваша цена (₽)"
                                        type="number"
                                        value={proposedBudget}
                                        onValueChange={setProposedBudget}
                                        variant="bordered"
                                        classNames={inputClasses}
                                        startContent={<span className="text-zinc-500 text-sm">₽</span>}
                                    />
                                    <Input
                                        label="Срок (дней)"
                                        type="number"
                                        value={estimatedDays}
                                        onValueChange={setEstimatedDays}
                                        variant="bordered"
                                        classNames={inputClasses}
                                    />
                                </div>
                                {proposalFormError && (
                                    <div className="rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-2.5">
                                        <p className="text-xs text-red-300">{proposalFormError}</p>
                                    </div>
                                )}
                                <Button
                                    className="bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-lg shadow-purple-600/20 hover:shadow-purple-500/30 transition-all"
                                    onPress={handleSubmitProposal}
                                    isLoading={submitProposal.isPending}
                                    isDisabled={!canSubmitProposal}
                                    endContent={<Send size={16} />}
                                >
                                    Отправить отклик
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            )}

            <Modal
                isOpen={proposalStatusModal.isOpen}
                onOpenChange={(isOpen) => {
                    if (!isOpen) closeStatusModal();
                }}
                size="md"
                classNames={{
                    base: "bg-zinc-900 border border-white/[0.06]",
                    header: "border-b border-white/[0.06]",
                    footer: "border-t border-white/[0.06]",
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex items-center gap-2">
                        <span className="text-zinc-100">
                            {pendingStatusAction?.status === "accepted" ? "Подтвердить принятие" : "Подтвердить отклонение"}
                        </span>
                    </ModalHeader>
                    <ModalBody className="py-4">
                        <p className="text-sm text-zinc-300">
                            {pendingStatusAction?.status === "accepted"
                                ? "Исполнитель будет выбран, а отклик перейдёт в статус «принят»."
                                : "Отклик будет отклонён. Позже вы сможете рассмотреть другие предложения."}
                        </p>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" className="text-zinc-400" onPress={closeStatusModal} isDisabled={updateStatus.isPending}>
                            Отмена
                        </Button>
                        <Button
                            className={
                                pendingStatusAction?.status === "accepted"
                                    ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                                    : "bg-red-600/20 text-red-300 border border-red-500/30"
                            }
                            onPress={confirmStatusUpdate}
                            isLoading={updateStatus.isPending}
                        >
                            {pendingStatusAction?.status === "accepted" ? "Принять отклик" : "Отклонить отклик"}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <InsufficientFundsModal
                isOpen={fundsModal.isOpen}
                onClose={() => setFundsModal((prev) => ({ ...prev, isOpen: false }))}
                availableBalance={fundsModal.available}
                requiredAmount={fundsModal.required}
                onDepositSuccess={handleFundsDepositSuccess}
            />
        </div>
    );
};
