import { apiClient } from "../client";
import { ordersApi } from "./orders";

export interface Proposal {
  id: string;
  order_id: string;
  freelancer_id: string;
  cover_letter: string;
  proposed_budget: number;
  proposed_amount?: number | null;
  estimated_days: number;
  proposed_deadline?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  order_title?: string;
  order_budget_min?: number;
  order_budget_max?: number;
  order_deadline?: string;
  order_status?: string;
  freelancer_name?: string;
  ai_analysis_for_client?: string | null;
  ai_analysis_for_client_at?: string | null;
}

export interface SubmitProposalInput {
  cover_letter: string;
  proposed_budget: number;
  estimated_days: number;
}

export interface PaginatedProposals {
  items: Proposal[];
  total: number;
  page: number;
  limit: number;
  best_recommendation?: {
    proposal_id: string;
    justification: string;
    score?: number;
  } | null;
}

type Role = "client" | "freelancer";

type BackendProposal = {
  id: string;
  order_id: string;
  freelancer_id: string;
  cover_letter: string;
  proposed_budget?: number | null;
  proposed_amount?: number | null;
  estimated_days?: number | null;
  proposed_deadline?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  order_title?: string;
  freelancer_name?: string;
  ai_analysis_for_client?: string | null;
  ai_analysis_for_client_at?: string | null;
};

const isWrappedProposal = (value: unknown): value is { proposal?: BackendProposal } =>
  Boolean(value && typeof value === "object" && "proposal" in value);

const normalizeProposal = (proposal: BackendProposal): Proposal => {
  const proposedBudgetCandidate =
    (typeof proposal.proposed_budget === "number" ? proposal.proposed_budget : undefined) ??
    (typeof proposal.proposed_amount === "number" ? proposal.proposed_amount : undefined) ??
    0;

  let estimatedDays = 0;
  if (typeof proposal.estimated_days === "number" && Number.isFinite(proposal.estimated_days)) {
    estimatedDays = Math.max(0, proposal.estimated_days);
  } else if (proposal.proposed_deadline) {
    const createdAt = new Date(proposal.created_at);
    const proposedDeadline = new Date(proposal.proposed_deadline);
    if (Number.isFinite(createdAt.getTime()) && Number.isFinite(proposedDeadline.getTime())) {
      const msPerDay = 24 * 60 * 60 * 1000;
      estimatedDays = Math.max(0, Math.ceil((proposedDeadline.getTime() - createdAt.getTime()) / msPerDay));
    }
  }

  const mapped: Proposal = {
    id: proposal.id,
    order_id: proposal.order_id,
    freelancer_id: proposal.freelancer_id,
    cover_letter: proposal.cover_letter,
    proposed_budget: proposedBudgetCandidate,
    estimated_days: estimatedDays,
    status: proposal.status,
    created_at: proposal.created_at,
    updated_at: proposal.updated_at,
  };
  if (proposal.proposed_amount !== undefined) mapped.proposed_amount = proposal.proposed_amount;
  if (proposal.proposed_deadline !== undefined) mapped.proposed_deadline = proposal.proposed_deadline;
  if (proposal.order_title !== undefined) mapped.order_title = proposal.order_title;
  if (proposal.freelancer_name !== undefined) mapped.freelancer_name = proposal.freelancer_name;
  if (proposal.ai_analysis_for_client !== undefined) {
    mapped.ai_analysis_for_client = proposal.ai_analysis_for_client;
  }
  if (proposal.ai_analysis_for_client_at !== undefined) {
    mapped.ai_analysis_for_client_at = proposal.ai_analysis_for_client_at;
  }
  return mapped;
};

const enrichWithOrderContext = async (items: Proposal[]): Promise<Proposal[]> => {
  const orderIds = [...new Set(items.map((item) => item.order_id).filter(Boolean))];
  if (orderIds.length === 0) return items;

  const pairs = await Promise.all(
    orderIds.map(async (orderId) => {
      try {
        const order = await ordersApi.getById(orderId);
        return [orderId, order] as const;
      } catch {
        return [orderId, null] as const;
      }
    }),
  );

  const orderMap = new Map(pairs);
  return items.map((item) => {
    const order = orderMap.get(item.order_id);
    if (!order) return item;

    return {
      ...item,
      order_title: item.order_title ?? order.title,
      order_budget_min: order.budget_min,
      order_budget_max: order.budget_max,
      order_deadline: order.deadline,
      order_status: order.status,
    };
  });
};

export const proposalsApi = {
  async getMyProposals(): Promise<PaginatedProposals> {
    const response = await apiClient.request<
      | BackendProposal[]
      | {
      proposals?: BackendProposal[];
      items?: BackendProposal[];
      data?: BackendProposal[];
      total?: number;
      page?: number;
      limit?: number;
    }
    >("/proposals/my");

    const rawItems = Array.isArray(response)
      ? response
      : response.items ?? response.proposals ?? response.data ?? [];
    const items = await enrichWithOrderContext(rawItems.map(normalizeProposal));

    const total = Array.isArray(response) ? items.length : response.total ?? items.length;
    const page = Array.isArray(response) ? 1 : response.page ?? 1;
    const limit = Array.isArray(response) ? Math.max(items.length, 1) : response.limit ?? Math.max(items.length, 1);
    return {
      items,
      total,
      page,
      limit,
    };
  },

  async getOrderProposals(orderId: string): Promise<PaginatedProposals> {
    const response = await apiClient.request<
      | BackendProposal[]
      | {
      proposals?: BackendProposal[];
      best_recommendation?: PaginatedProposals["best_recommendation"];
    }
    >(`/orders/${orderId}/proposals`);

    const rawItems = Array.isArray(response) ? response : response.proposals ?? [];
    const items = await enrichWithOrderContext(rawItems.map(normalizeProposal));
    const best = Array.isArray(response) ? null : response.best_recommendation ?? null;
    return {
      items,
      total: items.length,
      page: 1,
      limit: Math.max(items.length, 1),
      best_recommendation: best,
    };
  },

  async getIncomingForClient(): Promise<PaginatedProposals> {
    const myOrders = await ordersApi.getMyOrders({ page: 1, limit: 5000 });
    if (myOrders.items.length === 0) {
      return {
        items: [],
        total: 0,
        page: 1,
        limit: 1,
      };
    }

    const proposalsByOrder = await Promise.all(
      myOrders.items.map(async (order) => {
        const result = await proposalsApi.getOrderProposals(order.id);
        return result.items.map((proposal) => ({
          ...proposal,
          order_title: proposal.order_title ?? order.title,
        }));
      }),
    );

    const merged = await enrichWithOrderContext(proposalsByOrder.flat());
    const uniq = new Map<string, Proposal>();
    for (const item of merged) {
      uniq.set(item.id, item);
    }
    const items = [...uniq.values()].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    return {
      items,
      total: items.length,
      page: 1,
      limit: Math.max(items.length, 1),
    };
  },

  async getByRole(role: Role): Promise<PaginatedProposals> {
    if (role === "client") {
      return proposalsApi.getIncomingForClient();
    }
    return proposalsApi.getMyProposals();
  },

  async submit(orderId: string, input: SubmitProposalInput): Promise<Proposal> {
    const response = await apiClient.request<BackendProposal>(`/orders/${orderId}/proposals`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    return normalizeProposal(response);
  },

  async updateStatus(orderId: string, proposalId: string, status: string): Promise<Proposal> {
    const response = await apiClient.request<BackendProposal | { proposal?: BackendProposal }>(
      `/orders/${orderId}/proposals/${proposalId}/status`,
      {
        method: "PUT",
        body: JSON.stringify({ status }),
      }
    );
    const proposal = isWrappedProposal(response) ? response.proposal : response;
    if (!proposal) {
      throw new Error("Invalid updateStatus response");
    }
    return normalizeProposal(proposal);
  },
};
