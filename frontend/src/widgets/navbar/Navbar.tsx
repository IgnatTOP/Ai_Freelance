"use client";

import { Button, Link } from "@heroui/react";
import { useState, useEffect } from "react";
import { ArrowRight, Menu, X, LayoutDashboard } from "lucide-react";
import { Logo } from "@/shared/ui/logo/Logo";
import { useSessionStore } from "@/shared/store/session.store";
import { useOnlineCount } from "@/features/dashboard-stats";

const NAV_ITEMS = [
    { label: "Возможности", href: "#features" },
    { label: "Для заказчиков", href: "#for-clients" },
    { label: "Для исполнителей", href: "#for-freelancers" },
    { label: "Тарифы", href: "#pricing" },
] as const;

export const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const userId = useSessionStore((s) => s.userId);
    const [scrolled, setScrolled] = useState(false);
    const { data: onlineData } = useOnlineCount();
    const onlineCount = onlineData?.online_count ?? onlineData?.count ?? 0;

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl">
            {/* ── Liquid Glass Floating Bar ── */}
            <div className={`liquid-glass relative rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4 transition-all duration-300 ${scrolled ? "shadow-2xl shadow-black/30 !bg-[rgba(20,20,35,0.85)]" : ""}`}>
                {/* Mobile toggle */}
                <button
                    type="button"
                    onClick={() => setIsMenuOpen((v) => !v)}
                    className="sm:hidden text-zinc-400 hover:text-zinc-200 transition-colors p-1"
                    aria-label={isMenuOpen ? "Закрыть меню" : "Открыть меню"}
                >
                    {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>

                {/* Brand */}
                <div className="shrink-0 flex items-center gap-2">
                    <Logo size="sm" />
                    <span className="hidden md:inline-flex items-center text-[11px] text-emerald-300">
                        <span className="mr-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" /> {onlineCount} онлайн
                    </span>
                </div>

                {/* Desktop nav links */}
                <div className="hidden sm:flex items-center gap-1">
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.04]"
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>

                {/* CTA buttons */}
                <div className="flex items-center gap-2 shrink-0">
                    {userId ? (
                        <Button
                            as={Link}
                            href="/dashboard"
                            size="sm"
                            className="bg-purple-600 text-white font-medium hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/20"
                            startContent={<LayoutDashboard size={14} />}
                        >
                            Кабинет
                        </Button>
                    ) : (
                        <>
                            <Button
                                as={Link}
                                href="/login"
                                variant="light"
                                size="sm"
                                className="hidden sm:flex text-zinc-400 hover:text-zinc-200"
                            >
                                Войти
                            </Button>
                            <Button
                                as={Link}
                                href="/register"
                                size="sm"
                                className="bg-purple-600 text-white font-medium hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/20"
                                endContent={<ArrowRight size={14} />}
                            >
                                Начать
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Mobile dropdown */}
            {isMenuOpen && (
                <div className="sm:hidden liquid-glass relative rounded-2xl mt-2 px-4 py-4 flex flex-col gap-1">
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="text-base text-zinc-300 hover:text-zinc-100 transition-colors px-3 py-2.5 rounded-lg hover:bg-white/[0.04]"
                            onPress={() => setIsMenuOpen(false)}
                        >
                            {item.label}
                        </Link>
                    ))}
                    <Button
                        as={Link}
                        href="/register"
                        fullWidth
                        className="mt-2 bg-purple-600 text-white font-medium"
                        onPress={() => setIsMenuOpen(false)}
                    >
                        Начать бесплатно
                    </Button>
                </div>
            )}
        </nav>
    );
};
