"use client";

import { useQuery } from "@tanstack/react-query";
import { presenceApi } from "@/shared/api/endpoints/presence";

interface OnlineCountResponse {
    count?: number;
    online_count?: number;
}

export const useOnlineCount = () =>
    useQuery({
        queryKey: ["presence", "online-count"],
        queryFn: async () => {
            const data = await presenceApi.getOnlineCount();
            return {
                count: data.count,
                online_count: data.online_count
            } satisfies OnlineCountResponse;
        },
        refetchInterval: 30_000,
        staleTime: 15_000,
    });
