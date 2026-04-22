"use client";

import { useQuery } from "@tanstack/react-query";
import { publicStatsApi } from "@/shared/api/endpoints/public-stats";

export const usePublicLandingStats = () =>
  useQuery({
    queryKey: ["landing", "public-stats"],
    queryFn: () => publicStatsApi.getLandingStats(),
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
