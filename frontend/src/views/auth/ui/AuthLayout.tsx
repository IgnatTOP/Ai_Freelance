"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
    FilkaAISphere,
    FilkaCard,
    FilkaSegmented,
    IconArrowRight,
    IconCompass,
    IconLock,
    IconLogo,
    IconShield,
    IconSpark,
} from "@/shared/ui/filka";
import { usePublicLandingStats } from "@/features/dashboard-stats/usePublicLandingStats";

interface AuthLayoutProps {
    readonly children: ReactNode;
    readonly title: string;
    readonly subtitle?: string;
    readonly mode?: "login" | "register" | "verify";
}

export const AuthLayout = ({ children, title, subtitle, mode = "login" }: AuthLayoutProps) => {
    const { data: stats } = usePublicLandingStats();
    const totalUsers = stats?.freelancers_total ?? 12_400;
    return (
        <section className="relative min-h-screen overflow-hidden text-[var(--fg-0)]" style={{ background: "var(--bg-0)" }}>
            <div className="absolute inset-0" style={{ background: "var(--grad-hero)" }} />

            <div className="relative z-10 grid min-h-screen items-start lg:grid-cols-[1fr_560px]">
                <div
                    className="relative hidden overflow-hidden border-r px-14 py-14 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:gap-10"
                    style={{ borderColor: "var(--line)", background: "var(--bg-0)" }}
                >
                    <div
                        className="pointer-events-none absolute right-[-40px] top-12 opacity-90"
                        aria-hidden="true"
                    >
                        <FilkaAISphere size={320} />
                    </div>

                    <div className="relative z-10 flex items-center gap-3">
                        <IconLogo size={32} />
                        <span className="text-2xl font-bold tracking-[-0.03em]">Филка</span>
                    </div>

                    <div className="relative z-10 flex flex-1 flex-col justify-end gap-5">
                        <FilkaCard glass className="max-w-[260px] p-4">
                            <div
                                className="mb-2 grid h-9 w-9 place-items-center rounded-[10px]"
                                style={{ background: "rgba(52,211,153,0.12)", color: "var(--mint-300)" }}
                            >
                                <IconShield size={16} />
                            </div>
                            <div className="t-eyebrow mb-1">Эскроу · защита</div>
                            <div className="text-sm font-semibold">Деньги защищены до приёмки результата.</div>
                        </FilkaCard>

                        <FilkaCard glass className="max-w-[280px] p-4">
                            <div
                                className="mb-2 grid h-9 w-9 place-items-center rounded-[10px]"
                                style={{ background: "rgba(245,226,122,0.12)", color: "var(--accent-sun)" }}
                            >
                                <IconCompass size={16} />
                            </div>
                            <div className="t-eyebrow mb-1" style={{ color: "var(--accent-sun)" }}>
                                AI-подбор
                            </div>
                            <div className="text-sm font-semibold">
                                AI подбирает 3–5 лучших исполнителей вместо сотен случайных откликов.
                            </div>
                        </FilkaCard>

                        <div className="mt-6 max-w-[470px]">
                            <h1 className="t-h1 mb-4">Собирайте команду за минуты, а не за дни.</h1>
                            <p className="max-w-[430px] text-[15px] leading-7" style={{ color: "var(--fg-1)" }}>
                                {totalUsers.toLocaleString("ru-RU")}+ исполнителей, AI-подбор, прозрачные чаты и безопасный
                                эскроу внутри одной платформы.
                            </p>

                            <div className="mt-8 flex items-center gap-3 text-sm" style={{ color: "var(--fg-2)" }}>
                                <span>© 2026 Филка</span>
                                <span aria-hidden="true">·</span>
                                <Link href="/" className="filka-anchor">
                                    Политика
                                </Link>
                                <span aria-hidden="true">·</span>
                                <Link href="/" className="filka-anchor">
                                    Поддержка
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className="relative flex min-h-screen flex-col justify-center px-5 py-8 sm:px-8 lg:px-14"
                    style={{ background: "var(--bg-1)" }}
                >
                    <div className="mx-auto mb-8 flex w-full max-w-[420px] items-center justify-between lg:hidden">
                        <Link href="/" className="flex items-center gap-2">
                            <IconLogo size={28} />
                            <span className="text-lg font-bold tracking-[-0.02em]">Филка</span>
                        </Link>
                        <Link href="/" className="filka-btn filka-btn-ghost filka-btn-sm">
                            На главную
                        </Link>
                    </div>

                    <div className="mx-auto w-full max-w-[420px]">
                        {(mode === "login" || mode === "register") && (
                            <div className="mb-8">
                                <FilkaSegmented
                                    value={mode}
                                    onChange={() => undefined}
                                    items={[
                                        { id: "register", label: <Link href="/register">Регистрация</Link> },
                                        { id: "login", label: <Link href="/login">Вход</Link> },
                                    ]}
                                />
                            </div>
                        )}

                        {mode === "verify" && (
                            <Link href="/register" className="filka-btn filka-btn-ghost filka-btn-sm mb-8">
                                Изменить номер <IconArrowRight size={13} />
                            </Link>
                        )}

                        <h2 className="t-h2 mb-2">{title}</h2>
                        {subtitle ? (
                            <p className="mb-7 text-[15px]" style={{ color: "var(--fg-1)" }}>
                                {subtitle}
                            </p>
                        ) : null}

                        <div>{children}</div>

                        <FilkaCard glass className="mt-8 flex items-start gap-3 border-dashed p-4">
                            <div
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]"
                                style={{ background: "rgba(52,211,153,0.12)", color: "var(--mint-300)" }}
                            >
                                <IconSpark size={16} />
                            </div>
                            <div className="text-sm leading-6" style={{ color: "var(--fg-1)" }}>
                                После входа AI-ассистент поможет настроить профиль и покажет первые сценарии прямо в интерфейсе.
                            </div>
                        </FilkaCard>

                        <div className="mt-6 flex items-center gap-2 text-xs" style={{ color: "var(--fg-2)" }}>
                            <IconLock size={12} />
                            <span>Данные хранятся в защищённом контуре, телефон не передаётся третьим лицам.</span>
                        </div>

                        <div className="mt-6 lg:hidden">
                            <Link href="/" className="filka-btn filka-btn-soft">
                                Вернуться на главную
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
