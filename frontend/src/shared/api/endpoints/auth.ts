import { apiClient, authTokenStorage } from "@/shared/api/client";

export type RegisterPhoneInput = {
  phone: string;
  password: string;
  role: "client" | "freelancer";
};

export type LoginPhoneInput = {
  phone: string;
  password: string;
};

export type VerifyPhoneInput = {
  phone: string;
  code: string;
};

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  role: "client" | "freelancer";
  is_active: boolean;
};

export type AuthPayload = {
  user: AuthUser;
  token_pair: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
};

export const authApi = {
  async registerPhone(input: RegisterPhoneInput): Promise<AuthPayload> {
    const data = await apiClient.request<AuthPayload>("/auth/register-phone", {
      method: "POST",
      body: JSON.stringify(input)
    });
    authTokenStorage.setPair(data.token_pair.access_token, data.token_pair.refresh_token);
    return data;
  },
  async loginPhone(input: LoginPhoneInput): Promise<AuthPayload> {
    const data = await apiClient.request<AuthPayload>("/auth/login-phone", {
      method: "POST",
      body: JSON.stringify(input)
    });
    authTokenStorage.setPair(data.token_pair.access_token, data.token_pair.refresh_token);
    return data;
  },
  async verifyPhone(input: VerifyPhoneInput): Promise<{ verified: boolean }> {
    return apiClient.request<{ verified: boolean }>("/auth/verify-phone", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  async resendCode(phone: string): Promise<void> {
    await apiClient.request("/auth/resend-code", {
      method: "POST",
      body: JSON.stringify({ phone })
    });
  }
};
