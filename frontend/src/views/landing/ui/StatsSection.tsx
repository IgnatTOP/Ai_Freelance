"use client";

import { Users, CheckCircle, TrendingUp, Star } from "lucide-react";
import { SectionHeading } from "@/shared/ui/section-heading/SectionHeading";
import { StatCard } from "@/shared/ui/stat-card/StatCard";
import { usePublicLandingStats } from "@/features/dashboard-stats";

const FALLBACK_STATS = [
    { value: "10000+", label: "Зарегистрированных фрилансеров", icon: <Users size={22} strokeWidth={1.8} /> },
    { value: "5000+", label: "Завершённых проектов", icon: <CheckCircle size={22} strokeWidth={1.8} /> },
    { value: "50M+ ₽", label: "Общий оборот платформы", icon: <TrendingUp size={22} strokeWidth={1.8} /> },
    { value: "4.9", label: "Средний рейтинг исполнителей", icon: <Star size={22} strokeWidth={1.8} /> },
] as const;

const ACCENTS = ["accent-bar-purple", "accent-bar-emerald", "accent-bar-amber", "accent-bar-blue"];

const formatVolume = (value: number): string => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M ₽`;
    if (value >= 1_000) return `${Math.round(value / 1_000)}K ₽`;
    return `${Math.round(value)} ₽`;
};

export const StatsSection = () => {
    const { data } = usePublicLandingStats();

    const stats = data
        ? [
            {
                value: `${Math.max(0, Math.round(data.freelancers_total))}+`,
                label: "Зарегистрированных фрилансеров",
                icon: <Users size={22} strokeWidth={1.8} />,
            },
            {
                value: `${Math.max(0, Math.round(data.completed_projects))}+`,
                label: "Завершённых проектов",
                icon: <CheckCircle size={22} strokeWidth={1.8} />,
            },
            {
                value: formatVolume(Math.max(0, data.marketplace_volume)),
                label: "Общий оборот платформы",
                icon: <TrendingUp size={22} strokeWidth={1.8} />,
            },
            {
                value: data.average_rating > 0 ? data.average_rating.toFixed(1) : "0.0",
                label: "Средний рейтинг исполнителей",
                icon: <Star size={22} strokeWidth={1.8} />,
            },
        ]
        : FALLBACK_STATS;

    return (
        <section id="stats" className="py-24 md:py-32 px-4 sm:px-6 section-grid">
            <div className="max-w-6xl mx-auto">
                <SectionHeading
                    badge="Статистика"
                    title="Цифры, которые говорят сами за себя"
                    subtitle="Тысячи клиентов и фрилансеров доверяют нашей платформе каждый день."
                />

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {stats.map((stat, i) => (
                    <div
                        key={stat.label}
                        className={`animate-fade-in-up ${ACCENTS[i]} rounded-2xl`}
                        style={{ animationDelay: `${i * 0.1}s` }}
                    >
                        <StatCard value={stat.value} label={stat.label} icon={stat.icon} />
                    </div>
                ))}
                </div>
            </div>

            <div className="section-divider max-w-4xl mx-auto mt-24" />
        </section>
    );
};
