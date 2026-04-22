import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AppProviders } from "@/shared/store/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "НейроБиржа — Фриланс-биржа нового поколения",
  description:
    "AI-платформа для поиска фрилансеров и заказов. Безопасный escrow, умный подбор, мгновенные выплаты.",
  keywords: ["фриланс", "биржа", "freelance", "AI", "escrow", "разработка"],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className="dark" data-theme="dark">
      <body className="bg-background text-foreground antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
