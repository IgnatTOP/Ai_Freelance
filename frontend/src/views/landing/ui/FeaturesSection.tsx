"use client";

import {
    Bot,
    Shield,
    MessageCircle,
    Bell,
    Star,
    Banknote,
} from "lucide-react";
import { SectionHeading } from "@/shared/ui/section-heading/SectionHeading";
import { FeatureCard } from "@/shared/ui/feature-card/FeatureCard";

const FEATURES = [
    {
        Icon: Bot,
        title: "AI-подбор исполнителей",
        description:
            "Умные алгоритмы анализируют навыки, рейтинг и портфолио, чтобы предложить идеальных кандидатов для вашего проекта.",
    },
    {
        Icon: Shield,
        title: "Безопасный Escrow",
        description:
            "Деньги замораживаются на escrow-счёте и переводятся фрилансеру только после подтверждения выполнения работы.",
    },
    {
        Icon: MessageCircle,
        title: "Чат в реальном времени",
        description:
            "Встроенный мессенджер с индикаторами набора текста, статусами прочтения и уведомлениями в реальном времени.",
    },
    {
        Icon: Bell,
        title: "Умные уведомления",
        description:
            "Мгновенные push-уведомления о новых предложениях, сообщениях и обновлениях заказов. Ничего не пропустите.",
    },
    {
        Icon: Star,
        title: "Прозрачные отзывы",
        description:
            "Честная система оценок и отзывов помогает выбрать надёжного исполнителя с проверенной репутацией.",
    },
    {
        Icon: Banknote,
        title: "Мгновенные выплаты",
        description:
            "Вывод средств на карту или электронный кошелёк в течение нескольких минут после завершения проекта.",
    },
] as const;

/* ── Decorative illustration replacement ── */
const FeaturesIllustration = () => (
    <div className="relative w-full max-w-[380px]">
        <div className="absolute -inset-8 bg-emerald-600/[0.05] blur-[60px] rounded-full" />
        <div className="relative glass-card rounded-2xl p-6 space-y-4">
            {/* Feature preview stack */}
            {[
                { emoji: "🤖", label: "AI-подбор", color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" },
                { emoji: "🔒", label: "Escrow-защита", color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" },
                { emoji: "⚡", label: "Мгновенные выплаты", color: "bg-amber-500/10 border-amber-500/20 text-amber-300" },
            ].map((item, i) => (
                <div
                    key={item.label}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${item.color} animate-fade-in-up`}
                    style={{ animationDelay: `${i * 0.15}s` }}
                >
                    <span className="text-lg">{item.emoji}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                    <div className="ml-auto w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M8.5 5L5.5 8V2L8.5 5Z" /></svg>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export const FeaturesSection = () => (
    <section id="features" className="py-24 md:py-32 px-4 sm:px-6 section-grid">
        <div className="max-w-7xl mx-auto">
            {/* Heading + illustration side by side */}
            <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16 mb-16 md:mb-20">
                <div className="flex-1">
                    <SectionHeading
                        badge="Возможности"
                        title="Всё, что нужно для успешного фриланса"
                        subtitle="Мощные инструменты для клиентов и фрилансеров, которые делают работу эффективнее и безопаснее."
                        align="left"
                    />
                </div>
                <div className="flex-shrink-0 w-full max-w-[320px] lg:max-w-[380px] animate-fade-in-up">
                    <FeaturesIllustration />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                {FEATURES.map((feature, i) => (
                    <div
                        key={feature.title}
                        className="animate-fade-in-up"
                        style={{ animationDelay: `${i * 0.08}s` }}
                    >
                        <FeatureCard
                            icon={<feature.Icon size={22} strokeWidth={1.8} />}
                            title={feature.title}
                            description={feature.description}
                            number={i + 1}
                        />
                    </div>
                ))}
            </div>
        </div>

        <div className="section-divider max-w-4xl mx-auto mt-24" />
    </section>
);
