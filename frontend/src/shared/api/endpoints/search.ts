import { apiClient } from "../client";
import type { CommandPaletteItem } from "@/shared/lib/command-palette";
import { ordersApi } from "./orders";
import { conversationsApi } from "./conversations";

type SearchResult = {
  id: string;
  type: "order" | "user" | "chat";
  title: string;
  subtitle?: string;
  href?: string;
};

type GroupedSearchResponse = {
  query?: string;
  groups?: {
    orders?: Array<Record<string, unknown>>;
    users?: Array<Record<string, unknown>>;
    chats?: Array<Record<string, unknown>>;
  };
};

const mapScope = (type: SearchResult["type"]): CommandPaletteItem["scope"] => {
  if (type === "chat") return "chats";
  if (type === "user") return "users";
  return "orders";
};

const fallbackHref = (item: SearchResult): string => {
  if (item.type === "chat") return `/dashboard/messages/${item.id}`;
  if (item.type === "user") return `/dashboard/profile`;
  return `/dashboard/orders/${item.id}`;
};

const toSearchResults = (response: SearchResult[] | GroupedSearchResponse): SearchResult[] => {
  if (Array.isArray(response)) return response;
  if (!response.groups) return [];

  const mapGroup = (
    group: Array<Record<string, unknown>> | undefined,
    type: SearchResult["type"]
  ): SearchResult[] =>
    (group ?? [])
      .map((item): SearchResult | null => {
        const id =
          (typeof item.id === "string" && item.id) ||
          (typeof item.order_id === "string" && item.order_id) ||
          (typeof item.user_id === "string" && item.user_id) ||
          (typeof item.conversation_id === "string" && item.conversation_id) ||
          "";
        if (!id) return null;

        const title =
          (typeof item.title === "string" && item.title) ||
          (typeof item.display_name === "string" && item.display_name) ||
          (typeof item.name === "string" && item.name) ||
          "Результат";

        const subtitle =
          (typeof item.subtitle === "string" && item.subtitle) ||
          (typeof item.description === "string" && item.description) ||
          (typeof item.message === "string" && item.message) ||
          undefined;

        const mapped: SearchResult = { id, type, title };
        if (subtitle) mapped.subtitle = subtitle;
        return mapped;
      })
      .filter((item): item is SearchResult => item !== null);

  return [
    ...mapGroup(response.groups.orders, "order"),
    ...mapGroup(response.groups.users, "user"),
    ...mapGroup(response.groups.chats, "chat"),
  ];
};

export const searchApi = {
  async global(query: string): Promise<CommandPaletteItem[]> {
    try {
      const params = new URLSearchParams();
      params.set("q", query);
      const response = await apiClient.request<SearchResult[] | GroupedSearchResponse>(
        `/search/global?${params.toString()}`
      );
      const normalized = toSearchResults(response);

      return normalized.map((item) => {
        const mapped: CommandPaletteItem = {
          id: item.id,
          scope: mapScope(item.type),
          title: item.title,
          href: item.href ?? fallbackHref(item)
        };
        if (item.subtitle) mapped.subtitle = item.subtitle;
        return mapped;
      });
    } catch {
      // Graceful fallback when backend search endpoint is not available yet.
      const [orders, conversations] = await Promise.all([
        ordersApi.getMarketplace({ limit: 6, page: 1 }),
        conversationsApi.getMyConversations()
      ]);
      const q = query.trim().toLowerCase();
      const orderItems: CommandPaletteItem[] = orders.items
        .filter((item) => item.title.toLowerCase().includes(q))
        .slice(0, 6)
        .map((item) => {
          const mapped: CommandPaletteItem = {
            id: item.id,
            scope: "orders",
            title: item.title,
            href: `/dashboard/orders/${item.id}`
          };
          mapped.subtitle = `${item.budget_min} - ${item.budget_max}`;
          return mapped;
        });

      const chatItems: CommandPaletteItem[] = conversations
        .filter((item) => (item.other_user?.display_name ?? "").toLowerCase().includes(q))
        .slice(0, 6)
        .map((item) => {
          const mapped: CommandPaletteItem = {
            id: item.id,
            scope: "chats",
            title: item.other_user?.display_name ?? "Диалог",
            href: `/dashboard/messages/${item.id}`
          };
          if (item.last_message?.content) mapped.subtitle = item.last_message.content;
          return mapped;
        });

      return [...orderItems, ...chatItems];
    }
  }
};
