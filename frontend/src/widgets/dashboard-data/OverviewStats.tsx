"use client";

import { useSessionStore } from "@/shared/store/session.store";
import { useDashboardStats } from "@/features/dashboard-stats";
import { StatCard } from "@/shared/ui/stat-card/StatCard";
import { Briefcase, TrendingUp, MessageSquare, Wallet } from "lucide-react";
import { type ReactNode } from "react";

const ICON_MAP: Record<string, ReactNode> = {
    "Мои заказы": <Briefcase size={20} />,
    "Активные": <TrendingUp size={20} />,
    "Получено откликов": <MessageSquare size={20} />,
    "Баланс": <Wallet size={20} />,
    "Выполнено": <Briefcase size={20} />,
    "Откликов": <MessageSquare size={20} />,
    "В работе": <TrendingUp size={20} />,
};

const FALLBACK_CLIENT = [
    { value: "0", label: "Мои заказы" },
    { value: "0", label: "Активные" },
    { value: "0", label: "Получено откликов" },
    { value: "₽0", label: "Баланс" },
];

const FALLBACK_FREELANCER = [
    { value: "0", label: "Выполнено" },
    { value: "0", label: "В работе" },
    { value: "0", label: "Откликов" },
    { value: "₽0", label: "Баланс" },
];

const DEFAULT_ICONS = [
    <Briefcase key="b" size={20} />,
    <TrendingUp key="t" size={20} />,
    <MessageSquare key="m" size={20} />,
    <Wallet key="w" size={20} />,
];

export const OverviewStats = () => {
    const role = useSessionStore((s) => s.role);
    const { data, isLoading } = useDashboardStats();

    const fallback = role === "freelancer" ? FALLBACK_FREELANCER : FALLBACK_CLIENT;
    const items = data?.stats?.length
        ? data.stats.map((s, i) => ({
            ...s,
            icon: ICON_MAP[s.label] ?? DEFAULT_ICONS[i % DEFAULT_ICONS.length],
        }))
        : fallback.map((s, i) => ({
            ...s,
            icon: ICON_MAP[s.label] ?? DEFAULT_ICONS[i % DEFAULT_ICONS.length],
        }));

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {items.map((item, i) => (
                <div
                    key={i}
                    className={`animate-fade-in-up ${isLoading ? "opacity-50" : ""}`}
                    style={{ animationDelay: `${i * 100}ms` }}
                >
                    <StatCard value={item.value} label={item.label} icon={item.icon} />
                </div>
            ))}
        </div>
    );
};
