"use client";

import { usePathname } from "next/navigation";
import NextLink from "next/link";
import type { Route } from "next";
import { useSessionStore } from "@/shared/store/session.store";
import { useNotificationCenter } from "@/features/notification-center";
import {
  FilkaBadge,
  IconChat,
  IconDashboard,
  IconOrders,
  IconProfile,
  IconWallet,
} from "@/shared/ui/filka";

type IconType = (props: { size?: number }) => React.ReactNode;

interface MobileItem {
  readonly href: Route;
  readonly label: string;
  readonly clientLabel?: string;
  readonly freelancerLabel?: string;
  readonly icon: IconType;
  readonly badge?: number;
}

const labelFor = (item: MobileItem, role: "client" | "freelancer" | null): string => {
  if (role === "client" && item.clientLabel) return item.clientLabel;
  if (role === "freelancer" && item.freelancerLabel) return item.freelancerLabel;
  return item.label;
};

export const MobileBottomNav = () => {
  const pathname = usePathname();
  const role = useSessionStore((s) => s.role);
  const { unreadCount } = useNotificationCenter();

  const items: ReadonlyArray<MobileItem> = [
    { href: "/dashboard", label: "Лента", icon: IconDashboard as IconType },
    { href: "/dashboard/orders", label: "Заказы", clientLabel: "Мои", freelancerLabel: "Биржа", icon: IconOrders as IconType },
    { href: "/dashboard/messages", label: "Чаты", icon: IconChat as IconType, badge: unreadCount },
    { href: "/dashboard/balance", label: "Кошелёк", icon: IconWallet as IconType },
    { href: "/dashboard/profile", label: "Профиль", icon: IconProfile as IconType },
  ];

  return (
    <nav
      className="fixed bottom-3 left-1/2 z-40 w-[95%] max-w-lg -translate-x-1/2 lg:hidden"
      aria-label="Мобильная навигация"
    >
      <div
        className="grid grid-cols-5 gap-1 rounded-[var(--r-xl)] border px-2 py-2 backdrop-blur-2xl"
        style={{
          background: "rgba(10,11,20,0.86)",
          borderColor: "var(--line-2)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {items.map((item) => {
          const isActive = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <NextLink
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center rounded-[var(--r-md)] py-1.5 text-[10px] transition-colors"
              style={{
                color: isActive ? "var(--fg-0)" : "var(--fg-2)",
                background: isActive ? "rgba(186,215,247,0.1)" : "transparent",
              }}
            >
              <span className="relative">
                <Icon size={18} />
                {item.badge ? (
                  <span className="absolute -right-2 -top-1.5">
                    <FilkaBadge value={item.badge} />
                  </span>
                ) : null}
              </span>
              <span className="mt-1 font-medium">{labelFor(item, role)}</span>
              {isActive ? (
                <span className="absolute inset-x-3 top-1 h-[2px] rounded-full" style={{ background: "var(--mint-400)" }} />
              ) : null}
            </NextLink>
          );
        })}
      </div>
    </nav>
  );
};
