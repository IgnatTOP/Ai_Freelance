"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentsApi, type WithdrawInput } from "@/shared/api/endpoints/payments";

export const useBalance = () =>
  useQuery({
    queryKey: ["balance"],
    queryFn: () => paymentsApi.getBalance(),
  });

export const useTransactions = () =>
  useQuery({
    queryKey: ["transactions"],
    queryFn: () => paymentsApi.getTransactions(),
  });

export const useEscrowStatus = (orderId: string) =>
  useQuery({
    queryKey: ["escrow", orderId],
    queryFn: () => paymentsApi.getEscrow(orderId),
    enabled: !!orderId,
    retry: false,
  });

export const useActiveEscrows = () =>
  useQuery({
    queryKey: ["escrow", "active"],
    queryFn: () => paymentsApi.getActiveEscrows(),
  });

export const useReleaseEscrow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => paymentsApi.releaseEscrow(orderId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["balance"] });
      void queryClient.invalidateQueries({ queryKey: ["escrow"] });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
};

export const useRefundEscrow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => paymentsApi.refundEscrow(orderId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["balance"] });
      void queryClient.invalidateQueries({ queryKey: ["escrow"] });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
};

export const useWithdraw = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WithdrawInput) => paymentsApi.withdraw(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["balance"] });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
};
