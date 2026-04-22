"use client";

import { debounce } from "@/shared/lib/debounce";
import { wsManager } from "@/shared/ws/manager";

export const createTypingPublisher = (conversationId: string) => {
  const publish = debounce((isTyping: boolean) => {
    void wsManager.sendCommand("chat.typing.set", {
      conversation_id: conversationId,
      is_typing: isTyping
    });
  }, 300);

  return {
    setTyping: publish
  };
};
