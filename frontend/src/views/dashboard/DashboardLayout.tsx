"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/shared/store/session.store";
import { useSessionHydrated } from "@/shared/store/use-session-hydrated";
import { authTokenStorage } from "@/shared/api/client";
import { DashboardTopbar, MobileBottomNav, RealtimeStatusBar, ToastCenter } from "@/widgets/topbar-state";
import { AIFloatingButton, AISliderPanel } from "@/widgets/ai-floating";
import { useOnboardingState } from "@/features/onboarding";

interface DashboardLayoutProps {
    readonly children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
    const router = useRouter();
    const userId = useSessionStore((s) => s.userId);
    const pendingPhone = useSessionStore((s) => s.pendingPhone);
    const isPhoneVerified = useSessionStore((s) => s.isPhoneVerified);
    const setOnboardingCompleted = useSessionStore((s) => s.setOnboardingCompleted);
    const clearSession = useSessionStore((s) => s.clearSession);
    const sessionHydrated = useSessionHydrated();
    const [hydrated, setHydrated] = useState(false);
    const { data: onboardingState, isLoading: onboardingLoading } = useOnboardingState();

    useEffect(() => {
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (hydrated && sessionHydrated) {
            const token = authTokenStorage.get();
            if (!token) {
                clearSession();
                router.replace("/login");
            } else if (userId && pendingPhone && !isPhoneVerified) {
                router.replace("/verify-phone");
            }
        }
    }, [clearSession, hydrated, sessionHydrated, userId, pendingPhone, isPhoneVerified, router]);

    useEffect(() => {
        if (!hydrated || !sessionHydrated || !authTokenStorage.get() || onboardingLoading || !onboardingState) return;
        if (!onboardingState.onboarding_completed) {
            router.replace("/onboarding" as never);
            return;
        }
        setOnboardingCompleted(true);
    }, [hydrated, sessionHydrated, onboardingLoading, onboardingState, router, setOnboardingCompleted]);

    if (!hydrated || !sessionHydrated) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!authTokenStorage.get()) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (onboardingLoading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] section-grid">
            <DashboardTopbar />
            <RealtimeStatusBar />
            <main className="pt-24 pb-24 lg:pb-12 px-4 sm:px-6 max-w-[1400px] mx-auto animate-fade-in-up">
                <div className="max-w-[1400px]">{children}</div>
            </main>
            <MobileBottomNav />
            <ToastCenter />
            <AIFloatingButton />
            <AISliderPanel />
        </div>
    );
};
