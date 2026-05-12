import { apiClient } from "../client";

export interface OrderReview {
  id: string;
  order_id: string;
  reviewer_id: string;
  reviewed_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

type BackendOrderReview = {
  id?: string;
  order_id?: string;
  reviewer_id?: string;
  reviewed_id?: string;
  rating?: number;
  comment?: string | null;
  created_at?: string;
  updated_at?: string;
};

const toOrderReview = (raw: BackendOrderReview): OrderReview => ({
  id: raw.id ?? "",
  order_id: raw.order_id ?? "",
  reviewer_id: raw.reviewer_id ?? "",
  reviewed_id: raw.reviewed_id ?? "",
  rating: typeof raw.rating === "number" ? raw.rating : 0,
  comment: raw.comment ?? null,
  created_at: raw.created_at ?? "",
  updated_at: raw.updated_at ?? "",
});

export interface CreateOrderReviewInput {
  order_id: string;
  reviewed_id: string;
  rating: number;
  comment?: string | null;
}

export const reviewsApi = {
  async getCanLeaveReview(orderId: string): Promise<boolean> {
    const data = await apiClient.request<{ can_leave_review?: boolean }>(`/orders/${orderId}/can-review`);
    return Boolean(data.can_leave_review);
  },

  async listOrderReviews(orderId: string): Promise<OrderReview[]> {
    const raw = await apiClient.request<BackendOrderReview[]>(`/orders/${orderId}/reviews`);
    if (!Array.isArray(raw)) return [];
    return raw.map(toOrderReview);
  },

  async createOrderReview(orderId: string, input: CreateOrderReviewInput): Promise<OrderReview> {
    const payload: CreateOrderReviewInput = {
      order_id: input.order_id,
      reviewed_id: input.reviewed_id,
      rating: input.rating,
      comment: input.comment?.trim() ? input.comment.trim() : null,
    };
    const raw = await apiClient.request<BackendOrderReview>(`/orders/${orderId}/reviews`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return toOrderReview(raw);
  },
};
