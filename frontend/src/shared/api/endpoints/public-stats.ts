import { apiClient } from "../client";

export type PublicStatsResponse = {
  freelancers_total: number;
  completed_projects: number;
  marketplace_volume: number;
  average_rating: number;
};

type RawPublicStatsResponse = Partial<PublicStatsResponse>;

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const publicStatsApi = {
  async getLandingStats(): Promise<PublicStatsResponse> {
    const raw = await apiClient.request<RawPublicStatsResponse>("/stats/public");
    return {
      freelancers_total: toNumber(raw.freelancers_total),
      completed_projects: toNumber(raw.completed_projects),
      marketplace_volume: toNumber(raw.marketplace_volume),
      average_rating: toNumber(raw.average_rating),
    };
  },
};
