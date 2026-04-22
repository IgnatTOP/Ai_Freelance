import { env } from "@/shared/config/env";
import type { ApiFailure, ApiPaginated, ApiResponse } from "@/shared/types/contracts";

const ACCESS_TOKEN_KEY = "vb_access_token";
const REFRESH_TOKEN_KEY = "vb_refresh_token";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    if (typeof code === "string" && code.length > 0) {
      this.code = code;
    }
  }
}

export const authTokenStorage = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefresh(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  set(token: string): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },
  setRefresh(token: string): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },
  setPair(accessToken: string, refreshToken: string): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clear(): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

export class ApiClient {
  private refreshInFlight: Promise<string | null> | null = null;

  private buildHeaders(init?: RequestInit): Headers {
    const token = authTokenStorage.get();
    const headers = new Headers(init?.headers ?? {});
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  }

  private async fetchJson<T>(path: string, init?: RequestInit): Promise<{ response: Response; json: T }> {
    const headers = this.buildHeaders(init);

    const response = await fetch(`${env.API_URL}${path}`, {
      ...init,
      headers,
      cache: "no-store"
    });

    const rawBody = await response.text();
    let json = {} as T;
    if (rawBody.trim().length > 0) {
      try {
        json = JSON.parse(rawBody) as T;
      } catch {
        json = {} as T;
      }
    }
    return { response, json };
  }

  private isRefreshEligible(path: string, init?: RequestInit): boolean {
    if (path.startsWith("/auth/")) return false;
    const method = (init?.method ?? "GET").toUpperCase();
    return ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method);
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshInFlight) return this.refreshInFlight;

    this.refreshInFlight = (async () => {
      const refreshToken = authTokenStorage.getRefresh();
      if (!refreshToken) return null;

      try {
        const response = await fetch(`${env.API_URL}/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        const payload = (await response.json()) as ApiResponse<{
          token_pair?: { access_token?: string; refresh_token?: string };
        }> | ApiFailure;

        if (!response.ok || !("success" in payload) || !payload.success) {
          authTokenStorage.clear();
          return null;
        }

        const access = payload.data.token_pair?.access_token;
        const refresh = payload.data.token_pair?.refresh_token;
        if (!access || !refresh) {
          authTokenStorage.clear();
          return null;
        }

        authTokenStorage.setPair(access, refresh);
        return access;
      } catch {
        authTokenStorage.clear();
        return null;
      } finally {
        this.refreshInFlight = null;
      }
    })();

    return this.refreshInFlight;
  }

  private isApiEnvelope(value: unknown): value is ApiResponse<unknown> | ApiFailure {
    if (!value || typeof value !== "object") return false;
    return "success" in value && typeof (value as { success?: unknown }).success === "boolean";
  }

  private extractFailureDetails(json: unknown): { message: string; code?: string } {
    if (this.isApiEnvelope(json)) {
      const failure = json as ApiFailure;
      const details: { message: string; code?: string } = {
        message: failure.error?.message ?? "Request failed"
      };
      if (typeof failure.error?.code === "string") {
        details.code = failure.error.code;
      }
      return details;
    }

    if (json && typeof json === "object") {
      const record = json as Record<string, unknown>;
      const messageFromString = typeof record.error === "string" ? record.error : undefined;
      const messageFromNested =
        record.error && typeof record.error === "object"
          ? (record.error as { message?: unknown }).message
          : undefined;
      const codeFromNested =
        record.error && typeof record.error === "object"
          ? (record.error as { code?: unknown }).code
          : undefined;

      const message =
        messageFromString ??
        (typeof messageFromNested === "string" ? messageFromNested : undefined) ??
        (typeof record.message === "string" ? record.message : undefined) ??
        "Request failed";

      const details: { message: string; code?: string } = { message };
      if (typeof codeFromNested === "string") {
        details.code = codeFromNested;
      }
      return details;
    }

    return { message: "Request failed" };
  }

  private ensureSuccess<T>(response: Response, json: ApiResponse<T> | ApiFailure | T): T {
    if (!response.ok) {
      const failure = this.extractFailureDetails(json);
      throw new ApiError(
        failure.message,
        response.status,
        failure.code
      );
    }

    if (this.isApiEnvelope(json)) {
      const envelope = json as ApiResponse<T>;
      if (!envelope.success) {
        const failure = envelope as ApiFailure;
        throw new ApiError(
          failure.error?.message ?? "Request failed",
          response.status,
          failure.error?.code
        );
      }
      return envelope.data;
    }

    return json as T;
  }

  async request<T>(path: string, init?: RequestInit): Promise<T> {
    let result = await this.fetchJson<ApiResponse<T> | ApiFailure>(path, init);

    if (result.response.status === 401 && this.isRefreshEligible(path, init)) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        result = await this.fetchJson<ApiResponse<T> | ApiFailure>(path, init);
      }
    }

    return this.ensureSuccess<T>(result.response, result.json);
  }

  async requestPaginated<T>(path: string, init?: RequestInit): Promise<ApiPaginated<T>> {
    let result = await this.fetchJson<ApiPaginated<T> | ApiFailure>(path, init);

    if (result.response.status === 401 && this.isRefreshEligible(path, init)) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        result = await this.fetchJson<ApiPaginated<T> | ApiFailure>(path, init);
      }
    }

    if (!result.response.ok) {
      const failure = this.extractFailureDetails(result.json);
      throw new ApiError(failure.message, result.response.status, failure.code);
    }

    const raw = result.json as unknown;
    if (this.isApiEnvelope(raw)) {
      const envelope = raw as ApiPaginated<T> | ApiFailure;
      if ((envelope as ApiFailure).success === false) {
        const failure = envelope as ApiFailure;
        throw new ApiError(
          failure.error?.message ?? "Request failed",
          result.response.status,
          failure.error?.code
        );
      }

      const successEnvelope = envelope as ApiPaginated<T>;
      if ("pagination" in successEnvelope && Array.isArray(successEnvelope.data)) {
        return successEnvelope;
      }

      const fallbackData = Array.isArray(successEnvelope.data) ? successEnvelope.data : [];
      return {
        success: true,
        data: fallbackData as T[],
        pagination: {
          total: fallbackData.length,
          limit: fallbackData.length || 1,
          offset: 0,
          has_more: false
        }
      };
    }

    if (raw && typeof raw === "object") {
      const envelope = raw as { success?: unknown; data?: unknown; pagination?: ApiPaginated<T>["pagination"] };
      if (envelope.success === false) {
        const failure = this.extractFailureDetails(raw);
        throw new ApiError(
          failure.message,
          result.response.status,
          failure.code
        );
      }
      if (envelope.success === true && Array.isArray(envelope.data) && envelope.pagination) {
        return {
          success: true,
          data: envelope.data as T[],
          pagination: envelope.pagination
        };
      }
      if (Array.isArray(envelope.data) && envelope.pagination) {
        return {
          success: true,
          data: envelope.data as T[],
          pagination: envelope.pagination
        };
      }
    }

    if (!this.isApiEnvelope(raw) && raw && typeof raw === "object") {
      const unwrapped = raw as { data?: unknown; pagination?: ApiPaginated<T>["pagination"] };
      if (Array.isArray(unwrapped.data) && unwrapped.pagination) {
        return {
          success: true,
          data: unwrapped.data as T[],
          pagination: unwrapped.pagination
        };
      }
    }

    if (Array.isArray(raw)) {
      return {
        success: true,
        data: raw as T[],
        pagination: {
          total: raw.length,
          limit: raw.length || 1,
          offset: 0,
          has_more: false
        }
      };
    }

    throw new ApiError("Invalid paginated response", result.response.status);
  }
}

export const apiClient = new ApiClient();
