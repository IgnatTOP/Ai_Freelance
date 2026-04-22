"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/shared/store/session.store";
import { useSessionHydrated } from "@/shared/store/use-session-hydrated";
import { useOnboardingStore } from "@/features/onboarding/model";
import { profileApi } from "@/shared/api/endpoints/profile";
import { type OnboardingState } from "@/shared/api/endpoints/onboarding";
import { OnboardingShell } from "./onboarding/OnboardingShell";
import { StepTransition } from "./onboarding/StepTransition";
import { WelcomeScreen } from "./onboarding/WelcomeScreen";
import { FreelancerFlow } from "./onboarding/freelancer/FreelancerFlow";
import { ClientFlow } from "./onboarding/client/ClientFlow";

const STORAGE_KEY = "vb_onboarding_v2";

export const OnboardingPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const role = useSessionStore((s) => s.role);
  const pendingPhone = useSessionStore((s) => s.pendingPhone);
  const isPhoneVerified = useSessionStore((s) => s.isPhoneVerified);
  const setOnboardingCompleted = useSessionStore((s) => s.setOnboardingCompleted);
  const sessionHydrated = useSessionHydrated();

  const { step, direction, freelancerData, clientData, nextStep, reset } =
    useOnboardingStore();

  const [isSaving, setIsSaving] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const markOnboardingCompleted = (completedAt: string) => {
    queryClient.setQueryData<OnboardingState>(["onboarding", "state"], (current) => {
      const nextState: OnboardingState = {
        role: current?.role ?? (role === "freelancer" ? "freelancer" : "client"),
        onboarding_completed: true,
        onboarding_completed_at: completedAt,
      };
      if (typeof current?.has_orders === "boolean") {
        nextState.has_orders = current.has_orders;
      }
      if (typeof current?.has_proposals === "boolean") {
        nextState.has_proposals = current.has_proposals;
      }
      return nextState;
    });
  };

  // Guards
  useEffect(() => {
    if (!sessionHydrated) return;
    if (!role) {
      router.replace("/login");
      return;
    }
    if (pendingPhone && !isPhoneVerified) {
      router.replace("/verify-phone");
    }
  }, [sessionHydrated, role, pendingPhone, isPhoneVerified, router]);

  // Freelancer finish handler
  const handleFreelancerFinish = async (redirectTo?: string) => {
    setIsSaving(true);
    try {
      const { name, bio, hourlyRate, skills, portfolioItems } =
        freelancerData;
      const completedAt = new Date().toISOString();

      const payload: Parameters<typeof profileApi.update>[0] = {};
      if (name) payload.name = name;
      if (bio) payload.bio = bio;
      if (Number(hourlyRate)) payload.hourly_rate = Number(hourlyRate);
      if (skills.length > 0) payload.skills = skills;
      payload.onboarding_completed_at = completedAt;
      await profileApi.update(payload);

      // Add portfolio items (non-blocking). Any single item failure must not block onboarding completion.
      for (const item of portfolioItems) {
        if (item.title.trim() && item.description.trim()) {
          const portfolioPayload: Parameters<typeof profileApi.addPortfolioItem>[0] = {
            title: item.title.trim(),
            description: item.description.trim(),
          };
          if (item.link?.trim()) portfolioPayload.link = item.link.trim();
          try {
            await profileApi.addPortfolioItem(portfolioPayload);
          } catch {
            // Ignore portfolio item errors at onboarding finish stage.
          }
        }
      }

      markOnboardingCompleted(completedAt);
      setOnboardingCompleted(true);
      window.localStorage.removeItem(STORAGE_KEY);
      reset();
      router.replace((redirectTo ?? "/dashboard") as never);
    } catch {
      // Let the user retry
    } finally {
      setIsSaving(false);
    }
  };

  // Client finish handler — saves profile data (name, company, avatar, description)
  const handleClientFinish = async () => {
    setIsSaving(true);
    try {
      const completedAt = new Date().toISOString();
      const payload: Parameters<typeof profileApi.update>[0] = {
        onboarding_completed_at: completedAt,
      };
      if (clientData.name) payload.name = clientData.name;
      if (clientData.company) payload.company_name = clientData.company;
      if (clientData.description) payload.bio = clientData.description;
      if (clientData.avatarPhotoId) payload.photo_id = clientData.avatarPhotoId;

      await profileApi.update(payload);

      markOnboardingCompleted(completedAt);
      setOnboardingCompleted(true);
      window.localStorage.removeItem(STORAGE_KEY);
      reset();
      router.replace("/dashboard" as never);
    } catch {
      // Let the user retry
    } finally {
      setIsSaving(false);
    }
  };

  if (!isMounted || !sessionHydrated || !role) return null;

  const isWelcome = step === 0;

  return (
    <OnboardingShell>
      {isWelcome ? (
        <StepTransition stepKey={0} direction={direction}>
          <WelcomeScreen role={role} onStart={nextStep} />
        </StepTransition>
      ) : role === "freelancer" ? (
        <FreelancerFlow
          onFinish={handleFreelancerFinish}
          isFinishing={isSaving}
        />
      ) : (
        <ClientFlow
          onFinish={handleClientFinish}
          isFinishing={isSaving}
        />
      )}
    </OnboardingShell>
  );
};
