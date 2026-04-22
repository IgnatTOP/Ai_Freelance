"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/shared/api/endpoints/dashboard";

export const useDashboardData = () =>
  useQuery({
    queryKey: ["dashboard", "data"],
    queryFn: () => dashboardApi.getData(),
  });

export const useDashboardStats = () =>
  useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => dashboardApi.getStats(),
  });
