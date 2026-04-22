"use client";

import { useMemo, useRef, useState } from "react";
import { streamAI } from "@/shared/sse/stream";
import { wsManager } from "@/shared/ws/manager";

export const useAIAssistant = () => {
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const actions = useMemo(
    () => ({
      start: async (prompt: string): Promise<void> => {
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;

        setText("");
        setIsStreaming(true);

        await streamAI(
          "/ai/assistant/stream",
          { message: prompt },
          {
            onChunk: (chunk) => setText((prev) => prev + chunk),
            onDone: () => setIsStreaming(false),
            onError: () => setIsStreaming(false)
          },
          controller.signal
        );
      },
      stop: async (): Promise<void> => {
        controllerRef.current?.abort();
        setIsStreaming(false);
        await wsManager.sendCommand("ai.assistant.stop", {});
      }
    }),
    []
  );

  return { text, isStreaming, ...actions };
};
