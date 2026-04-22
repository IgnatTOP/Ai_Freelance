"use client";

import type { ReactNode } from "react";
import { Logo } from "@/shared/ui/logo/Logo";
import { Link } from "@heroui/react";
import { Code2, Banknote, MessageCircle, Sparkles, Shield, Star } from "lucide-react";

const FLOATING_ICONS = [
    { Icon: Code2, className: "top-[12%] left-[8%] animate-float text-purple-500/15", size: 28 },
    { Icon: Banknote, className: "top-[25%] right-[12%] animate-float-delay text-emerald-500/15", size: 24 },
    { Icon: MessageCircle, className: "bottom-[20%] left-[15%] animate-float-delay-2 text-blue-500/15", size: 26 },
    { Icon: Sparkles, className: "top-[60%] right-[8%] animate-float text-amber-500/15", size: 22 },
    { Icon: Shield, className: "bottom-[35%] right-[20%] animate-float-delay text-indigo-500/15", size: 24 },
    { Icon: Star, className: "top-[45%] left-[5%] animate-float-delay-2 text-fuchsia-500/15", size: 20 },
];

interface AuthLayoutProps {
    readonly children: ReactNode;
    readonly title: string;
    readonly subtitle?: string;
}

export const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden gradient-bg-hero">
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-[15%] left-[20%] w-[400px] h-[400px] rounded-full bg-purple-600/[0.07] blur-[100px] animate-blob" />
            <div className="absolute top-[40%] right-[15%] w-[500px] h-[500px] rounded-full bg-indigo-600/[0.05] blur-[120px] animate-blob-delay" />
            <div className="absolute bottom-[10%] left-[30%] w-[350px] h-[350px] rounded-full bg-fuchsia-600/[0.04] blur-[100px] animate-blob-delay-2" />
            <div className="absolute inset-0 section-grid" />

            {/* Floating icons */}
            {FLOATING_ICONS.map(({ Icon, className, size }, i) => (
                <div key={i} className={`absolute ${className}`}>
                    <Icon size={size} />
                </div>
            ))}
        </div>

        {/* Card */}
        <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in-up">
            {/* Logo */}
            <div className="flex justify-center mb-8">
                <Link href="/">
                    <Logo size="lg" />
                </Link>
            </div>

            {/* Glass container */}
            <div className="glass-card rounded-2xl p-8 sm:p-10">
                <div className="text-center mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 mb-2">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-sm text-zinc-400">{subtitle}</p>
                    )}
                </div>

                {children}
            </div>

            {/* Trust badge */}
            <div className="flex items-center justify-center gap-2 mt-6 text-zinc-600 text-xs">
                <Shield size={12} />
                <span>Безопасное шифрованное соединение</span>
            </div>
        </div>
    </section>
);
