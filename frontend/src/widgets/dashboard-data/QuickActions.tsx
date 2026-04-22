"use client";

import { Link } from "@heroui/react";
import { useSessionStore } from "@/shared/store/session.store";
import { Plus, Search, Wallet, ArrowUpRight, ArrowDownLeft, User, Settings, Sparkles } from "lucide-react";
import { type ReactNode } from "react";

interface QuickAction {
    label: string;
    description: string;
    icon: ReactNode;
    href: string;
    primary?: boolean;
    iconBg: string;
    iconColor: string;
}

const CLIENT_ACTIONS: QuickAction[] = [
    { label: "Создать заказ", description: "Новая задача на маркетплейс", icon: <Plus size={20} />, href: "/dashboard/orders/new", primary: true, iconBg: "bg-emerald-500/15", iconColor: "text-emerald-300" },
    { label: "Посмотреть отклики", description: "Предложения фрилансеров", icon: <Search size={20} />, href: "/dashboard/proposals", iconBg: "bg-blue-500/15", iconColor: "text-blue-400" },
    { label: "Пополнить баланс", description: "Управление средствами", icon: <ArrowDownLeft size={20} />, href: "/dashboard/balance", iconBg: "bg-emerald-500/15", iconColor: "text-emerald-400" },
    { label: "AI ассистент", description: "Помощь с заказами", icon: <Sparkles size={20} />, href: "/dashboard/ai", iconBg: "bg-amber-500/15", iconColor: "text-amber-400" },
    { label: "Профиль", description: "Настройки аккаунта", icon: <User size={20} />, href: "/dashboard/profile", iconBg: "bg-teal-500/15", iconColor: "text-teal-400" },
    { label: "Настройки", description: "Параметры платформы", icon: <Settings size={20} />, href: "/dashboard/settings", iconBg: "bg-zinc-500/15", iconColor: "text-zinc-400" },
];

const FREELANCER_ACTIONS: QuickAction[] = [
    { label: "Найти заказы", description: "Обзор маркетплейса", icon: <Search size={20} />, href: "/dashboard/orders", primary: true, iconBg: "bg-emerald-500/15", iconColor: "text-emerald-300" },
    { label: "Мои отклики", description: "Статусы предложений", icon: <ArrowUpRight size={20} />, href: "/dashboard/proposals", iconBg: "bg-blue-500/15", iconColor: "text-blue-400" },
    { label: "Вывести средства", description: "Управление доходами", icon: <Wallet size={20} />, href: "/dashboard/balance", iconBg: "bg-emerald-500/15", iconColor: "text-emerald-400" },
    { label: "AI ассистент", description: "Помощь с откликами", icon: <Sparkles size={20} />, href: "/dashboard/ai", iconBg: "bg-amber-500/15", iconColor: "text-amber-400" },
    { label: "Профиль", description: "Настройки аккаунта", icon: <User size={20} />, href: "/dashboard/profile", iconBg: "bg-teal-500/15", iconColor: "text-teal-400" },
    { label: "Настройки", description: "Параметры платформы", icon: <Settings size={20} />, href: "/dashboard/settings", iconBg: "bg-zinc-500/15", iconColor: "text-zinc-400" },
];

export const QuickActions = () => {
    const role = useSessionStore((s) => s.role);
    const actions = role === "freelancer" ? FREELANCER_ACTIONS : CLIENT_ACTIONS;

    return (
        <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Быстрые действия</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {actions.map((action, i) => (
                    <Link
                        key={action.label}
                        href={action.href}
                        className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all duration-200 text-center group animate-fade-in-up ${
                            action.primary
                                ? "bg-emerald-600/10 border-emerald-500/20 hover:bg-emerald-600/15 hover:border-emerald-500/30"
                                : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/10"
                        }`}
                        style={{ animationDelay: `${i * 50}ms` }}
                    >
                        <div className={`w-10 h-10 rounded-xl ${action.iconBg} flex items-center justify-center ${action.iconColor} group-hover:scale-110 transition-transform duration-200`}>
                            {action.icon}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-zinc-200 mb-0.5">{action.label}</p>
                            <p className="text-[10px] text-zinc-500 leading-tight">{action.description}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};
