"use client";

import { useEffect, useState } from "react";
import { useSessionStore } from "@/shared/store/session.store";
import { useActiveEscrows, useBalance, useRefundEscrow, useReleaseEscrow, useTransactions } from "@/features/balance-management";
import { notify } from "@/shared/notifications/notify";
import { DepositModal } from "@/shared/ui/deposit-modal/DepositModal";
import { WithdrawModal } from "@/shared/ui/withdraw-modal/WithdrawModal";
import { StatusBadge } from "@/shared/ui/status-badge/StatusBadge";
import { formatMoney } from "@/shared/lib/money";
import {
    FilkaButton,
    FilkaCard,
    FilkaChip,
    IconArrowDown as ArrowDownLeft,
    IconArrowUpRight as ArrowUpRight,
    IconWallet as CircleDollarSign,
    IconWallet as CreditCard,
    IconFile as Receipt,
    IconShield as Shield,
    IconLightning as TrendingUp,
} from "@/shared/ui/filka";

const useDisclosure = () => {
    const [isOpen, setIsOpen] = useState(false);
    return {
        isOpen,
        onOpen: () => setIsOpen(true),
        onClose: () => setIsOpen(false),
        onOpenChange: setIsOpen,
    };
};

const AnimatedNumber = ({ value }: { value: number }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let frame = 0;
        let startTimestamp: number | null = null;
        const duration = 800;

        const step = (timestamp: number) => {
            if (startTimestamp === null) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            setDisplayValue(Math.floor(progress * value));
            if (progress < 1) frame = window.requestAnimationFrame(step);
        };

        frame = window.requestAnimationFrame(step);
        return () => window.cancelAnimationFrame(frame);
    }, [value]);

    return <>{displayValue.toLocaleString("ru-RU")}</>;
};

const TRANSACTION_META: Record<string, { label: string; positive: boolean }> = {
    deposit: { label: "Пополнение", positive: true },
    withdrawal: { label: "Вывод", positive: false },
    escrow_hold: { label: "Удержание эскроу", positive: false },
    escrow_release: { label: "Выплата эскроу", positive: true },
    escrow_refund: { label: "Возврат эскроу", positive: true },
};

export const BalancePage = () => {
    const role = useSessionStore((s) => s.role);
    const { data: balance, isLoading: isBalanceLoading } = useBalance();
    const { data: transactions, isLoading: isTransactionsLoading } = useTransactions();
    const { data: activeEscrows, isLoading: isEscrowsLoading } = useActiveEscrows();
    const releaseEscrow = useReleaseEscrow();
    const refundEscrow = useRefundEscrow();
    const depositModal = useDisclosure();
    const withdrawModal = useDisclosure();

    const metrics = [
        {
            label: "Доступно",
            value: balance?.available ?? 0,
            accent: "text-[var(--mint-300)]",
            bg: "bg-[rgba(102,58,243,0.1)] border-[rgba(102,58,243,0.22)]",
            icon: CircleDollarSign,
        },
        {
            label: "На удержании",
            value: balance?.pending ?? 0,
            accent: "text-[var(--accent-sun)]",
            bg: "bg-[rgba(245,226,122,0.08)] border-[rgba(245,226,122,0.22)]",
            icon: Shield,
        },
        {
            label: role === "client" ? "Потрачено" : "Заработано",
            value: role === "client" ? balance?.total_spent ?? 0 : balance?.total_earned ?? 0,
            accent: "text-[var(--info)]",
            bg: "bg-[rgba(125,211,252,0.08)] border-[rgba(125,211,252,0.2)]",
            icon: TrendingUp,
        },
        {
            label: role === "client" ? "Оборот аккаунта" : "Всего выплат",
            value: role === "client" ? balance?.total_spent ?? 0 : balance?.total_earned ?? 0,
            accent: "text-[var(--fg-0)]",
            bg: "bg-[rgba(255,255,255,0.03)] border-[var(--line)]",
            icon: CreditCard,
        },
    ];

    const recentTransactions = transactions ?? [];

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="t-eyebrow mb-2">КОШЕЛЁК · ДВИЖЕНИЕ СРЕДСТВ</div>
                    <h1 className="mb-2 text-[30px] font-bold tracking-[-0.03em] text-[var(--fg-0)]">Баланс и эскроу</h1>
                    <p className="max-w-[640px] text-[14px] leading-[1.55] text-[var(--fg-2)]">
                        {role === "client"
                            ? "Пополняйте счёт, резервируйте средства в безопасной сделке и контролируйте все списания по заказам."
                            : "Следите за доступным балансом, удержаниями и выплатами после завершения этапов работы."}
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    {role === "client" ? (
                        <FilkaButton startContent={<ArrowDownLeft size={16} />} onClick={depositModal.onOpen}>
                            Пополнить счёт
                        </FilkaButton>
                    ) : (
                        <FilkaButton startContent={<ArrowUpRight size={16} />} onClick={withdrawModal.onOpen}>
                            Вывести средства
                        </FilkaButton>
                    )}
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => {
                    const Icon = metric.icon;
                    return (
                        <FilkaCard key={metric.label} className="rounded-[14px] bg-[var(--bg-2)] p-4">
                            <div className="mb-3 flex items-center gap-3">
                                <div className={`grid h-10 w-10 place-items-center rounded-[11px] border ${metric.bg} ${metric.accent}`}>
                                    <Icon size={18} />
                                </div>
                                <span className="text-[13px] text-[var(--fg-2)]">{metric.label}</span>
                            </div>
                            <div className={`text-[30px] font-bold tracking-[-0.025em] ${metric.accent}`}>
                                <span className="mr-1">₽</span>
                                {isBalanceLoading ? "—" : <AnimatedNumber value={metric.value} />}
                            </div>
                        </FilkaCard>
                    );
                })}
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                <FilkaCard className="rounded-[14px] bg-[var(--bg-1)] p-5">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-[11px] border border-[rgba(102,58,243,0.22)] bg-[rgba(102,58,243,0.08)] text-[var(--mint-300)]">
                            <Receipt size={18} />
                        </div>
                        <div>
                            <div className="text-[17px] font-semibold text-[var(--fg-0)]">История транзакций</div>
                            <div className="t-caption">все пополнения, удержания и выплаты</div>
                        </div>
                    </div>

                    {isTransactionsLoading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div key={index} className="rounded-[12px] border border-[var(--line)] bg-[var(--bg-2)] p-4">
                                    <div className="mb-2 h-4 w-1/3 animate-pulse rounded bg-[var(--bg-3)]" />
                                    <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--bg-3)]" />
                                </div>
                            ))}
                        </div>
                    ) : recentTransactions.length > 0 ? (
                        <div className="space-y-3">
                            {recentTransactions.map((transaction) => {
                                const meta = TRANSACTION_META[transaction.type] ?? { label: transaction.type, positive: transaction.amount >= 0 };
                                const isPositive = meta.positive;
                                return (
                                    <div
                                        key={transaction.id}
                                        className="flex items-center gap-4 rounded-[12px] border border-[var(--line)] bg-[var(--bg-2)] px-4 py-3 transition-colors hover:border-[rgba(102,58,243,0.22)]"
                                    >
                                        <div className={`grid h-11 w-11 place-items-center rounded-[11px] border ${isPositive
                                            ? "border-[rgba(102,58,243,0.22)] bg-[rgba(102,58,243,0.1)] text-[var(--mint-300)]"
                                            : "border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.08)] text-[#fca5a5]"
                                            }`}>
                                            {isPositive ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-[14px] font-semibold text-[var(--fg-0)]">
                                                {transaction.description || "Финансовая операция"}
                                            </div>
                                            <div className="mt-1 text-[12px] text-[var(--fg-2)]">
                                                {new Date(transaction.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })} · {meta.label}
                                            </div>
                                        </div>
                                        <div className={`text-right text-[16px] font-bold ${isPositive ? "text-[var(--mint-300)]" : "text-[var(--fg-0)]"}`}>
                                            {isPositive ? "+" : "−"}{formatMoney(Math.abs(transaction.amount))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="rounded-[12px] border border-dashed border-[var(--line)] bg-[var(--bg-2)] px-5 py-10 text-center">
                            <div className="text-[15px] font-semibold text-[var(--fg-0)]">Транзакций пока нет</div>
                            <div className="mt-2 text-[13px] text-[var(--fg-2)]">История начнёт заполняться после первого пополнения, удержания или выплаты.</div>
                        </div>
                    )}
                </FilkaCard>

                <div className="space-y-4">
                    <FilkaCard className="rounded-[14px] border-[rgba(102,58,243,0.22)] bg-[linear-gradient(135deg,rgba(102,58,243,0.12),transparent_60%),var(--bg-1)] p-5">
                        <div className="mb-3 flex items-center gap-3">
                            <Shield size={18} className="text-[var(--mint-300)]" />
                            <div className="t-caption text-[var(--mint-300)]">ESCROW · АКТИВЕН</div>
                        </div>
                        <div className="text-[30px] font-bold tracking-[-0.03em] text-[var(--fg-0)]">
                            {formatMoney((role === "client" ? balance?.pending : balance?.available) ?? 0)}
                        </div>
                        <div className="mt-1 text-[13px] text-[var(--fg-2)]">
                            {role === "client"
                                ? "Эта сумма уже зарезервирована по активным сделкам и защищает обе стороны."
                                : "Средства становятся доступными после подтверждения этапа или полного завершения заказа."}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <FilkaChip>безопасная сделка</FilkaChip>
                            <FilkaChip tone="muted">арбитраж включён</FilkaChip>
                        </div>
                    </FilkaCard>

                    <FilkaCard className="rounded-[14px] bg-[var(--bg-1)] p-5">
                        <div className="t-eyebrow mb-3">СВОДКА · 30 ДНЕЙ</div>
                        <div className="space-y-2">
                            {[
                                ["Доступно", formatMoney(balance?.available ?? 0)],
                                ["На удержании", formatMoney(balance?.pending ?? 0)],
                                [
                                    role === "client" ? "Всего потрачено" : "Всего заработано",
                                    formatMoney((role === "client" ? balance?.total_spent : balance?.total_earned) ?? 0),
                                ],
                            ].map(([label, value], index) => (
                                <div key={label} className={`flex items-center justify-between py-2 text-[13px] ${index > 0 ? "border-t border-[var(--line)]" : ""}`}>
                                    <span className="text-[var(--fg-2)]">{label}</span>
                                    <span className="font-semibold text-[var(--fg-0)]">{value}</span>
                                </div>
                            ))}
                        </div>
                    </FilkaCard>

                    <FilkaCard className="rounded-[14px] bg-[var(--bg-1)] p-5">
                        <div className="t-eyebrow mb-3">ПРАВИЛА ВЫПЛАТ</div>
                        <div className="space-y-3 text-[13px] leading-[1.5] text-[var(--fg-2)]">
                            <p>Средства резервируются мгновенно и остаются в эскроу до подтверждения работы.</p>
                            <p>После приёмки этапа деньги переходят исполнителю без ручных заявок со стороны заказчика.</p>
                            <p>Если нужен спор, арбитраж открывается прямо из карточки заказа и использует всю историю переписки.</p>
                        </div>
                    </FilkaCard>

                    <FilkaCard className="rounded-[14px] bg-[var(--bg-1)] p-5">
                        <div className="t-eyebrow mb-3">АКТИВНЫЕ ЭСКРОУ</div>
                        {isEscrowsLoading ? (
                            <div className="text-[13px] text-[var(--fg-3)]">Загружаем сделки…</div>
                        ) : (activeEscrows ?? []).length > 0 ? (
                            <div className="space-y-3">
                                {(activeEscrows ?? []).map((escrow) => (
                                    <div key={escrow.order_id} className="rounded-[12px] border border-[var(--line)] bg-[var(--bg-2)] p-3">
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="t-mono truncate text-[11px] text-[var(--fg-3)]">#{escrow.order_id.slice(0, 8).toUpperCase()}</div>
                                                <div className="text-[15px] font-bold text-[var(--fg-0)]">{formatMoney(escrow.amount)}</div>
                                            </div>
                                            <StatusBadge status={escrow.status} />
                                        </div>
                                        {role === "client" ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                <FilkaButton
                                                    size="sm"
                                                    loading={releaseEscrow.isPending}
                                                    onClick={() => {
                                                        releaseEscrow.mutate(escrow.order_id, {
                                                            onSuccess: () => notify.success({ title: "Эскроу выплачен", type: "balance" }),
                                                            onError: (error) => notify.error({ title: "Не удалось выплатить", message: error instanceof Error ? error.message : "Попробуйте позже" }),
                                                        });
                                                    }}
                                                >
                                                    Освободить
                                                </FilkaButton>
                                                <FilkaButton
                                                    size="sm"
                                                    variant="ghost"
                                                    loading={refundEscrow.isPending}
                                                    onClick={() => {
                                                        if (typeof window !== "undefined" && !window.confirm("Вернуть средства из эскроу?")) return;
                                                        refundEscrow.mutate(escrow.order_id, {
                                                            onSuccess: () => notify.success({ title: "Эскроу возвращён", type: "balance" }),
                                                            onError: (error) => notify.error({ title: "Не удалось вернуть", message: error instanceof Error ? error.message : "Попробуйте позже" }),
                                                        });
                                                    }}
                                                >
                                                    Возврат
                                                </FilkaButton>
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-[13px] leading-[1.5] text-[var(--fg-3)]">
                                Сейчас нет активных удержаний. После принятия отклика сделка появится здесь.
                            </div>
                        )}
                    </FilkaCard>
                </div>
            </div>

            <DepositModal isOpen={depositModal.isOpen} onClose={depositModal.onClose} />
            <WithdrawModal isOpen={withdrawModal.isOpen} onClose={withdrawModal.onClose} />
        </div>
    );
};
