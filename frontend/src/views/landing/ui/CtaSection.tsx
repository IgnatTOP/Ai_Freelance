"use client";

import { Button, Link, Input } from "@heroui/react";
import { ArrowRight, CheckCircle, Phone, Sparkles } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

const AIPlanStrip = () => (
    <div
        className="grid items-center gap-8 rounded-3xl p-8 md:grid-cols-[1fr_360px] md:p-10"
        style={{
            background: "linear-gradient(135deg, rgba(52,211,153,0.10), rgba(16,185,129,0.04))",
            border: "1px solid rgba(52,211,153,0.22)",
        }}
    >
        <div>
            <div className="t-eyebrow">AI В ДЕЙСТВИИ</div>
            <h2 className="t-h2 mb-3 mt-2">Пока вы описываете — AI уже ищет</h2>
            <p className="m-0 max-w-[520px] text-[15px] leading-[1.55]" style={{ color: "var(--fg-1)" }}>
                Агент разбирает запрос на сущности, строит профиль задачи и запускает поиск параллельно.
                За секунды вы видите шорт-лист, почему именно эти люди — и во сколько реально обойдётся.
            </p>
            <div className="mt-6 flex gap-3">
                <Button
                    as={Link}
                    href="/register"
                    className="h-10 bg-[var(--mint-400)] px-4 text-[14px] font-semibold text-[#062219] transition-all hover:bg-[var(--mint-300)]"
                    endContent={<Sparkles size={14} />}
                >
                    Попробовать AI
                </Button>
            </div>
        </div>
        <div
            className="rounded-2xl p-3.5 font-mono text-[12px]"
            style={{
                background: "var(--bg-2)",
                border: "1px solid var(--line)",
                color: "var(--fg-1)",
            }}
        >
            <div className="mb-1.5" style={{ color: "var(--mint-400)" }}>
                agent.plan()
            </div>
            <div>
                → extract: <span style={{ color: "var(--fg-0)" }}>stack=[React,Next.js]</span>
            </div>
            <div>
                → extract: <span style={{ color: "var(--fg-0)" }}>budget=80k₽</span>
            </div>
            <div>
                → extract: <span style={{ color: "var(--fg-0)" }}>deadline=14d</span>
            </div>
            <div className="mt-2" style={{ color: "var(--mint-400)" }}>
                agent.search()
            </div>
            <div>→ filter 12 400 → 87 match</div>
            <div>
                → rank by rating, load → <span style={{ color: "var(--mint-300)" }}>5 finalists</span>
            </div>
            <div className="mt-2" style={{ color: "var(--mint-400)" }}>
                agent.estimate()
            </div>
            <div>
                → range: <span style={{ color: "var(--fg-0)" }}>68 000–92 000 ₽</span>
            </div>
            <div className="mt-2 flex items-center gap-1">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="ml-2" style={{ color: "var(--fg-3)" }}>
                    writing brief…
                </span>
            </div>
        </div>
    </div>
);

export const CtaSection = () => {
    const [phone, setPhone] = useState("");
    const router = useRouter();

    const handleRegister = () => {
        if (phone.length > 5) {
            router.push(`/register?phone=${encodeURIComponent(phone)}`);
        } else {
            router.push("/register");
        }
    };

    return (
        <section id="pricing" className="relative py-24 md:py-32 px-4 sm:px-6">
            <div className="relative mx-auto max-w-6xl">
                <div className="mb-12">
                    <AIPlanStrip />
                </div>

                <div
                    className="relative overflow-hidden rounded-3xl p-10 text-center md:p-16 glow-mint"
                    style={{
                        background:
                            "linear-gradient(135deg, rgba(52,211,153,0.12) 0%, rgba(16,185,129,0.06) 50%, var(--bg-0) 100%)",
                        border: "1px solid rgba(52,211,153,0.18)",
                    }}
                >
                    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[rgba(52,211,153,0.08)] blur-[100px]" />
                        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[rgba(110,231,183,0.05)] blur-[100px]" />
                        <div className="animate-float absolute left-[15%] top-[20%] h-1 w-1 rounded-full bg-[rgba(167,243,208,0.4)]" />
                        <div className="animate-float-delay absolute right-[20%] top-[60%] h-1.5 w-1.5 rounded-full bg-[rgba(52,211,153,0.3)]" />
                        <div className="animate-float-delay-2 absolute right-[30%] top-[30%] h-1 w-1 rounded-full bg-[rgba(110,231,183,0.3)]" />
                    </div>

                    <div className="relative z-10">
                        <h2 className="mb-5 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl" style={{ color: "var(--fg-0)" }}>
                            Готовы <span className="gradient-text">начать?</span>
                        </h2>
                        <p
                            className="mx-auto mb-10 max-w-xl text-base leading-relaxed md:text-lg"
                            style={{ color: "var(--fg-1)" }}
                        >
                            Присоединяйтесь к тысячам профессионалов. Регистрация бесплатна,
                            а первый заказ можно разместить за 5 минут.
                        </p>

                        <div className="mx-auto mb-8 flex max-w-lg flex-col items-center justify-center gap-3 sm:flex-row">
                            <Input
                                placeholder="+7 (999) 000-00-00"
                                value={phone}
                                onValueChange={setPhone}
                                size="lg"
                                startContent={<Phone size={18} style={{ color: "var(--fg-3)" }} />}
                                classNames={{
                                    base: "w-full sm:w-64",
                                    inputWrapper:
                                        "bg-[var(--bg-2)] border border-[var(--line-2)] hover:border-[var(--line-hover)] focus-within:!border-[var(--mint-400)] h-[48px]",
                                    input: "text-[var(--fg-0)]",
                                }}
                            />
                            <Button
                                size="lg"
                                onPress={handleRegister}
                                className="h-[48px] w-full bg-[var(--mint-400)] px-8 font-semibold text-[#062219] transition-all hover:bg-[var(--mint-300)] sm:w-auto"
                                endContent={<ArrowRight size={18} />}
                            >
                                Начать
                            </Button>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                            {["Без кредитной карты", "Бесплатный план", "Отмена в любой момент"].map((text) => (
                                <div key={text} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--fg-2)" }}>
                                    <CheckCircle size={12} style={{ color: "var(--mint-400)" }} />
                                    <span>{text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
