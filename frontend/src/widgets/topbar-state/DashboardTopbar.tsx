"use client";

import { useEffect, useMemo, useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionStore } from "@/shared/store/session.store";
import { useNotificationCenter } from "@/features/notification-center";
import { authTokenStorage } from "@/shared/api/client";
import { useBalance } from "@/features/balance-management";
import { useProfile } from "@/features/profile-management";
import { formatMoney } from "@/shared/lib/money";
import { cn } from "@/shared/lib/cn";
import {
    FilkaAvatar,
    FilkaBadge,
    FilkaMenu,
    FilkaMenuItem,
    FilkaMenuLabel,
    FilkaMenuSeparator,
    IconBell,
    IconChat,
    IconDashboard,
    IconLightning,
    IconLogo,
    IconLogout,
    IconOrders,
    IconProfile,
    IconSearch,
    IconSettings,
    IconShield,
    IconSpark,
    IconWallet,
} from "@/shared/ui/filka";
import { CommandPalette } from "./CommandPalette";

type ActiveKey = "dashboard" | "orders" | "chat" | "wallet" | "profile" | "settings" | "notifications" | "ai" | "proposals";

const getRouteMeta = (
    pathname: string,
    role: "client" | "freelancer" | null,
): { active: ActiveKey; title: string; subtitle: string } => {
    if (pathname.startsWith("/dashboard/orders/new")) {
        return { active: "orders", title: "Новый заказ", subtitle: "AI-ассистент превратит идею в техническое задание" };
    }
    if (/^\/dashboard\/orders\/[^/]+/.test(pathname)) {
        return { active: "orders", title: "Заказ", subtitle: "детали, отклики и защищённая сделка" };
    }
    if (pathname.startsWith("/dashboard/orders")) {
        return {
            active: "orders",
            title: role === "freelancer" ? "Биржа заказов" : "Мои заказы",
            subtitle: role === "freelancer" ? "лента релевантных задач и быстрый отклик" : "управление заказами и откликами",
        };
    }
    if (pathname.startsWith("/dashboard/messages")) {
        return { active: "chat", title: "Сообщения", subtitle: "чаты, договорённости и статусы сделок" };
    }
    if (pathname.startsWith("/dashboard/balance")) {
        return { active: "wallet", title: "Кошелёк", subtitle: "баланс, эскроу и история операций" };
    }
    if (pathname.startsWith("/dashboard/profile")) {
        return { active: "profile", title: "Профиль", subtitle: "портфолио, рейтинг и личные настройки" };
    }
    if (pathname.startsWith("/dashboard/settings")) {
        return { active: "settings", title: "Настройки", subtitle: "безопасность, уведомления и AI-параметры" };
    }
    if (pathname.startsWith("/dashboard/notifications")) {
        return { active: "notifications", title: "Уведомления", subtitle: "вся активность и алерты" };
    }
    if (pathname.startsWith("/dashboard/proposals")) {
        return { active: "proposals", title: "Отклики", subtitle: "ваши предложения по заказам" };
    }
    if (pathname.startsWith("/dashboard/ai")) {
        return { active: "ai", title: "AI-ассистент", subtitle: "помощь с задачами, ответами и подбором" };
    }
    return {
        active: "dashboard",
        title: "Лента",
        subtitle: role === "freelancer" ? "новые задачи и активные диалоги" : "новые заказы, отклики и активность",
    };
};

interface DockItem {
    readonly key: ActiveKey;
    readonly href: Route;
    readonly label: string;
    readonly clientLabel?: string;
    readonly freelancerLabel?: string;
    readonly icon: (props: { size?: number }) => React.ReactNode;
}

const DOCK_ITEMS: ReadonlyArray<DockItem> = [
    { key: "dashboard", href: "/dashboard", label: "Лента", icon: IconDashboard as DockItem["icon"] },
    { key: "orders", href: "/dashboard/orders", label: "Заказы", clientLabel: "Заказы", freelancerLabel: "Биржа", icon: IconOrders as DockItem["icon"] },
    { key: "chat", href: "/dashboard/messages", label: "Чаты", icon: IconChat as DockItem["icon"] },
    { key: "wallet", href: "/dashboard/balance", label: "Кошелёк", icon: IconWallet as DockItem["icon"] },
    { key: "proposals", href: "/dashboard/proposals", label: "Отклики", icon: IconLightning as DockItem["icon"] },
];

const labelFor = (item: DockItem, role: "client" | "freelancer" | null) => {
    if (role === "client" && item.clientLabel) return item.clientLabel;
    if (role === "freelancer" && item.freelancerLabel) return item.freelancerLabel;
    return item.label;
};

export const DashboardTopbar = () => {
    const pathname = usePathname();
    const role = useSessionStore((s) => s.role);
    const clearSession = useSessionStore((s) => s.clearSession);
    const { unreadCount, hasUnread } = useNotificationCenter();
    const { data: balance } = useBalance();
    const { data: profile } = useProfile();

    const [isPaletteOpen, setIsPaletteOpen] = useState(false);

    const meta = useMemo(() => getRouteMeta(pathname, role), [pathname, role]);
    const availableValue = balance?.available ?? null;
    const pendingValue = balance?.pending ?? null;

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

    const handleLogout = () => {
        authTokenStorage.clear();
        clearSession();
        window.location.href = "/login";
    };

    const displayName = profile?.name ?? "Гость";
    const avatarUrl: string | null = profile?.avatar_url ?? null;

    return (
        <>
            <header
                className="sticky top-0 z-30 flex items-center gap-2 border-b px-4 sm:px-6"
                style={{
                    height: 60,
                    background: "rgba(5,6,15,0.86)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    borderColor: "var(--line)",
                }}
            >
                <Link href="/dashboard" className="mr-1 flex items-center gap-2">
                    <IconLogo size={26} />
                    <span className="hidden text-base font-bold tracking-[-0.015em] sm:inline">Филка</span>
                </Link>

                <nav className="ml-2 hidden items-center gap-1 lg:flex" aria-label="Главная навигация">
                    {DOCK_ITEMS.map((item) => {
                        const isActive = item.key === meta.active;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex h-9 items-center gap-2 rounded-[var(--r-md)] border px-3 text-[13px] font-medium transition-colors",
                                )}
                                style={{
                                    background: isActive ? "var(--bg-3)" : "transparent",
                                    borderColor: isActive ? "var(--line-2)" : "transparent",
                                    color: isActive ? "var(--fg-0)" : "var(--fg-1)",
                                }}
                            >
                                <Icon size={14} />
                                <span>{labelFor(item, role)}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="ml-auto flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsPaletteOpen(true)}
                        className="hidden h-9 items-center gap-2 rounded-[var(--r-md)] border px-3 text-sm transition-colors hover:border-[var(--line-hover)] xl:flex"
                        style={{ background: "var(--bg-1)", borderColor: "var(--line)", color: "var(--fg-2)", width: 280 }}
                    >
                        <IconSearch size={14} />
                        <span className="flex-1 truncate text-left">Поиск заказов, людей, чатов</span>
                        <span
                            className="t-mono ml-auto rounded border px-1.5 py-0.5 text-[10px]"
                            style={{ borderColor: "var(--line-2)" }}
                        >
                            ⌘K
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsPaletteOpen(true)}
                        className="grid h-9 w-9 place-items-center rounded-[var(--r-md)] xl:hidden"
                        style={{ background: "var(--bg-1)", border: "1px solid var(--line-2)", color: "var(--fg-2)" }}
                        aria-label="Поиск"
                    >
                        <IconSearch size={16} />
                    </button>

                    <Link
                        href="/dashboard/ai"
                        className="hidden h-9 items-center gap-2 rounded-[var(--r-md)] border px-3 text-sm font-medium md:flex"
                        style={{
                            background: "linear-gradient(135deg, rgba(102,58,243,0.15), rgba(79,43,199,0.08))",
                            borderColor: "rgba(102,58,243,0.28)",
                            color: "var(--mint-200)",
                        }}
                    >
                        <IconSpark size={14} />
                        AI
                    </Link>

                    <Link
                        href="/dashboard/balance"
                        className="hidden h-9 items-center gap-2 rounded-[var(--r-md)] border px-3 sm:flex"
                        style={{
                            background: "rgba(186,215,247,0.06)",
                            borderColor: "var(--line)",
                        }}
                    >
                        <IconWallet size={14} className="text-[var(--mint-300)]" />
                        <span className="t-tabular text-[13px] font-semibold">
                            {availableValue !== null ? formatMoney(availableValue) : "—"}
                        </span>
                        {pendingValue !== null && pendingValue > 0 ? (
                            <>
                                <span className="text-[var(--fg-3)] text-[12px]">·</span>
                                <IconShield size={12} className="text-[var(--fg-3)]" />
                                <span className="t-tabular text-[12px] text-[var(--fg-2)]">
                                    {formatMoney(pendingValue)}
                                </span>
                            </>
                        ) : null}
                    </Link>

                    <Link
                        href="/dashboard/notifications"
                        className="relative grid h-9 w-9 place-items-center rounded-[var(--r-md)] border transition-colors hover:bg-[var(--bg-3)]"
                        style={{ background: "var(--bg-1)", borderColor: "var(--line-2)", color: "var(--fg-1)" }}
                        aria-label="Уведомления"
                    >
                        <IconBell size={16} />
                        {hasUnread ? (
                            unreadCount > 0 ? (
                                <span className="absolute -right-1 -top-1">
                                    <FilkaBadge value={unreadCount} max={99} />
                                </span>
                            ) : (
                                <span
                                    className="absolute right-2 top-2 h-2 w-2 rounded-full"
                                    style={{ background: "var(--mint-400)", boxShadow: "0 0 0 2px var(--bg-0)" }}
                                />
                            )
                        ) : null}
                    </Link>

                    <FilkaMenu
                        align="end"
                        trigger={
                            <button type="button" className="rounded-full" aria-label="Меню профиля">
                                <FilkaAvatar name={displayName} src={avatarUrl} size={36} rounded="full" />
                            </button>
                        }
                    >
                        <div className="px-3 pb-2 pt-1">
                            <div className="text-sm font-semibold">{displayName}</div>
                            <div className="t-caption truncate text-[11px]">
                                {role === "freelancer" ? "Исполнитель" : role === "client" ? "Заказчик" : "Аккаунт"}
                            </div>
                        </div>
                        <FilkaMenuSeparator />
                        <FilkaMenuLabel>Аккаунт</FilkaMenuLabel>
                        <Link href="/dashboard/profile">
                            <FilkaMenuItem icon={<IconProfile size={14} />} label="Профиль" />
                        </Link>
                        <Link href="/dashboard/balance">
                            <FilkaMenuItem icon={<IconWallet size={14} />} label="Кошелёк" />
                        </Link>
                        <Link href="/dashboard/proposals">
                            <FilkaMenuItem icon={<IconLightning size={14} />} label="Мои отклики" />
                        </Link>
                        <Link href="/dashboard/settings">
                            <FilkaMenuItem icon={<IconSettings size={14} />} label="Настройки" />
                        </Link>
                        <FilkaMenuSeparator />
                        <FilkaMenuItem icon={<IconLogout size={14} />} label="Выйти" tone="danger" onSelect={handleLogout} />
                    </FilkaMenu>
                </div>
            </header>

            <div
                className="flex items-center gap-3 border-b px-4 py-3 sm:px-6"
                style={{ borderColor: "var(--line)", background: "var(--bg-0)" }}
            >
                <div className="min-w-0 flex-1">
                    <h1 className="t-h3 m-0 truncate">{meta.title}</h1>
                    <p className="t-caption truncate text-[12px]">{meta.subtitle}</p>
                </div>
            </div>

            <CommandPalette isOpen={isPaletteOpen} onOpenChange={setIsPaletteOpen} />
        </>
    );
};
