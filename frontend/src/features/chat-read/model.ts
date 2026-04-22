"use client";

import { apiClient } from "@/shared/api/client";
import { wsManager } from "@/shared/ws/manager";

export const markConversationRead = async (conversationId: string, messageId: string): Promise<void> => {
  await apiClient.request(`/conversations/${conversationId}/read`, {
    method: "POST",
    body: JSON.stringify({ message_id: messageId })
  });

  await wsManager.sendCommand("chat.message.read.upsert", {
    conversation_id: conversationId,
    message_id: messageId
  });
};
