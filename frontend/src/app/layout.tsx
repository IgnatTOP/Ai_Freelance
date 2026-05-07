import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { AppProviders } from "@/shared/store/providers";
import "./globals.css";

const untitledSans = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-untitled-sans",
});

const aeonikPro = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-aeonikpro",
});

const dotDigital = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-dotdigital",
});

export const metadata: Metadata = {
  title: "Филка — AI-биржа фриланса",
  description:
    "Фриланс-платформа с AI-подбором, быстрым стартом задач и безопасным escrow.",
  keywords: ["фриланс", "биржа", "AI", "escrow", "заказы", "исполнители"],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ru"
      className={`dark ${untitledSans.variable} ${aeonikPro.variable} ${dotDigital.variable}`}
      data-theme="dark"
    >
      <body className="antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
