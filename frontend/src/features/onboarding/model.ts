"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PortfolioEntry = {
  title: string;
  description: string;
  link?: string;
};

export type FreelancerData = {
  name: string;
  age: string;
  experienceYears: string;
  email: string;
  skills: string[];
  portfolioItems: PortfolioEntry[];
  hourlyRate: string;
  bio: string;
};

export type ClientData = {
  // Profile onboarding fields (ТЗ v3.0)
  name: string;
  company: string;
  avatarPhotoId: string;
  avatarPreviewUrl: string;
  description: string;
  // Legacy AI-generation fields (still used in order creation)
  freeText: string;
  generatedTitle: string;
  generatedDescription: string;
  generatedCategoryId: string;
  generatedSkills: string[];
  generatedBudgetMax: number;
  generatedDeadline: string;
};

type OnboardingStore = {
  step: number;
  direction: 1 | -1;
  freelancerData: FreelancerData;
  clientData: ClientData;

  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  updateFreelancer: (patch: Partial<FreelancerData>) => void;
  updateClient: (patch: Partial<ClientData>) => void;
  reset: () => void;
};

const initialFreelancer: FreelancerData = {
  name: "",
  age: "",
  experienceYears: "",
  email: "",
  skills: [],
  portfolioItems: [],
  hourlyRate: "",
  bio: "",
};

const initialClient: ClientData = {
  name: "",
  company: "",
  avatarPhotoId: "",
  avatarPreviewUrl: "",
  description: "",
  freeText: "",
  generatedTitle: "",
  generatedDescription: "",
  generatedCategoryId: "",
  generatedSkills: [],
  generatedBudgetMax: 0,
  generatedDeadline: "",
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      step: 0,
      direction: 1,
      freelancerData: { ...initialFreelancer },
      clientData: { ...initialClient },

      nextStep: () => set((s) => ({ step: s.step + 1, direction: 1 })),
      prevStep: () => set((s) => ({ step: Math.max(0, s.step - 1), direction: -1 })),
      goToStep: (step) =>
        set((s) => ({ step, direction: step > s.step ? 1 : -1 })),

      updateFreelancer: (patch) =>
        set((s) => ({ freelancerData: { ...s.freelancerData, ...patch } })),
      updateClient: (patch) =>
        set((s) => ({ clientData: { ...s.clientData, ...patch } })),

      reset: () =>
        set({
          step: 0,
          direction: 1,
          freelancerData: { ...initialFreelancer },
          clientData: { ...initialClient },
        }),
    }),
    {
      name: "vb_onboarding_v2",
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<OnboardingStore> | undefined;
        return {
          ...currentState,
          ...persisted,
          freelancerData: {
            ...initialFreelancer,
            ...(persisted?.freelancerData ?? {}),
          },
          clientData: {
            ...initialClient,
            ...(persisted?.clientData ?? {}),
          },
        };
      },
    }
  )
);
