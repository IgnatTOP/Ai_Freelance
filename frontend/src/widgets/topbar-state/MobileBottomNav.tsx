"use client";

import { usePathname } from "next/navigation";
import NextLink from "next/link";
import { Bot, BriefcaseBusiness, CircleDollarSign, Home, MessageSquare } from "lucide-react";
import { useSessionStore } from "@/shared/store/session.store";

type MobileItem = {
  href: string;
  label: string;
  clientLabel?: string;
  freelancerLabel?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const MOBILE_ITEMS: MobileItem[] = [
  { href: "/dashboard", label: "Обзор", icon: Home },
  { href: "/dashboard/orders", label: "Заказы", clientLabel: "Мои", freelancerLabel: "Биржа", icon: BriefcaseBusiness },
  { href: "/dashboard/messages", label: "Чаты", icon: MessageSquare },
  { href: "/dashboard/balance", label: "Баланс", icon: CircleDollarSign },
  { href: "/dashboard/ai", label: "AI", icon: Bot }
];

const getItemLabel = (item: MobileItem, role: "client" | "freelancer" | null): string => {
  if (role === "client" && item.clientLabel) return item.clientLabel;
  if (role === "freelancer" && item.freelancerLabel) return item.freelancerLabel;
  return item.label;
};

export const MobileBottomNav = () => {
  const pathname = usePathname();
  const role = useSessionStore((s) => s.role);

  return (
    <nav className="lg:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-lg">
      <div className="liquid-glass rounded-2xl px-2 py-2 grid grid-cols-5 gap-1">
        {MOBILE_ITEMS.map((item) => {
          const isActive = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <NextLink
              key={item.href}
              href={item.href as never}
              className={`flex flex-col items-center justify-center rounded-lg py-2 text-[10px] ${isActive ? "bg-violet-500/20 text-zinc-100" : "text-zinc-400"
                }`}
            >
              <Icon size={16} />
              <span className="mt-1">{getItemLabel(item, role)}</span>
            </NextLink>
          );
        })}
      </div>
    </nav>
  );
};
