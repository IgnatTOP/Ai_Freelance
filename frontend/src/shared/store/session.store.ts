import { create } from "zustand";
import { persist } from "zustand/middleware";

type SessionState = {
  userId: string | null;
  role: "client" | "freelancer" | null;
  pendingPhone: string | null;
  isPhoneVerified: boolean;
  onboardingCompleted: boolean;
  setSession: (userId: string, role: "client" | "freelancer") => void;
  setPendingPhone: (phone: string | null) => void;
  setPhoneVerified: (verified: boolean) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      userId: null,
      role: null,
      pendingPhone: null,
      isPhoneVerified: false,
      onboardingCompleted: false,
      setSession: (userId, role) => set({ userId, role }),
      setPendingPhone: (phone) => set({ pendingPhone: phone }),
      setPhoneVerified: (verified) => set({ isPhoneVerified: verified }),
      setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
      clearSession: () =>
        set({ userId: null, role: null, pendingPhone: null, isPhoneVerified: false, onboardingCompleted: false })
    }),
    {
      name: "vb_session",
    }
  )
);
