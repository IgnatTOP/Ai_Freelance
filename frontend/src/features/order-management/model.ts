"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi, type OrdersFilter, type CreateOrderInput, type UpdateOrderInput } from "@/shared/api/endpoints/orders";

export const useMyOrders = (filter?: OrdersFilter) =>
  useQuery({
    queryKey: ["orders", "my", filter],
    queryFn: () => ordersApi.getMyOrders(filter),
  });

export const useMarketplaceOrders = (filter?: OrdersFilter) =>
  useQuery({
    queryKey: ["orders", "marketplace", filter],
    queryFn: () => ordersApi.getMarketplace(filter),
  });

export const useOrderDetail = (
  id: string,
  options?: {
    readonly refetchInterval?: number;
  },
) =>
  useQuery({
    queryKey: ["orders", id],
    queryFn: () => ordersApi.getById(id),
    enabled: !!id,
    ...(options?.refetchInterval != null ? { refetchInterval: options.refetchInterval } : {}),
  });

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => ordersApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};

export const usePublishOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ordersApi.publish(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};

export const useDeleteOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ordersApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};

export const useUpdateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateOrderInput }) => ordersApi.update(id, input),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["orders", variables.id] });
    },
  });
};
