"use client";

import { useMutation } from "@tanstack/react-query";
import { conversationsApi, type SendMessageInput } from "@/shared/api/endpoints/conversations";
import { queryClient } from "@/shared/store/query-client";

export const useSendMessage = (conversationId: string) => {
  return useMutation({
    mutationFn: (payload: SendMessageInput) => conversationsApi.sendMessage(conversationId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["conversations", conversationId, "messages"] });
      await queryClient.invalidateQueries({ queryKey: ["conversations", "my"] });
    }
  });
};
