"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { proposalsApi, type SubmitProposalInput } from "@/shared/api/endpoints/proposals";
import type { Proposal, PaginatedProposals } from "@/shared/api/endpoints/proposals";
import type { Order, PaginatedOrders } from "@/shared/api/endpoints/orders";

export const useMyProposals = (role: "client" | "freelancer" = "freelancer") =>
  useQuery({
    queryKey: ["proposals", "my", role],
    queryFn: () => proposalsApi.getByRole(role),
  });

export const useOrderProposals = (orderId: string) =>
  useQuery({
    queryKey: ["proposals", "order", orderId],
    queryFn: () => proposalsApi.getOrderProposals(orderId),
    enabled: !!orderId,
  });

export const useSubmitProposal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, input }: { orderId: string; input: SubmitProposalInput }) =>
      proposalsApi.submit(orderId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
};

export const useUpdateProposalStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      proposalId,
      status,
    }: {
      orderId: string;
      proposalId: string;
      status: string;
    }) => proposalsApi.updateStatus(orderId, proposalId, status),
    onSuccess: (updatedProposal, variables) => {
      const syncProposal = (proposal: Proposal): Proposal =>
        proposal.id === updatedProposal.id
          ? {
              ...proposal,
              ...updatedProposal,
              ...(variables.status === "accepted" ? { order_status: "in_progress" } : {}),
            }
          : proposal.order_id === variables.orderId && variables.status === "accepted"
            ? {
                ...proposal,
                order_status: "in_progress",
              }
            : proposal;

      const syncProposalPage = (current: PaginatedProposals | undefined): PaginatedProposals | undefined => {
        if (!current) return current;
        return {
          ...current,
          items: current.items.map(syncProposal),
        };
      };

      const syncOrder = (order: Order): Order =>
        order.id === variables.orderId && variables.status === "accepted"
          ? {
              ...order,
              status: "in_progress",
            }
          : order;

      const syncOrderPage = (current: PaginatedOrders | undefined): PaginatedOrders | undefined => {
        if (!current) return current;
        return {
          ...current,
          items: current.items.map(syncOrder),
        };
      };

      queryClient.setQueryData<PaginatedProposals>(["proposals", "order", variables.orderId], syncProposalPage);
      queryClient.setQueryData<PaginatedProposals>(["proposals", "my", "client"], syncProposalPage);
      queryClient.setQueryData<PaginatedProposals>(["proposals", "my", "freelancer"], syncProposalPage);
      queryClient.setQueriesData<PaginatedProposals>({ queryKey: ["proposals"] }, syncProposalPage);

      queryClient.setQueryData<Order>(["orders", variables.orderId], (current) => {
        if (!current || variables.status !== "accepted") return current;
        return {
          ...current,
          status: "in_progress",
        };
      });
      queryClient.setQueriesData<PaginatedOrders>({ queryKey: ["orders"] }, syncOrderPage);

      void queryClient.invalidateQueries({ queryKey: ["proposals"] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};
