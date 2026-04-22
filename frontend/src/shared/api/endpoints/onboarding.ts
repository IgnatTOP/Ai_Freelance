import { apiClient } from "../client";

export type OnboardingState = {
  role: "client" | "freelancer";
  onboarding_completed: boolean;
  onboarding_completed_at?: string;
  has_orders?: boolean;
  has_proposals?: boolean;
};

export const onboardingApi = {
  getState(): Promise<OnboardingState> {
    return apiClient.request<OnboardingState>("/onboarding/state");
  }
};
