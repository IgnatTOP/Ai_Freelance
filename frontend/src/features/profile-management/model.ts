"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { profileApi, type UpdateProfileInput, type CreatePortfolioInput } from "@/shared/api/endpoints/profile";

export const useProfile = () =>
  useQuery({
    queryKey: ["profile"],
    queryFn: () => profileApi.get(),
  });

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => profileApi.update(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

export const usePortfolio = () =>
  useQuery({
    queryKey: ["portfolio"],
    queryFn: () => profileApi.getPortfolio(),
  });

export const useAddPortfolioItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePortfolioInput) => profileApi.addPortfolioItem(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
};

export const useUserReviews = (userId?: string) =>
  useQuery({
    queryKey: ["reviews", userId],
    queryFn: () => profileApi.getReviews(userId),
    enabled: Boolean(userId),
  });
