"use client";

import { usePathname } from "next/navigation";
import { Bot, BriefcaseBusiness, CircleDollarSign, Home, MessageSquare, Send, Settings, User } from "lucide-react";
import { useSessionStore } from "@/shared/store/session.store";

type NavItem = {
  href: string;
  label: string;
  clientLabel?: string;
  freelancerLabel?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Обзор", icon: Home },
  { href: "/dashboard/orders", label: "Заказы", clientLabel: "Мои заказы", freelancerLabel: "Маркетплейс", icon: BriefcaseBusiness },
  { href: "/dashboard/proposals", label: "Отклики", icon: Send },
  { href: "/dashboard/messages", label: "Чаты", icon: MessageSquare },
  { href: "/dashboard/balance", label: "Баланс", icon: CircleDollarSign },
  { href: "/dashboard/ai", label: "Void AI", icon: Bot },
  { href: "/dashboard/profile", label: "Профиль", icon: User },
  { href: "/dashboard/settings", label: "Настройки", icon: Settings }
];

const getItemLabel = (item: NavItem, role: "client" | "freelancer" | null): string => {
  if (role === "client" && item.clientLabel) return item.clientLabel;
  if (role === "freelancer" && item.freelancerLabel) return item.freelancerLabel;
  return item.label;
};

export const DashboardSidebar = () => {
  const pathname = usePathname();
  const role = useSessionStore((s) => s.role);

  return (
    <aside className="hidden lg:block fixed left-4 top-24 bottom-6 z-30 w-60">
      <div className="h-full rounded-2xl liquid-glass p-3 overflow-y-auto scrollbar-styled">
        <p className="px-2 py-2 text-[11px] uppercase tracking-wider text-zinc-500">Навигация</p>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-violet-500/20 text-zinc-100 border border-violet-500/30"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]"
                }`}
              >
                <Icon size={16} />
                <span>{getItemLabel(item, role)}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
