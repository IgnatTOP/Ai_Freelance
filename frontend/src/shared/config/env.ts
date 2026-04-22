const DEFAULT_BACKEND_PORT = "13500";

const buildRuntimeBackendBase = (): string | null => {
  if (typeof window === "undefined") return null;

  const { protocol, hostname } = window.location;
  if (!hostname) return null;

  return `${protocol}//${hostname}:${DEFAULT_BACKEND_PORT}`;
};

const resolvePublicUrl = (key: string, fallbackPath: string, ws = false): string => {
  const explicit = process.env[key]?.trim();
  if (explicit) return explicit;

  const runtimeBase = buildRuntimeBackendBase();
  if (runtimeBase) {
    if (ws) {
      const wsProtocol = runtimeBase.startsWith("https://") ? "wss://" : "ws://";
      return `${wsProtocol}${runtimeBase.replace(/^https?:\/\//, "")}${fallbackPath}`;
    }
    return `${runtimeBase}${fallbackPath}`;
  }

  const localhostBase = ws ? `ws://localhost:${DEFAULT_BACKEND_PORT}` : `http://localhost:${DEFAULT_BACKEND_PORT}`;
  return `${localhostBase}${fallbackPath}`;
};

export const env = {
  API_URL: resolvePublicUrl("NEXT_PUBLIC_API_URL", "/api"),
  WS_URL: resolvePublicUrl("NEXT_PUBLIC_WS_URL", "/api/ws", true),
  SSE_URL: resolvePublicUrl("NEXT_PUBLIC_SSE_URL", "/api"),
  ENABLE_DEV_AUTH_BYPASS: process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH_BYPASS === "true"
} as const;
