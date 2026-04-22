import { apiClient } from "../client";

export interface Order {
  id: string;
  title: string;
  description: string;
  category: string;
  skill_tags: string[];
  budget_min: number;
  budget_max: number;
  deadline: string;
  status: string;
  client_id: string;
  proposals_count: number;
  created_at: string;
  updated_at: string;
}

type BackendOrder = {
  id: string;
  title: string;
  description: string;
  category?: { name?: string } | null;
  requirements?: Array<{ skill?: string }> | null;
  skill_tags?: string[] | null;
  budget_min?: number | null;
  budget_max?: number | null;
  deadline?: string | null;
  deadline_at?: string | null;
  status: string;
  client_id: string;
  proposals_count?: number | null;
  created_at: string;
  updated_at: string;
};

export interface CreateOrderInput {
  title: string;
  description: string;
  category: string;
  skill_tags: string[];
  budget_min: number;
  budget_max: number;
  deadline: string;
}

export interface UpdateOrderInput {
  title?: string;
  description?: string;
  budget_min?: number;
  budget_max?: number;
  deadline?: string;
  category_id?: string;
  skill_tags?: string[];
}

type BackendCreateOrderPayload = {
  title: string;
  description: string;
  category_id?: string;
  budget_min: number;
  budget_max: number;
  deadline_at?: string;
  requirements: Array<{ skill: string; level: string }>;
};

type BackendUpdateOrderPayload = {
  title?: string;
  description?: string;
  category_id?: string;
  budget_min?: number;
  budget_max?: number;
  deadline_at?: string;
  requirements?: Array<{ skill: string; level: string }>;
};

const normalizeBudgetRange = (budgetMinInput: number, budgetMaxInput: number) => {
  const budgetMin = Math.round(Number(budgetMinInput));
  const budgetMax = Math.round(Number(budgetMaxInput));

  if (!Number.isFinite(budgetMin) || !Number.isFinite(budgetMax)) {
    throw new Error("Budget range must contain valid numbers");
  }
  if (budgetMin <= 0 || budgetMax <= 0) {
    throw new Error("Budget range must be greater than 0");
  }
  if (budgetMin > budgetMax) {
    throw new Error("Budget min cannot exceed budget max");
  }

  return { budgetMin, budgetMax };
};

export interface OrdersFilter {
  status?: string;
  category?: string;
  min_budget?: number;
  max_budget?: number;
  skills?: string[];
  sort?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedOrders {
  items: Order[];
  total: number;
  page: number;
  limit: number;
}

const normalizeOrder = (order: BackendOrder): Order => {
  const fromRequirements = (order.requirements ?? [])
    .map((req) => req.skill?.trim())
    .filter((skill): skill is string => Boolean(skill));

  const skillTags = (order.skill_tags ?? []).length > 0 ? (order.skill_tags ?? []) : fromRequirements;
  const categoryName = order.category?.name?.trim() || "Без категории";

  const budgetMin = typeof order.budget_min === "number" ? order.budget_min : 0;
  const budgetMax = typeof order.budget_max === "number" ? order.budget_max : budgetMin;

  return {
    id: order.id,
    title: order.title,
    description: order.description,
    category: categoryName,
    skill_tags: skillTags,
    budget_min: budgetMin,
    budget_max: budgetMax,
    deadline: order.deadline ?? order.deadline_at ?? "",
    status: order.status,
    client_id: order.client_id,
    proposals_count: order.proposals_count ?? 0,
    created_at: order.created_at,
    updated_at: order.updated_at
  };
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toDeadlineAt = (deadline: string): string | undefined => {
  const raw = deadline.trim();
  if (!raw) return undefined;

  // UI often stores date-only values. Convert to the end of day to avoid "past date" rejections.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}T23:59:59`);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toISOString();
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

export const ordersApi = {
  async getMyOrders(filter?: OrdersFilter): Promise<PaginatedOrders> {
    const response = await apiClient.request<BackendOrder[]>(`/orders/my`);
    const allItems = response.map(normalizeOrder);

    const statusFiltered = filter?.status
      ? allItems.filter((item) => item.status === filter.status)
      : allItems;

    const limit = filter?.limit ?? 20;
    const page = Math.max(filter?.page ?? 1, 1);
    const offset = (page - 1) * limit;
    const items = statusFiltered.slice(offset, offset + limit);

    return {
      items,
      total: statusFiltered.length,
      page,
      limit
    };
  },

  async getMarketplace(filter?: OrdersFilter): Promise<PaginatedOrders> {
    const params = new URLSearchParams();
    if (filter?.status) params.set("status", filter.status);
    if (filter?.category) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(filter.category);
      if (isUUID) params.set("category_id", filter.category);
    }
    if (filter?.min_budget) params.set("min_budget", String(filter.min_budget));
    if (filter?.max_budget) params.set("max_budget", String(filter.max_budget));
    if (filter?.skills?.length) params.set("skills", filter.skills.join(","));
    let mappedSort: { by: string; order: "asc" | "desc" };
    switch (filter?.sort) {
      case "budget_desc":
        mappedSort = { by: "budget_max", order: "desc" };
        break;
      case "budget_asc":
        mappedSort = { by: "budget_min", order: "asc" };
        break;
      case "deadline":
        mappedSort = { by: "created_at", order: "desc" };
        break;
      case "newest":
      default:
        mappedSort = { by: "created_at", order: "desc" };
        break;
    }
    params.set("sort_by", mappedSort.by);
    params.set("sort_order", mappedSort.order);
    const limit = filter?.limit ?? 20;
    const page = filter?.page ?? 1;
    params.set("limit", String(limit));
    params.set("offset", String((Math.max(page, 1) - 1) * limit));
    const query = params.toString();
    const response = await apiClient.requestPaginated<BackendOrder>(`/orders${query ? `?${query}` : ""}`);
    const currentPage = Math.floor(response.pagination.offset / response.pagination.limit) + 1;
    return {
      items: response.data.map(normalizeOrder),
      total: response.pagination.total,
      page: currentPage,
      limit: response.pagination.limit
    };
  },

  async getById(id: string): Promise<Order> {
    const order = await apiClient.request<BackendOrder>(`/orders/${id}`);
    return normalizeOrder(order);
  },

  async create(input: CreateOrderInput): Promise<Order> {
    const { budgetMin, budgetMax } = normalizeBudgetRange(input.budget_min, input.budget_max);

    const payload: BackendCreateOrderPayload = {
      title: input.title.trim(),
      description: input.description.trim(),
      budget_min: budgetMin,
      budget_max: budgetMax,
      requirements: (input.skill_tags ?? [])
        .map((skill) => skill.trim())
        .filter(Boolean)
        .map((skill) => ({ skill, level: "middle" }))
    };

    if (input.category && UUID_RE.test(input.category)) {
      payload.category_id = input.category;
    }

    const deadlineAt = toDeadlineAt(input.deadline);
    if (deadlineAt) {
      payload.deadline_at = deadlineAt;
    }

    const created = await apiClient.request<BackendOrder>("/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return normalizeOrder(created);
  },

  async publish(id: string): Promise<Order> {
    const order = await apiClient.request<BackendOrder>(`/orders/${id}/publish`, {
      method: "POST",
    });
    return normalizeOrder(order);
  },

  async delete(id: string): Promise<void> {
    return apiClient.request<void>(`/orders/${id}`, {
      method: "DELETE",
    });
  },

  async update(id: string, input: UpdateOrderInput): Promise<Order> {
    const payload: BackendUpdateOrderPayload = {};

    if (typeof input.title === "string") payload.title = input.title.trim();
    if (typeof input.description === "string") payload.description = input.description.trim();
    const hasBudgetMin = typeof input.budget_min === "number";
    const hasBudgetMax = typeof input.budget_max === "number";
    if (hasBudgetMin || hasBudgetMax) {
      if (!hasBudgetMin || !hasBudgetMax) {
        throw new Error("Both budget_min and budget_max are required together");
      }
      const { budgetMin, budgetMax } = normalizeBudgetRange(input.budget_min as number, input.budget_max as number);
      payload.budget_min = budgetMin;
      payload.budget_max = budgetMax;
    }

    if (typeof input.category_id === "string") {
      payload.category_id = input.category_id;
    }

    if (Array.isArray(input.skill_tags)) {
      payload.requirements = input.skill_tags
        .map((skill) => skill.trim())
        .filter(Boolean)
        .map((skill) => ({ skill, level: "middle" }));
    }

    const deadlineAt = typeof input.deadline === "string" ? toDeadlineAt(input.deadline) : undefined;
    if (deadlineAt) payload.deadline_at = deadlineAt;

    const updated = await apiClient.request<BackendOrder>(`/orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    return normalizeOrder(updated);
  },
};
