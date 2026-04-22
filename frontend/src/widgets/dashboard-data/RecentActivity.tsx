"use client";

import { useDashboardData } from "@/features/dashboard-stats";
import { Clock, FileText, MessageSquare, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button, Link } from "@heroui/react";

const TYPE_ICONS: Record<string, ReactNode> = {
    order: <FileText size={16} className="text-emerald-400" />,
    proposal: <MessageSquare size={16} className="text-blue-400" />,
    message: <MessageSquare size={16} className="text-green-400" />,
    payment: <CheckCircle size={16} className="text-emerald-400" />,
    default: <AlertCircle size={16} className="text-zinc-400" />,
};

const TYPE_LINKS: Record<string, string> = {
    order: "/dashboard/orders",
    proposal: "/dashboard/proposals",
    message: "/dashboard/messages",
    payment: "/dashboard/balance",
};

const formatRelativeTime = (dateStr: string): string => {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diff = now - date;
    const minutes = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);

    if (minutes < 1) return "только что";
    if (minutes < 60) return `${minutes} мин. назад`;
    if (hours < 24) return `${hours} ч. назад`;
    if (days < 7) return `${days} дн. назад`;
    return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
};

const INITIAL_COUNT = 5;
const STEP = 5;

export const RecentActivity = () => {
    const { data, isLoading } = useDashboardData();
    const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);

    if (isLoading) {
        return (
            <div className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Последняя активность</h3>
                <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex gap-3 animate-pulse">
                            <div className="w-8 h-8 rounded-lg bg-zinc-800" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-zinc-800 rounded w-3/4" />
                                <div className="h-3 bg-zinc-800 rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const activities = data?.recentActivity ?? [];
    const visible = activities.slice(0, visibleCount);
    const hasMore = visibleCount < activities.length;

    return (
        <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock size={18} className="text-emerald-400" />
                Последняя активность
            </h3>
            {activities.length === 0 ? (
                <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-3">
                        <Clock size={20} />
                    </div>
                    <p className="text-zinc-500 text-sm mb-3">Пока нет активности</p>
                    <Button
                        as={Link}
                        href="/dashboard/orders"
                        size="sm"
                        variant="flat"
                        className="text-emerald-400"
                        endContent={<ArrowRight size={14} />}
                    >
                        Начать работу
                    </Button>
                </div>
            ) : (
                <>
                    <div className="space-y-1">
                        {visible.map((item, i) => (
                            <Link
                                key={item.id}
                                href={TYPE_LINKS[item.type] ?? "/dashboard"}
                                className="flex gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors animate-fade-in-up group"
                                style={{ animationDelay: `${i * 80}ms` }}
                            >
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                                    {TYPE_ICONS[item.type] ?? TYPE_ICONS.default}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-zinc-200 font-medium truncate">{item.title}</p>
                                    <p className="text-xs text-zinc-500 truncate">{item.description}</p>
                                </div>
                                <span className="text-xs text-zinc-600 shrink-0 self-center">
                                    {formatRelativeTime(item.createdAt)}
                                </span>
                            </Link>
                        ))}
                    </div>
                    {hasMore && (
                        <Button
                            size="sm"
                            variant="light"
                            className="text-emerald-400 hover:text-emerald-300 mt-3 w-full"
                            onPress={() => setVisibleCount((c) => c + STEP)}
                        >
                            Показать ещё
                        </Button>
                    )}
                </>
            )}
        </div>
    );
};
