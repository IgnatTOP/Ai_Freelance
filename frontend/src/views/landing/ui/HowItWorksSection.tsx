"use client";

import { Mic, Compass, Shield } from "lucide-react";

const STEPS = [
    {
        n: "01",
        Icon: Mic,
        title: "Опишите задачу словами",
        description:
            "Голос, текст или файл. AI сам превратит это в чёткое ТЗ с бюджетом, сроком и стеком.",
    },
    {
        n: "02",
        Icon: Compass,
        title: "AI подбирает исполнителей",
        description:
            "Система сопоставляет навыки, рейтинг, загрузку и бюджет. Видите 3–5 лучших — не 200.",
    },
    {
        n: "03",
        Icon: Shield,
        title: "Платите через эскроу",
        description:
            "Деньги лежат в безопасной ячейке. Переводятся фрилансеру только когда вы приняли работу.",
    },
] as const;

export const HowItWorksSection = () => (
    <section id="for-clients" className="relative py-24 md:py-32 px-4 sm:px-6 section-alt">
        <div className="relative mx-auto max-w-6xl">
            <div className="mb-10">
                <div className="t-eyebrow">КАК ЭТО РАБОТАЕТ</div>
                <h2 className="t-h2 mt-2">Три шага — и команда уже собрана</h2>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {STEPS.map((step, i) => (
                    <div
                        key={step.n}
                        className="relative animate-fade-in-up overflow-hidden rounded-2xl p-6"
                        style={{
                            animationDelay: `${i * 0.12}s`,
                            background: "var(--bg-2)",
                            border: "1px solid var(--line)",
                        }}
                    >
                        <div className="font-mono text-[13px] mb-5" style={{ color: "var(--mint-400)" }}>
                            {step.n}
                        </div>
                        <div
                            className="mb-4 grid h-11 w-11 place-items-center rounded-xl"
                            style={{
                                background: "rgba(52,211,153,0.1)",
                                color: "var(--mint-300)",
                                border: "1px solid rgba(52,211,153,0.18)",
                            }}
                        >
                            <step.Icon size={20} strokeWidth={1.8} />
                        </div>
                        <h3 className="mb-2 text-[19px] font-bold leading-tight tracking-tight">{step.title}</h3>
                        <p className="m-0 text-[14px] leading-[1.5]" style={{ color: "var(--fg-1)" }}>
                            {step.description}
                        </p>
                    </div>
                ))}
            </div>
        </div>

        <div className="section-divider mx-auto mt-24 max-w-4xl" />
    </section>
);
