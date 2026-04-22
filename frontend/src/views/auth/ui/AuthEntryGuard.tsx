"use client";

import { type ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/shared/store/session.store";
import { useSessionHydrated } from "@/shared/store/use-session-hydrated";
import { ApiError, authTokenStorage } from "@/shared/api/client";
import { useOnboardingState } from "@/features/onboarding";

interface AuthEntryGuardProps {
  readonly children: ReactNode;
}

export const AuthEntryGuard = ({ children }: AuthEntryGuardProps) => {
  const router = useRouter();
  const sessionHydrated = useSessionHydrated();
  const userId = useSessionStore((s) => s.userId);
  const pendingPhone = useSessionStore((s) => s.pendingPhone);
  const isPhoneVerified = useSessionStore((s) => s.isPhoneVerified);
  const clearSession = useSessionStore((s) => s.clearSession);

  const token = sessionHydrated ? authTokenStorage.get() : null;
  const shouldCheckOnboarding = sessionHydrated && Boolean(token) && (!pendingPhone || isPhoneVerified);
  const {
    data: onboardingState,
    isLoading: onboardingLoading,
    isError: onboardingFailed,
    error: onboardingError,
  } = useOnboardingState(shouldCheckOnboarding);

  useEffect(() => {
    if (!sessionHydrated) return;

    // No token => guest mode; ensure stale session state doesn't block auth forms.
    if (!token) {
      if (userId || pendingPhone || isPhoneVerified) {
        clearSession();
      }
      return;
    }

    // Incomplete phone verification: continue verification flow.
    if (pendingPhone && !isPhoneVerified) {
      router.replace("/verify-phone" as never);
      return;
    }

    if (!shouldCheckOnboarding || onboardingLoading) return;

    // Token appears invalid: reset session only for auth failures, not transient network errors.
    if (onboardingFailed) {
      const isAuthFailure =
        onboardingError instanceof ApiError
          ? onboardingError.status === 401 || onboardingError.status === 403
          : false;
      if (isAuthFailure) {
        authTokenStorage.clear();
        clearSession();
      }
      return;
    }

    if (!onboardingState) return;

    if (!onboardingState.onboarding_completed) {
      router.replace("/onboarding" as never);
      return;
    }

    router.replace("/dashboard" as never);
  }, [
    clearSession,
    isPhoneVerified,
    onboardingFailed,
    onboardingError,
    onboardingLoading,
    onboardingState,
    pendingPhone,
    router,
    sessionHydrated,
    shouldCheckOnboarding,
    token,
    userId
  ]);

  if (!sessionHydrated) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Hide auth forms while redirecting authenticated users.
  if (token) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
};
