"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { reviewsApi, type CreateOrderReviewInput } from "@/shared/api/endpoints/reviews";

export const orderReviewQueryKeys = {
  canLeave: (orderId: string) => ["orders", orderId, "can-review"] as const,
  list: (orderId: string) => ["orders", orderId, "reviews"] as const,
};

export const useCanLeaveReview = (orderId: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: orderReviewQueryKeys.canLeave(orderId ?? ""),
    queryFn: () => reviewsApi.getCanLeaveReview(orderId as string),
    enabled: Boolean(orderId) && enabled,
  });

export const useOrderReviews = (orderId: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: orderReviewQueryKeys.list(orderId ?? ""),
    queryFn: () => reviewsApi.listOrderReviews(orderId as string),
    enabled: Boolean(orderId) && enabled,
  });

export const useCreateOrderReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { orderId: string; input: CreateOrderReviewInput; reviewerId: string }) =>
      reviewsApi.createOrderReview(vars.orderId, vars.input),
    onSuccess: (_data, vars) => {
      const { orderId, input, reviewerId } = vars;
      void queryClient.invalidateQueries({ queryKey: orderReviewQueryKeys.canLeave(orderId) });
      void queryClient.invalidateQueries({ queryKey: orderReviewQueryKeys.list(orderId) });
      void queryClient.invalidateQueries({ queryKey: ["reviews", input.reviewed_id] });
      void queryClient.invalidateQueries({ queryKey: ["reviews", reviewerId] });
      void queryClient.invalidateQueries({ queryKey: ["orders", orderId] });
    },
  });
};
