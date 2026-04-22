"use client";

import { useQuery } from "@tanstack/react-query";
import { onboardingApi } from "@/shared/api/endpoints/onboarding";

export const useOnboardingState = (enabled = true) =>
  useQuery({
    queryKey: ["onboarding", "state"],
    queryFn: () => onboardingApi.getState(),
    retry: false,
    enabled
  });
