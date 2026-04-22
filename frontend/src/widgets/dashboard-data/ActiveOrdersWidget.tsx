"use client";

import { useSessionStore } from "@/shared/store/session.store";
import { useMyOrders } from "@/features/order-management";
import { Card, CardBody, Button, Link, Skeleton } from "@heroui/react";
import { ArrowRight, Briefcase, FileText } from "lucide-react";
import { StatusBadge } from "@/shared/ui/status-badge/StatusBadge";
import { EmptyState } from "@/shared/ui/empty-state/EmptyState";
import NextLink from "next/link";

export const ActiveOrdersWidget = () => {
    const role = useSessionStore((s) => s.role);
    const { data, isLoading } = useMyOrders({ limit: 5 }); // Custom hook might not support limit but we'll slice it

    // Filter out completed and cancelled to get "active" only
    const activeOrders = (data?.items ?? [])
        .filter(o => o.status !== "completed" && o.status !== "cancelled")
        .slice(0, 5);

    if (isLoading) {
        return (
            <Card className="glass-card  animate-fade-in-up">
                <CardBody className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                            <Briefcase size={20} />
                        </div>
                        <h3 className="text-lg font-semibold text-zinc-100">Активные заказы</h3>
                    </div>
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/50">
                                <div className="flex justify-between items-start mb-2">
                                    <Skeleton className="rounded-lg w-2/3 h-5" classNames={{ base: "bg-zinc-800", content: "bg-zinc-700" }} />
                                    <Skeleton className="rounded-lg w-16 h-5" classNames={{ base: "bg-zinc-800", content: "bg-zinc-700" }} />
                                </div>
                                <div className="flex justify-between items-center mt-3">
                                    <Skeleton className="rounded-lg w-1/4 h-4" classNames={{ base: "bg-zinc-800", content: "bg-zinc-700" }} />
                                    <Skeleton className="rounded-lg w-1/5 h-4" classNames={{ base: "bg-zinc-800", content: "bg-zinc-700" }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardBody>
            </Card>
        );
    }

    if (activeOrders.length === 0) {
        return (
            <div className="animate-fade-in-up">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                        <Briefcase size={20} />
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-100">Активные заказы</h3>
                </div>
                <EmptyState
                    title="Нет активных заказов"
                    description="Сейчас у вас нет заказов в работе. Вы можете создать новый заказ для поиска исполнителей."
                    icon={<Briefcase size={28} />}
                    action={
                        <Button
                            as={NextLink}
                            href="/dashboard/orders/new"
                            className="bg-purple-600 text-white shadow-lg glow-sm hover:bg-purple-500 transition-all"
                        >
                            Создать заказ
                        </Button>
                    }
                />
            </div>
        );
    }

    return (
        <Card className="glass-card border-zinc-800/60 transition-all duration-300 animate-fade-in-up">
            <CardBody className="p-6">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                            <Briefcase size={20} />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Активные заказы</h3>
                    </div>
                    <Button
                        as={NextLink}
                        href="/dashboard/orders"
                        variant="light"
                        size="sm"
                        className="text-purple-400 hover:text-purple-300"
                        endContent={<ArrowRight size={14} />}
                    >
                        Все
                    </Button>
                </div>

                <div className="space-y-3">
                    {activeOrders.map((order, i) => (
                        <NextLink
                            key={order.id}
                            href={`/dashboard/orders/${order.id}`}
                            className="block group"
                        >
                            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/50 hover:bg-zinc-900/80 hover:border-purple-500/30 transition-all duration-200">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <h4 className="text-sm font-medium text-zinc-200 group-hover:text-purple-300 transition-colors line-clamp-1">
                                        {order.title}
                                    </h4>
                                    <div className="shrink-0">
                                        <StatusBadge status={order.status} />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-xs text-zinc-500">
                                    <div className="flex items-center gap-2">
                                        <FileText size={12} className="text-zinc-600" />
                                        {order.proposals_count} откликов
                                    </div>
                                    <span className="font-medium text-purple-400/80">
                                        ₽{order.budget_max.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </NextLink>
                    ))}
                </div>
            </CardBody>
        </Card>
    );
};
