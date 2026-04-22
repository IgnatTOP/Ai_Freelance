import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AppProviders } from "@/shared/store/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Филка — Фриланс, который сам находит своих",
  description:
    "AI-платформа, которая подбирает фрилансеров за секунды. Безопасный escrow, умный поиск, мгновенные выплаты.",
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
