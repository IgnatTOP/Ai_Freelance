"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMyProposals, useUpdateProposalStatus } from "@/features/proposal-management";
import { useBalance } from "@/features/balance-management";
import type { Proposal } from "@/shared/api/endpoints/proposals";
import { useSessionStore } from "@/shared/store/session.store";
import { EmptyState } from "@/shared/ui/empty-state/EmptyState";
import { formatMoney } from "@/shared/lib/money";
import {
    FilkaButton,
    FilkaCard,
    FilkaChip,
    FilkaSegmented,
    IconArrowRight,
    IconCheck,
    IconClose,
    IconCompass,
    IconFile,
    IconSearch,
    IconShield,
    IconSpark,
    IconStar,
} from "@/shared/ui/filka";
import {
    InsufficientFundsModal,
    isInsufficientFundsError,
    parseInsufficientFundsError,
} from "@/shared/ui/insufficient-funds-modal/InsufficientFundsModal";

const formatCurrency = (value: number | null | undefined): string =>
    typeof value === "number" && Number.isFinite(value) ? formatMoney(value) : "—";

const formatTerm = (proposal: Proposal): string => {
  if (typeof proposal.estimated_days === "number" && proposal.estimated_days > 0) {
    return `${proposal.estimated_days} дней`;
  }

  if (proposal.proposed_deadline) {
    const deadline = new Date(proposal.proposed_deadline);
    if (Number.isFinite(deadline.getTime())) {
      return `до ${deadline.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
    }
  }

  return "срок не указан";
};

const formatOrderBudget = (proposal: Proposal): string => {
  if (typeof proposal.order_budget_min === "number" && typeof proposal.order_budget_max === "number") {
    return `${formatMoney(proposal.order_budget_min)} – ${formatMoney(proposal.order_budget_max)}`;
  }
  return "Бюджет заказа не указан";
};

const formatOrderDeadline = (proposal: Proposal): string => {
  if (!proposal.order_deadline) return "Дедлайн заказа не указан";
  const deadline = new Date(proposal.order_deadline);
  if (!Number.isFinite(deadline.getTime())) return "Дедлайн заказа не указан";
  return `до ${deadline.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
};

const getInitials = (name?: string): string =>
  (name ?? "FL")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "FL";

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

  return [...map.values()].sort((left, right) => {
    const leftTs = new Date(left.items[0]?.created_at ?? 0).getTime();
    const rightTs = new Date(right.items[0]?.created_at ?? 0).getTime();
    return rightTs - leftTs;
  });
};

const statusTone = (status: string): "default" | "muted" | "warn" | "error" => {
  if (status === "accepted") return "default";
  if (status === "pending") return "warn";
  if (status === "rejected") return "error";
  return "muted";
};

const statusLabel = (status: string): string => {
  if (status === "accepted") return "Принят";
  if (status === "pending") return "Новый";
  if (status === "rejected") return "Отклонён";
  return status;
};

export const ProposalsPage = () => {
  const router = useRouter();
  const role = useSessionStore((state) => state.role);
  const currentRole = role === "client" ? "client" : "freelancer";
  const { data, isLoading } = useMyProposals(currentRole);
  const { data: balance } = useBalance();
  const updateStatus = useUpdateProposalStatus();
  const proposals = data?.items ?? [];
  const groupedByOrder = useMemo(() => (role === "client" ? groupByOrder(proposals) : []), [proposals, role]);

  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [expandedLetters, setExpandedLetters] = useState<Set<string>>(new Set());
  const [fundsModal, setFundsModal] = useState<{
    isOpen: boolean;
    available: number;
    required: number;
    retryOrderId: string;
    retryProposalId: string;
  }>({ isOpen: false, available: 0, required: 0, retryOrderId: "", retryProposalId: "" });

  const proposalsByStatus = useMemo(() => ({
    all: proposals.length,
    pending: proposals.filter((proposal) => proposal.status === "pending").length,
    accepted: proposals.filter((proposal) => proposal.status === "accepted").length,
    rejected: proposals.filter((proposal) => proposal.status === "rejected").length,
  }), [proposals]);

  const filteredGroups = useMemo(
    () => groupedByOrder
      .map((group) => ({
        ...group,
        items: filter === "all" ? group.items : group.items.filter((proposal) => proposal.status === filter),
      }))
      .filter((group) => group.items.length > 0),
    [filter, groupedByOrder],
  );

  const filteredFreelancerProposals = useMemo(
    () => (filter === "all" ? proposals : proposals.filter((proposal) => proposal.status === filter)),
    [filter, proposals],
  );

  const handleAcceptProposal = useCallback((orderId: string, proposalId: string) => {
    updateStatus.mutate(
      { orderId, proposalId, status: "accepted" },
      {
        onError: (error) => {
          if (!isInsufficientFundsError(error)) return;
          const parsed = parseInsufficientFundsError((error as Error).message);
          const proposal = proposals.find((item) => item.id === proposalId);
          setFundsModal({
            isOpen: true,
            available: parsed?.available ?? balance?.available ?? 0,
            required: parsed?.required ?? proposal?.proposed_budget ?? proposal?.order_budget_max ?? 0,
            retryOrderId: orderId,
            retryProposalId: proposalId,
          });
        },
      },
    );
  }, [balance?.available, proposals, updateStatus]);

  const handleDepositSuccess = useCallback(() => {
    if (!fundsModal.retryOrderId || !fundsModal.retryProposalId) return;
    updateStatus.mutate({
      orderId: fundsModal.retryOrderId,
      proposalId: fundsModal.retryProposalId,
      status: "accepted",
    });
    setFundsModal((prev) => ({ ...prev, isOpen: false }));
  }, [fundsModal, updateStatus]);

  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-28 rounded-[24px] border border-[var(--line)] bg-[var(--bg-1)]" />
        <div className="h-48 rounded-[20px] border border-[var(--line)] bg-[var(--bg-1)]" />
        <div className="h-48 rounded-[20px] border border-[var(--line)] bg-[var(--bg-1)]" />
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <EmptyState
        icon={<IconFile size={24} />}
        title={role === "client" ? "Пока нет откликов" : "Вы ещё не откликались"}
        description={role === "client" ? "Опубликуйте заказ, чтобы получить отклики." : "Перейдите на биржу и найдите подходящий заказ."}
        action={
          <FilkaButton onClick={() => router.push("/dashboard/orders")}>
            {role === "client" ? "Мои заказы" : "Биржа заказов"}
          </FilkaButton>
        }
      />
    );
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      <section className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div
            className="rounded-[22px] border p-5"
            style={{
              background:
                "radial-gradient(ellipse 65% 90% at 90% 20%, rgba(102,58,243,0.15), transparent 60%)," +
                "var(--bg-1)",
              borderColor: "rgba(102,58,243,0.18)",
            }}
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-[12px] bg-[rgba(102,58,243,0.12)] text-[var(--mint-300)]">
                <IconCompass size={18} />
              </div>
              <div>
                <div className="text-[18px] font-bold tracking-[-0.02em] text-[var(--fg-0)]">
                  {role === "client" ? "Отклики на заказы" : "Мои отклики"}
                </div>
                <div className="text-[12px] text-[var(--fg-3)]">
                  {role === "client"
                    ? "Список кандидатов и решений по каждому заказу."
                    : "Статусы отправленных предложений и реакция заказчиков."}
                </div>
              </div>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              <FilkaChip>всего · {proposalsByStatus.all}</FilkaChip>
              <FilkaChip tone="warn">новые · {proposalsByStatus.pending}</FilkaChip>
              <FilkaChip tone="muted">приняты · {proposalsByStatus.accepted}</FilkaChip>
              <FilkaChip tone="error">отклонены · {proposalsByStatus.rejected}</FilkaChip>
            </div>
            <FilkaSegmented
              value={filter}
              onChange={setFilter}
              items={[
                { id: "all", label: "Все" },
                { id: "pending", label: "Новые" },
                { id: "accepted", label: "Принятые" },
                { id: "rejected", label: "Отклонённые" },
              ]}
            />
          </div>

          {role === "client" ? (
            <div className="space-y-5">
              {filteredGroups.map((group) => (
                <div key={group.orderId} className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3 px-1">
                    <button type="button" className="text-left" onClick={() => router.push(`/dashboard/orders/${group.orderId}`)}>
                      <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--fg-3)]">Заказ</div>
                      <div className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--fg-0)]">{group.orderTitle}</div>
                    </button>
                    <FilkaChip tone="muted">{group.items.length} откликов</FilkaChip>
                    <div className="ml-auto text-[11px] text-[var(--fg-3)]">сортировка внутри заказа по времени</div>
                  </div>

                  <div className="space-y-3">
                    {group.items.map((proposal, index) => (
                      <FilkaCard
                        key={proposal.id}
                        className="relative p-5"
                        style={index === 0 ? { border: "1px solid rgba(102,58,243,0.28)" } : undefined}
                      >
                        {index === 0 ? (
                          <div className="absolute left-5 top-[-10px] rounded-full bg-[var(--mint-400)] px-3 py-1 text-[10px] font-bold tracking-[0.06em] text-[#05060f]">
                            Лучшее совпадение
                          </div>
                        ) : null}

                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                          <div className="flex gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-[12px] bg-[linear-gradient(135deg,#B6D9FC,#1a0e4a)] text-[14px] font-bold text-[#05060f]">
                              {getInitials(proposal.freelancer_name)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="text-[15px] font-bold tracking-[-0.01em] text-[var(--fg-0)]">{proposal.freelancer_name ?? "Фрилансер"}</div>
                                <FilkaChip tone={statusTone(proposal.status)}>{statusLabel(proposal.status)}</FilkaChip>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-[var(--fg-2)]">
                                <span className="flex items-center gap-1 text-[var(--accent-sun)]">
                                  <IconStar size={12} />
                                  4.9
                                </span>
                                <span>{formatCurrency(proposal.proposed_budget)}</span>
                                <span>{formatTerm(proposal)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-[13.5px] leading-[1.55] text-[var(--fg-1)] ${expandedLetters.has(proposal.id) ? "" : "line-clamp-3"}`}
                            >
                              {proposal.cover_letter}
                            </p>
                            {(proposal.cover_letter?.length ?? 0) > 200 ? (
                              <button
                                type="button"
                                className="mt-1 text-[12px] text-[var(--mint-300)] hover:underline"
                                onClick={() => setExpandedLetters((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(proposal.id)) next.delete(proposal.id);
                                  else next.add(proposal.id);
                                  return next;
                                })}
                              >
                                {expandedLetters.has(proposal.id) ? "Свернуть" : "Читать полностью"}
                              </button>
                            ) : null}
                          </div>

                          <div className="flex gap-2 lg:flex-col lg:items-end">
                            <FilkaButton variant="ghost" size="sm" onClick={() => router.push(`/dashboard/profile/${proposal.freelancer_id}` as never)}>
                              Профиль
                            </FilkaButton>
                            {proposal.status === "pending" && proposal.order_status === "published" ? (
                              <>
                                <FilkaButton size="sm" startContent={<IconCheck size={13} />} onClick={() => handleAcceptProposal(proposal.order_id, proposal.id)}>
                                  Принять
                                </FilkaButton>
                                <FilkaButton
                                  variant="danger"
                                  size="sm"
                                  startContent={<IconClose size={13} />}
                                  onClick={() => updateStatus.mutate({ orderId: proposal.order_id, proposalId: proposal.id, status: "rejected" })}
                                >
                                  Отклонить
                                </FilkaButton>
                              </>
                            ) : (
                              <FilkaButton variant="ghost" size="sm" endContent={<IconArrowRight size={13} />} onClick={() => router.push("/dashboard/messages")}>
                                Чат
                              </FilkaButton>
                            )}
                          </div>
                        </div>

                        {proposal.ai_analysis_for_client ? (
                          <div className="mt-4 rounded-[12px] border border-[rgba(102,58,243,0.18)] bg-[rgba(102,58,243,0.08)] px-4 py-3 text-[12px] leading-[1.55] text-[var(--mint-100)]">
                            <div className="mb-1 flex items-center gap-2 font-semibold text-[var(--mint-200)]">
                              <IconSpark size={12} />
                              AI-анализ отклика
                            </div>
                            {proposal.ai_analysis_for_client}
                          </div>
                        ) : null}
                      </FilkaCard>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFreelancerProposals.map((proposal) => (
                <FilkaCard key={proposal.id} className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-[var(--fg-3)]">Заказ</div>
                      <button
                        type="button"
                        onClick={() => router.push(`/dashboard/orders/${proposal.order_id}`)}
                        className="text-left"
                      >
                        <div className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--fg-0)]">
                          {proposal.order_title ?? `Заказ #${proposal.order_id.slice(0, 8)}`}
                        </div>
                      </button>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <FilkaChip tone={statusTone(proposal.status)}>{statusLabel(proposal.status)}</FilkaChip>
                        {proposal.order_status ? <FilkaChip tone="muted">заказ · {proposal.order_status}</FilkaChip> : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-[var(--fg-2)]">
                        <span>{formatOrderBudget(proposal)}</span>
                        <span>{formatOrderDeadline(proposal)}</span>
                      </div>
                    </div>

                    <div className="min-w-[180px] rounded-[14px] border border-[var(--line)] bg-[var(--bg-1)] p-4">
                      <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-[var(--fg-3)]">Ваше предложение</div>
                      <div className="text-[18px] font-bold tracking-[-0.02em] text-[var(--mint-300)]">{formatCurrency(proposal.proposed_budget)}</div>
                      <div className="mt-1 text-[12px] text-[var(--fg-2)]">{formatTerm(proposal)}</div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[12px] border border-[var(--line)] bg-[var(--bg-1)] p-4 text-[13.5px] leading-[1.6] text-[var(--fg-1)]">
                    {proposal.cover_letter}
                  </div>
                </FilkaCard>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <div
            className="rounded-[18px] border p-5"
            style={{
              background: "linear-gradient(180deg, rgba(102,58,243,0.10), transparent 70%), var(--bg-1)",
              borderColor: "rgba(102,58,243,0.22)",
            }}
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-[rgba(102,58,243,0.12)] text-[var(--mint-300)]">
                <IconSpark size={18} />
              </div>
              <div>
                <div className="text-[15px] font-semibold text-[var(--fg-0)]">AI-помощник</div>
                <div className="t-mono text-[11px] text-[var(--mint-300)]">ранжирует отклики</div>
              </div>
            </div>
            <p className="text-[13px] leading-[1.55] text-[var(--fg-1)]">
              {role === "client"
                ? "Я уже подсветил наиболее сильные отклики. Можно быстро перейти в профиль, принять исполнителя или открыть чат."
                : "Следите за реакцией заказчиков и сравнивайте заказы по бюджету, дедлайну и статусу."}
            </p>
          </div>

          <FilkaCard className="p-5">
            <div className="t-eyebrow mb-3">СТАТИСТИКА</div>
            <div className="space-y-3 text-[13px]">
              {[
                ["Всего откликов", String(proposalsByStatus.all)],
                ["Новых", String(proposalsByStatus.pending)],
                ["Принятых", String(proposalsByStatus.accepted)],
                ["Отклонённых", String(proposalsByStatus.rejected)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border-b border-[var(--line)] pb-3 last:border-b-0 last:pb-0">
                  <span className="text-[var(--fg-2)]">{label}</span>
                  <span className="font-semibold text-[var(--fg-0)]">{value}</span>
                </div>
              ))}
            </div>
          </FilkaCard>

          <FilkaCard className="p-5">
            <div className="t-eyebrow mb-3">БЫСТРЫЕ ДЕЙСТВИЯ</div>
            <div className="grid gap-2">
              <FilkaButton className="justify-start" startContent={<IconSearch size={14} />} onClick={() => router.push("/dashboard/orders")}>
                {role === "client" ? "К заказам" : "Найти ещё заказы"}
              </FilkaButton>
              <FilkaButton variant="ghost" className="justify-start" startContent={<IconShield size={14} />} onClick={() => router.push("/dashboard/notifications")}>
                Проверить уведомления
              </FilkaButton>
            </div>
          </FilkaCard>
        </aside>
      </section>

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
