import { apiClient } from "../client";
import { isTechnicalNotificationEvent, mapEventToUiNotification } from "@/shared/notifications/catalog";

export interface DashboardData {
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    createdAt: string;
  }>;
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    match: number;
  }>;
}

export interface DashboardStats {
  stats: Array<{
    label: string;
    value: string;
    icon: string;
  }>;
}

type BackendNotification = {
  id?: string;
  ID?: string;
  created_at?: string;
  CreatedAt?: string;
  payload?: Record<string, unknown> | string;
  Payload?: Record<string, unknown> | string;
};

type BackendDashboardData = {
  recentActivity?: DashboardData["recentActivity"];
  recommendations?: DashboardData["recommendations"];
  activities?: BackendNotification[];
  ai_recommendations?: {
    recommended_orders?: Array<{
      order?: { id?: string; title?: string; description?: string };
      order_id?: string;
      match_score?: number;
      explanation?: string;
    }>;
    suitable_freelancers?: Array<{
      freelancer_id?: string;
      match_score?: number;
      explanation?: string;
    }>;
  };
};

type BackendStatsResponse = {
  stats?: DashboardStats["stats"];
  orders?: {
    total?: number;
    open?: number;
    in_progress?: number;
    total_proposals?: number;
  };
  proposals?: {
    total?: number;
    accepted?: number;
  };
  balance?: number;
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toMatchPercent = (value: unknown): number => {
  const raw = toNumber(value);
  if (raw <= 0) return 0;
  if (raw <= 1) return Math.round(raw * 100);
  if (raw <= 10) return Math.round(raw * 10);
  return Math.min(Math.round(raw), 100);
};

const mapActivities = (items: BackendNotification[] | undefined): DashboardData["recentActivity"] => {
  if (!Array.isArray(items)) return [];

  const mapped = items.map((item, index) => {
    const id = item.id ?? item.ID ?? `activity-${index}`;
    const createdAt = item.created_at ?? item.CreatedAt ?? new Date().toISOString();
    const mappedUi = mapEventToUiNotification({
      payload: item.payload ?? item.Payload,
    });
    const isTechnical = isTechnicalNotificationEvent(mappedUi.eventName);

    return {
      id,
      type: mappedUi.kind === "payment" ? "payment" : mappedUi.kind,
      title: mappedUi.title,
      description: mappedUi.message,
      createdAt,
      isTechnical,
    };
  });

  const seen = new Set<string>();
  const unique = mapped.filter((item) => {
    const signature = `${item.type}|${item.title}|${item.description}`;
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });

  const nonTechnical = unique.filter((item) => !item.isTechnical);
  if (nonTechnical.length > 0) {
    return nonTechnical.map(({ isTechnical: _isTechnical, ...item }) => item);
  }

  return unique.slice(0, 1).map(({ isTechnical: _isTechnical, ...item }) => item);
};

const mapRecommendations = (raw: BackendDashboardData): DashboardData["recommendations"] => {
  if (Array.isArray(raw.recommendations)) return raw.recommendations;

  const ai = raw.ai_recommendations;
  if (!ai) return [];

  const fromOrders =
    ai.recommended_orders?.map((item) => ({
      id: item.order?.id ?? item.order_id ?? "",
      title: item.order?.title ?? "Рекомендованный заказ",
      description: item.explanation ?? item.order?.description ?? "",
      match: toMatchPercent(item.match_score),
    })) ?? [];

  const fromFreelancers =
    ai.suitable_freelancers?.map((item) => ({
      id: item.freelancer_id ?? "",
      title: "Подходящий исполнитель",
      description: item.explanation ?? "Рекомендация на основе AI-анализа",
      match: toMatchPercent(item.match_score),
    })) ?? [];

  return [...fromOrders, ...fromFreelancers].filter((item) => item.id);
};

const mapStats = (raw: BackendStatsResponse): DashboardStats => {
  if (Array.isArray(raw.stats)) return { stats: raw.stats };

  const orders = raw.orders ?? {};
  const proposals = raw.proposals ?? {};
  const balance = toNumber(raw.balance);

  const orderTotal = toNumber(orders.total);
  const orderOpen = toNumber(orders.open);
  const orderInProgress = toNumber(orders.in_progress);
  const orderProposals = toNumber(orders.total_proposals);

  const proposalTotal = toNumber(proposals.total);
  const proposalAccepted = toNumber(proposals.accepted);
  const acceptedRate = proposalTotal > 0 ? Math.round((proposalAccepted / proposalTotal) * 100) : 0;

  const isFreelancerLike = proposalTotal > 0 && orderTotal === 0;
  if (isFreelancerLike) {
    return {
      stats: [
        { label: "Выполнено", value: String(proposalAccepted), icon: "briefcase" },
        { label: "В работе", value: String(orderInProgress), icon: "trending-up" },
        { label: "Откликов", value: String(proposalTotal), icon: "message-square" },
        { label: "Баланс", value: `₽${Math.round(balance).toLocaleString("ru-RU")}`, icon: "wallet" },
      ],
    };
  }

  return {
    stats: [
      { label: "Мои заказы", value: String(orderTotal), icon: "briefcase" },
      { label: "Активные", value: String(orderOpen + orderInProgress), icon: "trending-up" },
      { label: "Получено откликов", value: String(orderProposals), icon: "message-square" },
      { label: "Баланс", value: `₽${Math.round(balance).toLocaleString("ru-RU")}`, icon: "wallet" },
    ],
  };
};

export const dashboardApi = {
  async getData(): Promise<DashboardData> {
    const raw = await apiClient.request<BackendDashboardData>("/dashboard/data?include_ai=true");
    return {
      recentActivity: Array.isArray(raw.recentActivity) ? raw.recentActivity : mapActivities(raw.activities),
      recommendations: mapRecommendations(raw),
    };
  },
  async getStats(): Promise<DashboardStats> {
    const raw = await apiClient.request<BackendStatsResponse>("/stats");
    return mapStats(raw);
  },
};
