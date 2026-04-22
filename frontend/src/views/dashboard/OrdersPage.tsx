"use client";

import {
    Button,
    Skeleton,
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    Tooltip,
} from "@heroui/react";
import { Plus, Search, ShoppingBag, Eye, Sparkles } from "lucide-react";
import { useSessionStore } from "@/shared/store/session.store";
import { useMyOrders } from "@/features/order-management";
import { MarketplaceList } from "@/widgets/market-list";
import { AIRecommendations } from "@/widgets/dashboard-data";
import { StatusBadge } from "@/shared/ui/status-badge/StatusBadge";
import { EmptyState } from "@/shared/ui/empty-state/EmptyState";
import { PageHeader } from "@/shared/ui/page-header/PageHeader";
import NextLink from "next/link";
import { useRouter } from "next/navigation";

const ClientOrders = () => {
    const router = useRouter();
    const { data, isLoading } = useMyOrders();
    const orders = data?.items ?? [];

    return (
        <div className="space-y-6 animate-fade-in-up">
            <PageHeader
                title="Мои заказы"
                description="Управляйте своими заказами и откликами исполнителей"
                action={
                    (isLoading || orders.length > 0) && (
                        <Button
                            as={NextLink}
                            href="/dashboard/orders/new"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-500/20"
                            startContent={<Plus size={18} />}
                            radius="full"
                        >
                            Создать заказ
                        </Button>
                    )
                }
            />

            {isLoading ? (
                <div className="glass-card p-4 rounded-2xl">
                    <Skeleton className="w-full h-12 rounded-lg mb-4" classNames={{ base: "bg-zinc-800" }} />
                    <Skeleton className="w-full h-16 rounded-lg mb-2" classNames={{ base: "bg-zinc-800" }} />
                    <Skeleton className="w-full h-16 rounded-lg mb-2" classNames={{ base: "bg-zinc-800" }} />
                    <Skeleton className="w-full h-16 rounded-lg" classNames={{ base: "bg-zinc-800" }} />
                </div>
            ) : orders.length === 0 ? (
                <EmptyState
                    icon={<Search size={24} />}
                    title="У вас пока нет заказов"
                    description="Создайте первый заказ, чтобы начать получать отклики от фрилансеров"
                    action={
                        <Button
                            className="bg-emerald-600 text-white shadow-lg glow-sm hover:bg-emerald-500 transition-all font-medium"
                            onPress={() => router.push("/dashboard/orders/new")}
                        >
                            Создать заказ
                        </Button>
                    }
                />
            ) : (
                <Table
                    aria-label="Таблица заказов клиента"
                    classNames={{
                        base: "glass-card rounded-2xl p-2",
                        table: "min-w-full",
                        thead: "[&>tr]:first:rounded-none [&>tr]:last:rounded-none",
                        th: "bg-transparent text-zinc-400 font-medium border-b border-zinc-800/60 pb-3",
                        td: "py-4 border-b border-zinc-800/30 text-zinc-300",
                    }}
                    selectionMode="none"
                >
                    <TableHeader>
                        <TableColumn>НАЗВАНИЕ И БЮДЖЕТ</TableColumn>
                        <TableColumn>СТАТУС</TableColumn>
                        <TableColumn>ОТКЛИКИ</TableColumn>
                        <TableColumn>AI-АНАЛИЗ</TableColumn>
                        <TableColumn align="end">РЕАКЦИЯ</TableColumn>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order) => {
                            const hasProposals = order.proposals_count > 0;
                            return (
                                <TableRow key={order.id} className="hover:bg-white/[0.02] cursor-pointer group" onClick={() => router.push(`/dashboard/orders/${order.id}`)}>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors line-clamp-1">{order.title}</span>
                                            <span className="text-sm font-medium text-emerald-400">₽{order.budget_min.toLocaleString()} – ₽{order.budget_max.toLocaleString()}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={order.status} />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${hasProposals ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-800 text-zinc-500"}`}>
                                                {order.proposals_count}
                                            </span>
                                            {hasProposals && <span className="text-xs text-zinc-500">новые</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-zinc-600">—</span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end">
                                            <Tooltip content="Смотреть детали">
                                                <Button
                                                    isIconOnly
                                                    variant="light"
                                                    size="sm"
                                                    className="text-zinc-400 hover:text-emerald-400"
                                                    onPress={() => router.push(`/dashboard/orders/${order.id}`)}
                                                >
                                                    <Eye size={18} />
                                                </Button>
                                            </Tooltip>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            )}
        </div>
    );
};

export const OrdersPage = () => {
    const role = useSessionStore((s) => s.role);

    if (role === "freelancer") {
        return (
            <div className="space-y-6 animate-fade-in-up">
                <PageHeader
                    title="Маркетплейс"
                    description="Найдите подходящие заказы"
                    action={
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <ShoppingBag size={20} />
                        </div>
                    }
                />
                <AIRecommendations />
                <MarketplaceList />
            </div>
        );
    }

    return <ClientOrders />;
};
