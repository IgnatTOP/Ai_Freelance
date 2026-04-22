import { env } from "@/shared/config/env";
import { authTokenStorage } from "@/shared/api/client";

export type StreamCallbacks = {
  onChunk: (text: string) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
};

export const streamAI = async (
  path: string,
  payload: unknown,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> => {
  try {
    const token = authTokenStorage.get();
    const headers = new Headers({ "Content-Type": "application/json" });
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const response = await fetch(`${env.SSE_URL}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: signal ?? null
    });

    if (!response.ok || !response.body) {
      callbacks.onError?.(new Error("Unable to open stream"));
      return;
    }

    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = "";
    let done = false;

    while (!done) {
      const result = await reader.read();
      done = result.done;

      if (!result.value) continue;

      buffer += decoder.decode(result.value, { stream: !done });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const rawEvent of events) {
        const lines = rawEvent.split("\n");
        let eventType = "message";
        const dataLines: string[] = [];

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.slice(6).trim();
            continue;
          }
          if (line.startsWith("data:")) {
            const rawData = line.slice(5);
            // SSE допускает ровно один пробел после "data:", его снимаем и сохраняем остальное.
            dataLines.push(rawData.startsWith(" ") ? rawData.slice(1) : rawData);
            continue;
          }
          // Для устойчивости к неидеальному SSE (многострочные чанки без повторного "data:").
          if (line && !line.startsWith("id:") && !line.startsWith("retry:")) {
            dataLines.push(line);
          }
        }

        const data = dataLines.join("\n");
        if (!data) continue;
        if (eventType === "error") {
          callbacks.onError?.(new Error(data));
          continue;
        }
        callbacks.onChunk(data);
      }
    }

    callbacks.onDone?.();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      callbacks.onDone?.();
      return;
    }
    callbacks.onError?.(error instanceof Error ? error : new Error("Unable to open stream"));
  }
};
