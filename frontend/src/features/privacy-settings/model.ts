"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsApi, type PrivacySettings } from "@/shared/api/endpoints/settings";

const key = ["settings", "privacy"] as const;

export const usePrivacySettings = () => useQuery({ queryKey: key, queryFn: () => settingsApi.getPrivacy() });

export const useUpdatePrivacySettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PrivacySettings) => settingsApi.updatePrivacy(payload),
    onSuccess: (value) => {
      queryClient.setQueryData(key, value);
    }
  });
};
