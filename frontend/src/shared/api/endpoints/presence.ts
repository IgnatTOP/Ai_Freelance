import { apiClient } from "@/shared/api/client";

export const presenceApi = {
  async getOnlineCount(): Promise<{ online_count: number; count: number }> {
    const data = await apiClient.request<{ online_count?: number; count?: number }>("/presence/online-count");
    const count = typeof data.count === "number" ? data.count : data.online_count ?? 0;
    return { online_count: count, count };
  }
};
