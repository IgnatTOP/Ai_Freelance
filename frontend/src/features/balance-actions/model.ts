"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";

export const useDepositBalance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (amount: number) =>
      apiClient.request<{ available: number; frozen: number }>("/payments/deposit", {
        method: "POST",
        body: JSON.stringify({ amount })
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["balance"] });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    }
  });
};
