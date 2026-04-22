"use client";

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/shared/api/endpoints/notifications";
import type { NotificationPage } from "@/shared/api/endpoints/notifications";

type InfiniteNotificationsCache = {
  pages: NotificationPage[];
  pageParams: unknown[];
};

const markReadInCache = (cache: InfiniteNotificationsCache | undefined, id: string): InfiniteNotificationsCache | undefined => {
  if (!cache) return cache;

  const pages = cache.pages.map((page) => ({
    ...page,
    items: page.items.map((item) => (item.id === id ? { ...item, read: true } : item)),
  }));
  const firstUnread = pages[0]?.items.filter((item) => !item.read).length ?? 0;
  if (pages[0]) pages[0] = { ...pages[0], unread_count: firstUnread };

  return { ...cache, pages };
};

const markAllReadInCache = (cache: InfiniteNotificationsCache | undefined): InfiniteNotificationsCache | undefined => {
  if (!cache) return cache;
  const pages = cache.pages.map((page, index) => ({
    ...page,
    unread_count: index === 0 ? 0 : page.unread_count,
    items: page.items.map((item) => ({ ...item, read: true })),
  }));
  return { ...cache, pages };
};

export const useNotifications = () =>
  useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.getAll(),
  });

export const useNotificationsInfinite = (limit = 20) =>
  useInfiniteQuery({
    queryKey: ["notifications", "infinite", limit],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => notificationsApi.getPage(limit, pageParam),
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.offset + lastPage.items.length : undefined,
  });

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previousInfinite = queryClient.getQueriesData<InfiniteNotificationsCache>({
        queryKey: ["notifications", "infinite"],
      });
      for (const [key, value] of previousInfinite) {
        queryClient.setQueryData(key, markReadInCache(value, id));
      }

      return { previousInfinite };
    },
    onError: (_error, _id, context) => {
      context?.previousInfinite.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useMarkAllRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previousInfinite = queryClient.getQueriesData<InfiniteNotificationsCache>({
        queryKey: ["notifications", "infinite"],
      });
      for (const [key, value] of previousInfinite) {
        queryClient.setQueryData(key, markAllReadInCache(value));
      }

      return { previousInfinite };
    },
    onError: (_error, _vars, context) => {
      context?.previousInfinite.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};
