"use client";

import { useState, useEffect } from "react";
import { Button, Link, Badge, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Avatar, Kbd } from "@heroui/react";
import { Menu, X, Bell, LogOut, User, Settings, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { Logo } from "@/shared/ui/logo/Logo";
import { useSessionStore } from "@/shared/store/session.store";
import { useNotificationCenter } from "@/features/notification-center";
import { authTokenStorage } from "@/shared/api/client";
import { CommandPalette } from "./CommandPalette";
import { useRealtimeStore } from "@/shared/store/realtime.store";

type NavItem = { label: string; clientLabel?: string; freelancerLabel?: string; href: string };

const NAV_ITEMS: NavItem[] = [
    { label: "Обзор", href: "/dashboard" },
    { label: "Заказы", clientLabel: "Мои заказы", freelancerLabel: "Маркетплейс", href: "/dashboard/orders" },
    { label: "Предложения", href: "/dashboard/proposals" },
    { label: "Сообщения", href: "/dashboard/messages" },
    { label: "Баланс", href: "/dashboard/balance" },
    { label: "AI", href: "/dashboard/ai" },
];

export const DashboardTopbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const pathname = usePathname();
    const role = useSessionStore((s) => s.role);
    const clearSession = useSessionStore((s) => s.clearSession);
    const { unreadCount, hasUnread } = useNotificationCenter();
    const pulseKey = useRealtimeStore((s) => s.pulseKey);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        const onKeydown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                setIsPaletteOpen(true);
            }
        };
        window.addEventListener("keydown", onKeydown);
        return () => window.removeEventListener("keydown", onKeydown);
    }, []);

    const getLabel = (item: NavItem) => {
        if (role === "client" && item.clientLabel) return item.clientLabel;
        if (role === "freelancer" && item.freelancerLabel) return item.freelancerLabel;
        return item.label;
    };

    const isActive = (href: string) => {
        if (href === "/dashboard") return pathname === "/dashboard";
        return pathname.startsWith(href);
    };

    const handleLogout = () => {
        authTokenStorage.clear();
        clearSession();
        window.location.href = "/login";
    };

    return (
        <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-6xl">
            {/* Liquid Glass Floating Bar */}
            <div className={`liquid-glass relative rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-between gap-2 transition-all duration-300 ${scrolled ? "shadow-2xl shadow-black/30 !bg-[rgba(20,20,35,0.85)]" : ""}`}>
                {/* Mobile toggle */}
                <button
                    type="button"
                    onClick={() => setIsMenuOpen((v) => !v)}
                    className="lg:hidden text-zinc-400 hover:text-zinc-200 transition-colors p-1"
                    aria-label={isMenuOpen ? "Закрыть меню" : "Открыть меню"}
                >
                    {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>

                {/* Brand */}
                <div className="shrink-0">
                    <Logo size="sm" />
                </div>

                {/* Desktop nav tabs */}
                <div className="hidden lg:flex items-center gap-1 mx-4">
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`text-sm transition-colors px-3 py-1.5 rounded-lg ${isActive(item.href)
                                    ? "text-white bg-purple-600/20 border border-purple-500/30"
                                    : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]"
                                }`}
                        >
                            {getLabel(item)}
                        </Link>
                    ))}
                </div>

                {/* Right section: bell + avatar */}
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="flat"
                        size="sm"
                        className="hidden md:flex bg-zinc-900/40 text-zinc-300 border border-zinc-700/60 hover:border-purple-500/40"
                        startContent={<Search size={14} />}
                        endContent={<Kbd keys={["command"]}>K</Kbd>}
                        onPress={() => setIsPaletteOpen(true)}
                    >
                        Поиск
                    </Button>
                    {/* Notifications */}
                    <Button
                        as={Link}
                        href="/dashboard/notifications"
                        isIconOnly
                        variant="light"
                        size="sm"
                        className={`text-zinc-400 hover:text-zinc-200 relative ${hasUnread ? "animate-fade-in-up" : ""}`}
                        key={`notif-btn-${pulseKey}`}
                        aria-label="Уведомления"
                    >
                        {hasUnread ? (
                            <Badge content={unreadCount > 9 ? "9+" : unreadCount} color="danger" size="sm" shape="circle">
                                <Bell size={18} />
                            </Badge>
                        ) : (
                            <Bell size={18} />
                        )}
                    </Button>

                    {/* Avatar dropdown */}
                    <Dropdown placement="bottom-end">
                        <DropdownTrigger>
                            <button
                                type="button"
                                className="flex items-center gap-2 p-1 rounded-lg hover:bg-white/[0.04] transition-colors"
                            >
                                <Avatar
                                    size="sm"
                                    showFallback
                                    classNames={{
                                        base: "bg-purple-600/20 border border-purple-500/30",
                                        icon: "text-purple-400",
                                    }}
                                />
                            </button>
                        </DropdownTrigger>
                        <DropdownMenu
                            aria-label="User menu"
                            className="w-48"
                            itemClasses={{
                                base: "text-zinc-300 data-[hover=true]:bg-purple-600/10 data-[hover=true]:text-white",
                            }}
                        >
                            <DropdownItem key="profile" href="/dashboard/profile" startContent={<User size={16} />}>
                                Профиль
                            </DropdownItem>
                            <DropdownItem key="settings" href="/dashboard/settings" startContent={<Settings size={16} />}>
                                Настройки
                            </DropdownItem>
                            <DropdownItem
                                key="logout"
                                startContent={<LogOut size={16} />}
                                className="text-red-400 data-[hover=true]:text-red-300"
                                onPress={handleLogout}
                            >
                                Выйти
                            </DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                </div>
            </div>

            {/* Mobile dropdown */}
            {isMenuOpen && (
                <div className="lg:hidden liquid-glass relative rounded-2xl mt-2 px-4 py-4 flex flex-col gap-1 animate-fade-in-up">
                    <button
                        type="button"
                        className="text-left text-zinc-300 hover:text-zinc-100 hover:bg-white/[0.04] px-3 py-2.5 rounded-lg"
                        onClick={() => {
                            setIsPaletteOpen(true);
                            setIsMenuOpen(false);
                        }}
                    >
                        Поиск (Cmd/Ctrl+K)
                    </button>
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`text-base transition-colors px-3 py-2.5 rounded-lg ${isActive(item.href)
                                    ? "text-white bg-purple-600/20"
                                    : "text-zinc-300 hover:text-zinc-100 hover:bg-white/[0.04]"
                                }`}
                            onPress={() => setIsMenuOpen(false)}
                        >
                            {getLabel(item)}
                        </Link>
                    ))}
                </div>
            )}
            <CommandPalette isOpen={isPaletteOpen} onOpenChange={setIsPaletteOpen} />
        </nav>
    );
};
