"use client";

import { useCallback, useState } from "react";
import { apiClient } from "@/shared/api/client";
import { ordersApi, type Order } from "@/shared/api/endpoints/orders";

type RecommendedOrdersResponse = {
  recommended_order_ids?: string[];
  recommended_orders?: Array<{
    order_id?: string;
    match_score?: number;
    explanation?: string;
  }>;
};

export const useAIRecommendedOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(
    async () => {
      setIsLoading(true);
      try {
        const data = await apiClient.request<RecommendedOrdersResponse>("/ai/orders/recommended?limit=10");
        const ids = (data.recommended_order_ids ?? [])
          .map((id) => id.trim())
          .filter(Boolean);

        if (ids.length === 0) {
          setOrders([]);
          return;
        }

        const results = await Promise.allSettled(ids.map((id) => ordersApi.getById(id)));
        const items = results
          .filter((result): result is PromiseFulfilledResult<Order> => result.status === "fulfilled")
          .map((result) => result.value);
        setOrders(items);
      } catch {
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { orders, isLoading, fetch };
};
