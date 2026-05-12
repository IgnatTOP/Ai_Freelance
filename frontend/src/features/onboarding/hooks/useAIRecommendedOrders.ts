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

const toMatchPercent = (raw: unknown): number => {
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value <= 1) return Math.round(value * 100);
  if (value <= 10) return Math.round(value * 10);
  return Math.min(Math.round(value), 100);
};

export const useAIRecommendedOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [scoreById, setScoreById] = useState<Record<string, number>>({});
  const [explanationById, setExplanationById] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(
    async () => {
      setIsLoading(true);
      try {
        const data = await apiClient.request<RecommendedOrdersResponse>("/ai/orders/recommended?limit=10");

        const detailed = (data.recommended_orders ?? [])
          .map((item) => ({
            id: (item.order_id ?? "").trim(),
            score: toMatchPercent(item.match_score),
            explanation: (item.explanation ?? "").trim(),
          }))
          .filter((item) => item.id);

        const fallbackIds = (data.recommended_order_ids ?? [])
          .map((id) => id.trim())
          .filter(Boolean);

        const ordered = detailed.length > 0
          ? detailed
          : fallbackIds.map((id) => ({ id, score: 0, explanation: "" }));

        if (ordered.length === 0) {
          setOrders([]);
          setScoreById({});
          setExplanationById({});
          return;
        }

        const results = await Promise.allSettled(ordered.map((item) => ordersApi.getById(item.id)));
        const items: Order[] = [];
        const scores: Record<string, number> = {};
        const explanations: Record<string, string> = {};

        results.forEach((result, idx) => {
          if (result.status !== "fulfilled") return;
          const order = result.value;
          const orderedItem = ordered[idx];
          items.push(order);
          if (orderedItem && orderedItem.score > 0) scores[order.id] = orderedItem.score;
          if (orderedItem && orderedItem.explanation) explanations[order.id] = orderedItem.explanation;
        });

        setOrders(items);
        setScoreById(scores);
        setExplanationById(explanations);
      } catch {
        setOrders([]);
        setScoreById({});
        setExplanationById({});
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { orders, scoreById, explanationById, isLoading, fetch };
};
