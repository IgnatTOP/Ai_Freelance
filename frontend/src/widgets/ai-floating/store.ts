"use client";

import { create } from "zustand";

type AIFloatingStore = {
    isOpen: boolean;
    hasPulse: boolean;
    toggle: () => void;
    open: () => void;
    close: () => void;
    setPulse: (v: boolean) => void;
};

export const useAIFloatingStore = create<AIFloatingStore>((set) => ({
    isOpen: false,
    hasPulse: false,
    toggle: () => set((s) => ({ isOpen: !s.isOpen, hasPulse: false })),
    open: () => set({ isOpen: true, hasPulse: false }),
    close: () => set({ isOpen: false }),
    setPulse: (v) => set({ hasPulse: v }),
}));
