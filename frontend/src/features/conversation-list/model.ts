"use client";

import { useQuery } from "@tanstack/react-query";
import { conversationsApi } from "@/shared/api/endpoints/conversations";

export const useMyConversations = () =>
  useQuery({
    queryKey: ["conversations", "my"],
    queryFn: () => conversationsApi.getMyConversations(),
  });

export const useConversationMessages = (conversationId: string, page?: number) =>
  useQuery({
    queryKey: ["conversations", conversationId, "messages", page],
    queryFn: () => conversationsApi.getMessages(conversationId, page),
    enabled: !!conversationId,
  });
