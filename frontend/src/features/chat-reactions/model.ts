"use client";

import { useMutation } from "@tanstack/react-query";
import { conversationsApi } from "@/shared/api/endpoints/conversations";
import { queryClient } from "@/shared/store/query-client";

export const useAddReaction = (conversationId: string) =>
  useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      conversationsApi.addReaction(conversationId, messageId, emoji),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["conversations", conversationId, "messages"] });
    }
  });

export const useRemoveReaction = (conversationId: string) =>
  useMutation({
    mutationFn: (messageId: string) => conversationsApi.removeReaction(conversationId, messageId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["conversations", conversationId, "messages"] });
    }
  });

