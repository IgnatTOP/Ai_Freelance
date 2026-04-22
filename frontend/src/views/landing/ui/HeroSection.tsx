"use client";

import { useEffect, useState } from "react";
import { Button, Link } from "@heroui/react";
import { ArrowRight, Sparkles, Shield, Compass } from "lucide-react";
import { wsManager } from "@/shared/ws/manager";
import { AISphere } from "@/shared/ui/ai-sphere";

/* ── Floating glass "thought" cards around the AI sphere ── */
const HeroVisual = () => (
    <div className="relative mx-auto h-[520px] w-full max-w-[520px]">
        <div className="absolute left-1/2 top-[60px] -translate-x-1/2">
            <AISphere size={300} />
        </div>

        <div className="absolute left-1/2 top-[400px] -translate-x-1/2 text-center">
            <div className="font-mono text-[12px]" style={{ color: "var(--mint-300)" }}>
                АГЕНТ · THINKING
            </div>
            <div className="mt-1 flex justify-center gap-[3px]">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
            </div>
        </div>

        {/* Floating "thought" card 1 */}
        <div className="f-glass absolute left-0 top-[10px] w-[220px] p-3 flex gap-[10px] items-start">
            <div
                className="grid h-7 w-7 place-items-center rounded-lg"
                style={{ background: "rgba(245,226,122,0.15)", color: "#F5E27A" }}
            >
                <Compass size={14} />
            </div>
            <div>
                <div className="t-caption mb-0.5" style={{ color: "var(--mint-300)" }}>
                    AI подбирает
                </div>
                <div className="text-[13px] font-medium">5 релевантных фрилансеров</div>
            </div>
        </div>

        {/* Floating card 2 */}
        <div className="f-glass absolute right-0 top-[160px] w-[240px] p-3">
            <div className="t-caption mb-1.5">ЗАДАЧА ПОЛЬЗОВАТЕЛЯ</div>
            <div className="text-[13.5px] leading-[1.5]" style={{ color: "var(--fg-0)" }}>
                «Нужен landing на Next.js с анимациями Framer Motion, бюджет 80к…»
            </div>
        </div>

        {/* Floating card 3 — freelancer match */}
        <div className="f-glass absolute bottom-[30px] left-[20px] w-[260px] p-[14px]">
            <div className="mb-[10px] flex items-center gap-[10px]">
                <div
                    className="grid h-[34px] w-[34px] place-items-center rounded-lg text-[13px] font-bold"
                    style={{ background: "linear-gradient(135deg,#6EE7B7,#10B981)", color: "#062219" }}
                >
                    МК
                </div>
                <div className="flex-1">
                    <div className="text-[13px] font-semibold">Максим К.</div>
                    <div className="t-caption text-[11px]">Frontend · 4.9 ★ · 67 заказов</div>
                </div>
                <span className="chip h-[22px] px-2 text-[11px]">97%</span>
            </div>
            <div className="h-1 overflow-hidden rounded" style={{ background: "var(--bg-3)" }}>
                <div className="h-full w-[97%]" style={{ background: "var(--grad-brand)" }} />
            </div>
        </div>

        {/* Floating card 4 — escrow */}
        <div className="f-glass absolute bottom-[110px] right-[20px] flex w-[200px] items-center gap-[10px] p-3">
            <div
                className="grid h-8 w-8 place-items-center rounded-lg"
                style={{
                    background: "rgba(52,211,153,0.12)",
                    color: "var(--mint-300)",
                    border: "1px solid rgba(52,211,153,0.22)",
                }}
            >
                <Shield size={15} />
            </div>
            <div>
                <div className="text-[13px] font-semibold">80 000 ₽</div>
                <div className="t-caption text-[11px]">в эскроу · защищено</div>
            </div>
        </div>
    </div>
);

export const HeroSection = () => {
    const defaultTicker = [
        "Только что разместили заказ на разработку лендинга",
        "Новый проект: iOS приложение для e-commerce",
        "Ищут UX-дизайнера для SaaS-платформы",
        "Появился заказ на SEO-аудит сайта",
    ];
    const [ticker, setTicker] = useState(defaultTicker);
    const [tickerIndex, setTickerIndex] = useState(0);

    useEffect(() => {
        const tickerTimer = window.setInterval(() => {
            setTickerIndex((prev) => (ticker.length > 0 ? (prev + 1) % ticker.length : 0));
        }, 4000);
        return () => window.clearInterval(tickerTimer);
    }, [ticker.length]);

    useEffect(() => {
        const unsubscribe = wsManager.subscribe((event) => {
            if (event.type !== "order.created") return;
            const payload = event.data as { title?: string };
            const title = typeof payload.title === "string" ? payload.title.trim() : "";
            if (!title) return;

            setTicker((prev) => {
                const message = `Только что разместили заказ: ${title}`;
                const next = [message, ...prev.filter((item) => item !== message)];
                return next.slice(0, 8);
            });
            setTickerIndex(0);
        });

        wsManager.connect();
        return unsubscribe;
    }, []);

    return (
        <section className="relative overflow-hidden gradient-bg-hero min-h-screen">
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <div className="absolute top-[15%] left-[20%] aspect-square w-[50vw] max-w-[400px] rounded-full bg-[rgba(52,211,153,0.08)] blur-[100px] animate-blob" />
                <div className="absolute top-[40%] right-[15%] aspect-square w-[60vw] max-w-[500px] rounded-full bg-[rgba(110,231,183,0.05)] blur-[120px] animate-blob-delay" />
                <div className="absolute bottom-[10%] left-[30%] aspect-square w-[45vw] max-w-[350px] rounded-full bg-[rgba(16,185,129,0.04)] blur-[100px] animate-blob-delay-2" />
                <div className="absolute inset-0 section-grid" />
            </div>

            <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-12 px-4 pb-20 pt-36 sm:px-6 lg:flex-row lg:gap-16">
                {/* Left — text */}
                <div className="flex-1 text-center lg:text-left">
                    <div className="mb-8 inline-flex animate-fade-in-up">
                        <span className="chip gap-2 px-3">
                            <Sparkles size={12} />
                            Встроенный AI · Новая версия 0.4
                        </span>
                    </div>

                    <h1
                        className="t-display mb-6 animate-fade-in-up text-[clamp(2.5rem,6vw,4rem)]"
                        style={{ animationDelay: "0.1s" }}
                    >
                        Фриланс, который
                        <br />
                        <span className="gradient-text">сам находит своих.</span>
                    </h1>

                    <p
                        className="t-body mb-10 max-w-xl animate-fade-in-up text-[17px] lg:mx-0 mx-auto"
                        style={{ animationDelay: "0.2s", color: "var(--fg-1)" }}
                    >
                        Филка — биржа с AI-ассистентом, который за вас пишет ТЗ, подбирает исполнителей
                        и охраняет деньги в эскроу. Меньше переписки, больше результата.
                    </p>

                    <div
                        className="mb-10 flex animate-fade-in-up flex-col items-center justify-center gap-3 sm:flex-row lg:items-start lg:justify-start"
                        style={{ animationDelay: "0.3s" }}
                    >
                        <Button
                            as={Link}
                            href="/register"
                            size="lg"
                            className="h-12 bg-[var(--mint-400)] px-5 text-[15px] font-semibold text-[#062219] transition-all hover:bg-[var(--mint-300)] glow-sm"
                            endContent={<ArrowRight size={16} />}
                        >
                            Опишите задачу — AI поможет
                        </Button>
                        <Button
                            as={Link}
                            href="/register"
                            variant="bordered"
                            size="lg"
                            className="h-12 border-[var(--line-2)] px-5 text-[15px] text-[var(--fg-0)] transition-all hover:border-[var(--line-hover)] hover:bg-[var(--bg-3)]"
                        >
                            Я фрилансер
                        </Button>
                    </div>

                    <div
                        className="flex animate-fade-in-up flex-wrap items-center justify-center gap-x-9 gap-y-4 lg:justify-start"
                        style={{ animationDelay: "0.4s" }}
                    >
                        {[
                            { value: "12 400+", label: "фрилансеров на платформе" },
                            { value: "94%", label: "заказов с мэтчем от AI" },
                            { value: "2.4 мин", label: "до первого отклика" },
                        ].map((stat, i, arr) => (
                            <div key={stat.label} className="flex items-center gap-9">
                                <div>
                                    <div className="stat-value text-[22px]">{stat.value}</div>
                                    <div className="t-caption">{stat.label}</div>
                                </div>
                                {i < arr.length - 1 && <div className="h-8 w-px bg-[var(--line)]" />}
                            </div>
                        ))}
                    </div>

                    <p
                        className="mt-6 animate-fade-in-up text-xs"
                        style={{ animationDelay: "0.5s", color: "var(--mint-300)" }}
                    >
                        {ticker[tickerIndex]}
                    </p>
                </div>

                {/* Right — AI sphere with floating cards */}
                <div
                    className="hidden flex-1 animate-fade-in-up sm:block"
                    style={{ animationDelay: "0.5s" }}
                >
                    <HeroVisual />
                </div>
            </div>

            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[var(--bg-0)] to-transparent" />
        </section>
    );
};
