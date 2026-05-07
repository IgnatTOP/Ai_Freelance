"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/shared/store/session.store";
import { useSessionHydrated } from "@/shared/store/use-session-hydrated";
import { authTokenStorage } from "@/shared/api/client";
import { DashboardTopbar, MobileBottomNav, RealtimeStatusBar, ToastCenter } from "@/widgets/topbar-state";
import { AIFloatingButton, AISliderPanel } from "@/widgets/ai-floating";
import { useOnboardingState } from "@/features/onboarding";
import { FilkaSpinner } from "@/shared/ui/filka";

interface DashboardLayoutProps {
    readonly children: ReactNode;
}

const FullScreenLoader = () => (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--bg-0)" }}>
        <FilkaSpinner size={32} />
    </div>
);

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

    if (!hydrated || !sessionHydrated || !authTokenStorage.get() || onboardingLoading) {
        return <FullScreenLoader />;
    }

    return (
        <div className="min-h-screen text-[var(--fg-0)]" style={{ background: "var(--bg-0)" }}>
            <DashboardTopbar />
            <RealtimeStatusBar />
            <main className="mx-auto w-full max-w-[1320px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12">
                <div className="animate-fade-in-up">{children}</div>
            </main>
            <MobileBottomNav />
            <ToastCenter />
            <AIFloatingButton />
            <AISliderPanel />
        </div>
    );
};
