"use client";

import { create } from "zustand";

type OrderDraft = {
  title: string;
  description: string;
  category_id?: string;
  skill_tags: string[];
  budget_min?: number;
  budget_max?: number;
  deadline_at?: string;
};

type OrderWizardState = {
  step: 1 | 2 | 3 | 4 | 5;
  draft: OrderDraft;
  setStep: (step: 1 | 2 | 3 | 4 | 5) => void;
  patchDraft: (patch: Partial<OrderDraft>) => void;
  reset: () => void;
};

const initialDraft: OrderDraft = {
  title: "",
  description: "",
  skill_tags: []
};

export const useOrderWizardStore = create<OrderWizardState>((set) => ({
  step: 1,
  draft: initialDraft,
  setStep: (step) => set({ step }),
  patchDraft: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
  reset: () => set({ step: 1, draft: initialDraft })
}));
