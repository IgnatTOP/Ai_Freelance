"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";

export const useTerminateSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) =>
      apiClient.request<{ message: string }>(`/auth/sessions/${sessionId}`, {
        method: "DELETE"
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
    }
  });
};
