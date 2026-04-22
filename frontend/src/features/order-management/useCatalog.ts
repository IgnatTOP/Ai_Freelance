"use client";

import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "@/shared/api/endpoints/catalog";

export const useCategories = () =>
    useQuery({
        queryKey: ["catalog", "categories"],
        queryFn: () => catalogApi.listCategories(),
        staleTime: 5 * 60 * 1000, // cache 5 min
    });

export const useSkills = () =>
    useQuery({
        queryKey: ["catalog", "skills"],
        queryFn: () => catalogApi.listSkills(),
        staleTime: 5 * 60 * 1000,
    });
