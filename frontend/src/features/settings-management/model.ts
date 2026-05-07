"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi, type NotificationSettings, type AISettings } from "@/shared/api/endpoints/settings";
import { apiClient } from "@/shared/api/client";

export const useNotificationSettings = () =>
  useQuery({
    queryKey: ["settings", "notifications"],
    queryFn: () => settingsApi.getNotifications(),
  });

export const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NotificationSettings) => settingsApi.updateNotifications(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings", "notifications"] });
    },
  });
};

export const useAISettings = () =>
  useQuery({
    queryKey: ["settings", "ai"],
    queryFn: () => settingsApi.getAI(),
  });

export const useUpdateAISettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AISettings) => settingsApi.updateAI(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings", "ai"] });
    },
  });
};

export const useSessions = () =>
  useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const rows = await apiClient.request<
        Array<{
          id: string;
          user_agent?: string;
          ip_address?: string;
          created_at?: string;
          expires_at?: string;
        }>
      >("/auth/sessions");

      return rows.map((item) => ({
        id: item.id,
        device: item.user_agent ?? "Неизвестное устройство",
        ip: item.ip_address ?? "—",
        last_active: item.created_at ?? item.expires_at ?? new Date().toISOString(),
      }));
    },
  });
