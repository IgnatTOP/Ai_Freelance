"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, Button, Divider, useDisclosure } from "@heroui/react";
import { Wallet, ArrowUpRight, ArrowDownLeft, TrendingUp, DollarSign, Receipt, CreditCard } from "lucide-react";
import { useSessionStore } from "@/shared/store/session.store";
import { useBalance, useTransactions } from "@/features/balance-management";
import { PageHeader } from "@/shared/ui/page-header/PageHeader";
import { EmptyState } from "@/shared/ui/empty-state/EmptyState";
import { DepositModal } from "@/shared/ui/deposit-modal/DepositModal";
import { WithdrawModal } from "@/shared/ui/withdraw-modal/WithdrawModal";

// Animated counter effect
const AnimatedNumber = ({ value }: { value: number }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTimestamp: number | null = null;
        const duration = 1000;
        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            setDisplayValue(Math.floor(progress * value));
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }, [value]);

    return <>{displayValue.toLocaleString()}</>;
};

export const BalancePage = () => {
    const role = useSessionStore((s) => s.role);
    const { data: balance, isLoading: balLoading } = useBalance();
    const { data: transactions, isLoading: txLoading } = useTransactions();
    const depositModal = useDisclosure();
    const withdrawModal = useDisclosure();

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <PageHeader
                    title="Баланс"
                    description={role === "client" ? "Управление средствами и escrow" : "Ваши доходы и выплаты"}
                />
                <div className="flex gap-3 shrink-0 mb-4 sm:mb-0">
                    {role === "client" ? (
                        <>
                            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 shadow-lg shadow-emerald-500/20" startContent={<ArrowDownLeft size={18} />} radius="full" onPress={depositModal.onOpen}>
                                Пополнить счет
                            </Button>
                        </>
                    ) : (
                        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 shadow-lg shadow-emerald-500/20" startContent={<ArrowUpRight size={18} />} radius="full" onPress={withdrawModal.onOpen}>
                            Вывести средства
                        </Button>
                    )}
                </div>
            </div>

            {/* Balance cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Доступно", value: balance?.available ?? 0, icon: <Wallet size={20} />, accent: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
                    { label: "На удержании", value: balance?.pending ?? 0, icon: <DollarSign size={20} />, accent: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
                    { label: role === "client" ? "Потрачено в этом мес." : "Заработано в этом мес.", value: role === "client" ? (balance?.total_spent ?? 0) : (balance?.total_earned ?? 0), icon: <TrendingUp size={20} />, accent: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
                    { label: role === "client" ? "Всего потрачено" : "Всего заработано", value: role === "client" ? (balance?.total_spent ?? 0) : (balance?.total_earned ?? 0), icon: <CreditCard size={20} />, accent: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
                ].map((s, i) => (
                    <div key={i} className={`glass-card rounded-2xl p-5 border border-white/[0.04] hover:border-white/10 transition-colors ${balLoading ? "animate-pulse" : "animate-fade-in-up"}`} style={{ animationDelay: `${i * 100}ms` }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.border} border flex items-center justify-center ${s.accent}`}>
                                {s.icon}
                            </div>
                            <span className="text-sm text-zinc-400 font-medium">{s.label}</span>
                        </div>
                        <p className={`text-3xl font-bold tracking-tight ${s.accent}`}>
                            ₽<AnimatedNumber value={s.value} />
                        </p>
                    </div>
                ))}
            </div>

            {/* Transactions */}
            <div className="glass-card rounded-2xl p-6 md:p-8 min-h-[400px]">
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                    <Receipt size={20} className="text-emerald-400" /> История транзакций
                </h3>

                {txLoading ? (
                    <div className="space-y-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex gap-4 p-4 rounded-xl bg-zinc-900/40 border border-white/[0.02] animate-pulse">
                                <div className="w-12 h-12 rounded-xl bg-zinc-800" />
                                <div className="flex-1 py-1">
                                    <div className="h-4 bg-zinc-800 rounded w-1/3 mb-2" />
                                    <div className="h-3 bg-zinc-800 rounded w-1/4" />
                                </div>
                                <div className="w-24 h-6 bg-zinc-800 rounded" />
                            </div>
                        ))}
                    </div>
                ) : !transactions?.length ? (
                    <div className="pt-8">
                        <EmptyState
                            icon={<Receipt size={32} />}
                            title="Транзакций пока нет"
                            description="Здесь будет отображаться вся финансовая история: пополнения, удержания и выплаты."
                        />
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transactions.map((tx, i) => {
                            const isPositive = tx.type === "deposit" || tx.type === "earning";
                            return (
                                <div key={tx.id} className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900/30 border border-white/[0.04] hover:border-emerald-500/20 hover:bg-zinc-900/80 transition-all duration-200">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isPositive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                                        }`}>
                                        {isPositive ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-medium text-zinc-200 truncate">{tx.description}</p>
                                        <div className="flex items-center gap-2 text-sm text-zinc-500 mt-1">
                                            <span>{new Date(tx.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</span>
                                            <span>•</span>
                                            <span className="capitalize">{tx.type}</span>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className={`text-lg font-bold tabular-nums ${isPositive ? "text-emerald-400" : "text-zinc-200"}`}>
                                            {isPositive ? "+" : "−"}₽{Math.abs(tx.amount).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <DepositModal isOpen={depositModal.isOpen} onClose={depositModal.onClose} />
            <WithdrawModal isOpen={withdrawModal.isOpen} onClose={withdrawModal.onClose} />
        </div>
    );
};
