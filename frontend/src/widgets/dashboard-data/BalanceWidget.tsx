"use client";

import { Card, CardBody, Button, Link, Skeleton } from "@heroui/react";
import { Wallet, ShieldAlert, ArrowUpRight, History } from "lucide-react";
import { useBalance } from "@/features/balance-management";

export const BalanceWidget = () => {
    const { data: balance, isLoading, isError } = useBalance();

    const available = balance?.available ?? 0;
    const frozen = balance?.pending ?? 0;
    const total = available + frozen;

    if (isLoading) {
        return (
            <Card className="glass-card border-zinc-800/60 bg-zinc-900/40 w-full animate-fade-in-up">
                <CardBody className="p-6 md:p-8 flex flex-col justify-between h-full">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <Skeleton className="w-10 h-10 rounded-xl" classNames={{ base: "bg-zinc-800" }} />
                            <Skeleton className="h-5 w-28 rounded-lg" classNames={{ base: "bg-zinc-800" }} />
                        </div>
                        <Skeleton className="h-10 w-40 rounded-lg mb-8" classNames={{ base: "bg-zinc-800" }} />
                        <div className="space-y-4">
                            <Skeleton className="h-12 w-full rounded-xl" classNames={{ base: "bg-zinc-800" }} />
                            <Skeleton className="h-12 w-full rounded-xl" classNames={{ base: "bg-zinc-800" }} />
                        </div>
                    </div>
                </CardBody>
            </Card>
        );
    }

    return (
        <Card className="glass-card border-zinc-800/60 bg-zinc-900/40 w-full animate-fade-in-up">
            <CardBody className="p-6 md:p-8 flex flex-col justify-between h-full">
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <Wallet size={20} />
                            </div>
                            <h3 className="text-lg font-semibold text-zinc-100">Мой баланс</h3>
                        </div>
                        <Button
                            as={Link}
                            href="/dashboard/balance"
                            isIconOnly
                            variant="light"
                            className="text-zinc-500 hover:text-white hover:bg-white/[0.05]"
                        >
                            <ArrowUpRight size={20} />
                        </Button>
                    </div>

                    {isError ? (
                        <p className="text-sm text-zinc-500">Не удалось загрузить баланс</p>
                    ) : (
                        <>
                            <div className="space-y-1 mb-8">
                                <p className="text-sm font-medium text-zinc-400">Всего средств</p>
                                <p className="text-3xl font-bold text-white flex items-baseline gap-1">
                                    {total.toLocaleString("ru-RU")}
                                    <span className="text-xl text-zinc-500">₽</span>
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/50">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                        <span className="text-sm text-zinc-400">Доступно</span>
                                    </div>
                                    <span className="text-sm font-semibold text-emerald-400">{available.toLocaleString("ru-RU")} ₽</span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert size={14} className="text-purple-400" />
                                        <span className="text-sm text-purple-300/80">В Escrow (заморожено)</span>
                                    </div>
                                    <span className="text-sm font-semibold text-purple-400">{frozen.toLocaleString("ru-RU")} ₽</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="mt-6 flex items-center gap-3">
                    <Button
                        as={Link}
                        href="/dashboard/balance?action=topup"
                        className="flex-1 bg-purple-600 text-white font-semibold shadow-lg hover:bg-purple-500"
                    >
                        Пополнить
                    </Button>
                    <Button
                        as={Link}
                        href="/dashboard/balance?action=withdraw"
                        variant="flat"
                        className="flex-1 bg-zinc-800 text-white hover:bg-zinc-700"
                    >
                        Вывести
                    </Button>
                </div>
            </CardBody>
        </Card>
    );
};
