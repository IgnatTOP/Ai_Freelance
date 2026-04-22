"use client";

import { useQuery } from "@tanstack/react-query";
import { searchApi } from "@/shared/api/endpoints/search";

export const useGlobalSearch = (query: string) =>
  useQuery({
    queryKey: ["search", "global", query],
    queryFn: () => searchApi.global(query),
    enabled: query.trim().length >= 2,
    staleTime: 5_000
  });

