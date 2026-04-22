"use client";

import { useCallback, useRef, useState } from "react";
import { streamAI } from "@/shared/sse/stream";

export const useAIProfileImprove = () => {
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const improve = useCallback(async (bio: string, skills: string[]) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setText("");
    setIsStreaming(true);

    await streamAI(
      "/ai/profile/improve/stream",
      { current_bio: bio, skills },
      {
        onChunk: (chunk) => setText((prev) => prev + chunk),
        onDone: () => setIsStreaming(false),
        onError: () => setIsStreaming(false),
      },
      controller.signal
    );
  }, []);

  const stop = useCallback(() => {
    controllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clear = useCallback(() => {
    controllerRef.current?.abort();
    setIsStreaming(false);
    setText("");
  }, []);

  return { text, isStreaming, improve, stop, clear };
};
