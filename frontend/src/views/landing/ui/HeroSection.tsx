"use client";

import { useEffect, useState } from "react";
import { Button, Chip, Link, Progress, Card } from "@heroui/react";
import { ArrowRight, Shield, Sparkles, Users, Zap, Bell, TrendingUp, CheckCircle, MessageSquare, Search, Wallet, Smartphone } from "lucide-react";
import { wsManager } from "@/shared/ws/manager";

/* ── Animated dashboard mockup ── */
const DashboardMockup = () => (
    <div className="relative w-full">
        <div className="absolute -inset-12 bg-purple-600/[0.04] blur-[80px] rounded-full" />
        <Card className="relative glass-card rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-purple-900/20">
            {/* Topbar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-purple-500/20 flex items-center justify-center">
                        <Bell size={10} className="text-purple-400" />
                    </div>
                    <div className="w-6 h-6 rounded-full bg-purple-600/30 border border-purple-500/30" />
                </div>
            </div>

            <div className="p-5 space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: "Заказы", value: "24", icon: <TrendingUp size={12} />, color: "text-purple-400" },
                        { label: "Отклики", value: "18", icon: <MessageSquare size={12} />, color: "text-blue-400" },
                        { label: "Завершено", value: "12", icon: <CheckCircle size={12} />, color: "text-emerald-400" },
                    ].map((s) => (
                        <div key={s.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                            <div className={`flex items-center justify-center gap-1 mb-1 ${s.color}`}>
                                {s.icon}
                            </div>
                            <div className="text-xl font-bold text-zinc-200 font-[Space_Grotesk]">{s.value}</div>
                            <div className="text-[10px] text-zinc-500">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* AI recommendation card */}
                <div className="rounded-xl bg-purple-500/[0.06] border border-purple-500/15 p-4 animate-fade-in-up" style={{ animationDelay: "0.7s" }}>
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={14} className="text-purple-400" />
                        <span className="text-xs font-semibold text-purple-300">AI рекомендация</span>
                    </div>
                    <p className="text-sm text-zinc-300 mb-2">Разработка мобильного приложения</p>
                    <div className="flex items-center gap-2">
                        <Progress
                            size="sm"
                            value={92}
                            classNames={{
                                track: "bg-zinc-800 h-1.5",
                                indicator: "bg-gradient-to-r from-emerald-500 to-green-400",
                            }}
                            className="flex-1"
                        />
                        <span className="text-xs font-bold text-emerald-400">92%</span>
                    </div>
                </div>

                {/* Chat preview */}
                <div className="flex gap-2 animate-fade-in-up" style={{ animationDelay: "0.9s" }}>
                    <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/30 shrink-0" />
                    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 max-w-[75%]">
                        <p className="text-[11px] text-zinc-400">Готов начать работу. Оценка — 3 дня.</p>
                    </div>
                </div>
            </div>
        </Card>
    </div>
);

const ScreenshotPlaceholders = () => (
    <div className="relative w-full">
        <div className="rounded-2xl border border-white/[0.08] bg-black/30 p-3 backdrop-blur-sm">
            <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-brand-dark via-brand-dark-alt to-brand-darker">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.24),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.16),transparent_30%)]" />
                <div className="absolute inset-0 shimmer opacity-40" />
                <div className="absolute left-4 right-4 top-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/35 px-4 py-2.5 backdrop-blur">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Desktop</p>
                        <p className="text-sm font-semibold text-zinc-100">НейроБиржа</p>
                    </div>
                    <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-medium text-emerald-300">
                        128 новых заказов
                    </div>
                </div>

                <div className="absolute left-4 right-4 top-20 grid grid-cols-[1.4fr_0.9fr] gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs text-zinc-500">Лента заказов</p>
                                <p className="text-sm font-medium text-zinc-100">AI сортировка по навыкам</p>
                            </div>
                            <div className="rounded-full bg-purple-500/15 p-2 text-purple-300">
                                <Search size={14} />
                            </div>
                        </div>
                        <div className="space-y-2.5">
                            {[
                                "Telegram Mini App для доставки",
                                "Дизайн SaaS-кабинета для B2B",
                                "Маркетинговая воронка для EdTech",
                            ].map((item) => (
                                <div key={item} className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
                                    <p className="text-xs text-zinc-200">{item}</p>
                                    <p className="mt-1 text-[10px] text-zinc-500">Подходящих исполнителей: 12</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-xs text-zinc-500">Безопасная сделка</p>
                                <Wallet size={14} className="text-emerald-300" />
                            </div>
                            <p className="text-2xl font-bold text-zinc-100">₽148 000</p>
                            <p className="mt-1 text-[11px] text-zinc-500">escrow защищает оплату до сдачи результата</p>
                        </div>
                        <div className="rounded-2xl border border-purple-400/15 bg-purple-500/[0.08] p-4">
                            <p className="text-xs text-purple-200">AI-совет</p>
                            <p className="mt-1 text-sm text-zinc-100">Поднимите ставку на 8%, чтобы войти в топ откликов</p>
                            <div className="mt-3 h-1.5 rounded-full bg-white/10">
                                <div className="h-full w-[76%] rounded-full bg-gradient-to-r from-purple-400 to-cyan-300" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pointer-events-none absolute -bottom-6 right-4 w-28 sm:w-32">
                <div className="relative aspect-[9/16] overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#1f214a] via-brand-dark-alt to-brand-darker shadow-xl shadow-black/40">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.2),transparent_30%)]" />
                    <div className="absolute inset-0 shimmer opacity-45" />
                    <div className="absolute left-3 right-3 top-3 rounded-2xl border border-white/10 bg-black/35 px-2.5 py-2 backdrop-blur">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">Смартфон</p>
                            <Smartphone size={11} className="text-cyan-300" />
                        </div>
                        <p className="text-[11px] font-semibold text-zinc-100">НейроБиржа</p>
                        <p className="text-[9px] text-zinc-500">Отклик за 30 секунд</p>
                    </div>
                    <div className="absolute left-3 right-3 top-24 space-y-2">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2.5">
                            <p className="text-[10px] text-zinc-200">React-разработчик</p>
                            <p className="mt-1 text-[8px] text-emerald-300">92% совпадение</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2.5">
                            <p className="text-[10px] text-zinc-200">UI/UX дизайнер</p>
                            <p className="mt-1 text-[8px] text-cyan-300">Портфолио проверено</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export const HeroSection = () => {
    const words = ["Дизайнеры", "Разработчики", "Копирайтеры", "Маркетологи"];
    const defaultTicker = [
        "Только что разместили заказ на разработку лендинга",
        "Новый проект: iOS приложение для e-commerce",
        "Ищут UX-дизайнера для SaaS-платформы",
        "Появился заказ на SEO-аудит сайта",
    ];
    const [ticker, setTicker] = useState(defaultTicker);
    const [wordIndex, setWordIndex] = useState(0);
    const [tickerIndex, setTickerIndex] = useState(0);

    useEffect(() => {
        const wordTimer = window.setInterval(() => setWordIndex((prev) => (prev + 1) % words.length), 2200);
        const tickerTimer = window.setInterval(() => {
            setTickerIndex((prev) => (ticker.length > 0 ? (prev + 1) % ticker.length : 0));
        }, 4000);
        return () => {
            window.clearInterval(wordTimer);
            window.clearInterval(tickerTimer);
        };
    }, [ticker.length, words.length]);

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
            {/* Animated background blobs */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <div className="absolute top-[15%] left-[20%] w-[50vw] max-w-[400px] aspect-square rounded-full bg-purple-600/[0.07] blur-[100px] animate-blob" />
                <div className="absolute top-[40%] right-[15%] w-[60vw] max-w-[500px] aspect-square rounded-full bg-indigo-600/[0.05] blur-[120px] animate-blob-delay" />
                <div className="absolute bottom-[10%] left-[30%] w-[45vw] max-w-[350px] aspect-square rounded-full bg-fuchsia-600/[0.04] blur-[100px] animate-blob-delay-2" />
                <div className="absolute inset-0 section-grid" />
            </div>

            {/* Two-column layout: text left, mockup right */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-36 pb-20 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
                {/* Left — text content */}
                <div className="flex-1 text-center lg:text-left">
                    {/* Badge */}
                    <div className="mb-8 animate-fade-in-up">
                        <Chip
                            variant="flat"
                            size="md"
                            startContent={
                                <span className="relative inline-flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                                </span>
                            }
                            classNames={{
                                base: "bg-purple-500/10 border border-purple-500/15 gap-2 px-4 py-1",
                                content: "text-purple-300 font-medium text-sm",
                            }}
                        >
                            Платформа активна — фрилансеры онлайн
                        </Chip>
                    </div>

                    {/* Main heading */}
                    <h1
                        className="text-4xl sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl font-bold tracking-tight mb-6 leading-[1.08] text-zinc-100 animate-fade-in-up"
                        style={{ animationDelay: "0.1s" }}
                    >
                        Фриланс-биржа<br />
                        <span className="gradient-text">нового поколения</span>
                        <span className="block text-xl sm:text-2xl mt-3 text-zinc-400 min-h-8 transition-opacity duration-500">
                            {words[wordIndex]}
                        </span>
                    </h1>

                    {/* Subtitle */}
                    <p
                        className="text-lg md:text-xl text-zinc-400 max-w-xl mb-10 leading-relaxed animate-fade-in-up lg:mx-0 mx-auto"
                        style={{ animationDelay: "0.2s" }}
                    >
                        AI-подбор исполнителей, безопасный escrow, мгновенные выплаты.
                        Находите лучших фрилансеров или заказы за минуты.
                    </p>

                    {/* CTA buttons */}
                    <div
                        className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 mb-10 animate-fade-in-up"
                        style={{ animationDelay: "0.3s" }}
                    >
                        <Button
                            as={Link}
                            href="/register"
                            size="lg"
                            className="bg-purple-600 text-white font-semibold px-8 glow-sm hover:bg-purple-500 transition-all duration-300"
                            endContent={<ArrowRight size={18} />}
                        >
                            Разместить заказ
                        </Button>
                        <Button
                            as={Link}
                            href="/register"
                            variant="bordered"
                            size="lg"
                            className="border-zinc-700 text-zinc-300 hover:border-purple-500/40 hover:text-purple-300 px-8 transition-all duration-300"
                        >
                            Стать фрилансером
                        </Button>
                    </div>

                    {/* Floating stat chips */}
                    <div
                        className="flex flex-wrap items-center justify-center lg:justify-start gap-3 animate-fade-in-up"
                        style={{ animationDelay: "0.4s" }}
                    >
                        {[
                            { label: "10K+ фрилансеров", Icon: Users },
                            { label: "Escrow-защита", Icon: Shield },
                            { label: "AI-подбор", Icon: Sparkles },
                            { label: "Мгновенно", Icon: Zap },
                        ].map((chip) => (
                            <Chip
                                key={chip.label}
                                variant="flat"
                                size="sm"
                                startContent={<chip.Icon size={14} className="text-zinc-500" />}
                                classNames={{
                                    base: "bg-zinc-800/60 border border-zinc-700/50 gap-1.5",
                                    content: "text-zinc-500 text-xs font-medium",
                                }}
                            >
                                {chip.label}
                            </Chip>
                        ))}
                    </div>
                    <p className="mt-6 text-xs text-teal-300/90 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
                        {ticker[tickerIndex]}
                    </p>
                </div>

                {/* Right — Dashboard Mockup */}
                <div
                    className="flex-1 w-full lg:max-w-none hidden sm:block animate-fade-in-up"
                    style={{ animationDelay: "0.5s" }}
                >
                    <div className="space-y-6">
                        <DashboardMockup />
                        <ScreenshotPlaceholders />
                    </div>
                </div>
            </div>

            {/* Bottom gradient fade */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-vb-bg to-transparent pointer-events-none" />
        </section>
    );
};
