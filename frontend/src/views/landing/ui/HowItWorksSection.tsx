"use client";

import { Card, CardBody, Chip } from "@heroui/react";
import { FileText, Target, Rocket, ArrowRight } from "lucide-react";
import { SectionHeading } from "@/shared/ui/section-heading/SectionHeading";

const STEPS = [
    {
        step: "01",
        Icon: FileText,
        title: "Разместите заказ",
        description:
            "Опишите задачу, укажите бюджет и сроки. AI автоматически подберёт категорию и теги для максимального охвата.",
    },
    {
        step: "02",
        Icon: Target,
        title: "Получите предложения",
        description:
            "Фрилансеры откликнутся на ваш заказ. AI проанализирует каждого и порекомендует лучших кандидатов.",
    },
    {
        step: "03",
        Icon: Rocket,
        title: "Работайте безопасно",
        description:
            "Общайтесь в чате, отслеживайте прогресс. Оплата через escrow гарантирует безопасность обеим сторонам.",
    },
] as const;

/* ── Animated process flow ── */
const ProcessFlow = () => (
    <div className="flex items-center justify-center gap-4 flex-wrap">
        {["Заказ", "AI-подбор", "Escrow", "Результат"].map((label, i) => (
            <div key={label} className="flex items-center gap-4 animate-fade-in-up" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20">
                    <div className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">
                        {i + 1}
                    </div>
                    <span className="text-sm font-medium text-purple-300">{label}</span>
                </div>
                {i < 3 && <ArrowRight size={16} className="text-purple-500/40 hidden sm:block" />}
            </div>
        ))}
    </div>
);

export const HowItWorksSection = () => (
    <section id="for-clients" className="py-24 md:py-32 px-4 sm:px-6 relative section-alt">
        <div className="max-w-6xl mx-auto relative">
            <SectionHeading
                badge="Как это работает"
                title="Три простых шага к результату"
                subtitle="От идеи до готового проекта — быстро, удобно и безопасно."
            />

            {/* Animated process flow */}
            <div className="flex justify-center mb-14 md:mb-20">
                <ProcessFlow />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative">
                {/* Connecting line (desktop) */}
                <div className="hidden md:block absolute top-[60px] left-[20%] right-[20%]">
                    <div className="h-px bg-gradient-to-r from-purple-500/10 via-purple-500/25 to-purple-500/10" />
                    <div className="h-px bg-gradient-to-r from-purple-500/10 via-purple-500/25 to-purple-500/10 shimmer mt-px" />
                </div>

                {STEPS.map((step, i) => (
                    <div
                        key={step.step}
                        className="animate-fade-in-up"
                        style={{ animationDelay: `${i * 0.12}s` }}
                    >
                        <Card className="glass-card card-hover-glow text-center h-full transition-all duration-300">
                            <CardBody className="p-8 flex flex-col items-center gap-5">
                                {/* Step number */}
                                <Chip
                                    variant="flat"
                                    size="sm"
                                    classNames={{
                                        base: "bg-purple-500/10 border border-purple-500/20",
                                        content: "text-purple-400 font-bold text-xs tracking-wider",
                                    }}
                                >
                                    Шаг {step.step}
                                </Chip>

                                {/* Icon */}
                                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center text-purple-400">
                                    <step.Icon size={28} strokeWidth={1.6} />
                                </div>

                                {/* Content */}
                                <h3 className="text-xl font-semibold text-zinc-100">{step.title}</h3>
                                <p className="text-zinc-500 text-sm leading-relaxed">
                                    {step.description}
                                </p>
                            </CardBody>
                        </Card>
                    </div>
                ))}
            </div>
        </div>

        <div className="section-divider max-w-4xl mx-auto mt-24" />
    </section>
);
