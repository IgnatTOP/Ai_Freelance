import { apiClient } from "@/shared/api/client";

export type NotificationSettings = {
  browser: Record<string, boolean>;
  email: Record<string, boolean>;
  sms: Record<string, boolean>;
  quiet_hours_from?: string;
  quiet_hours_to?: string;
};

export type PrivacySettings = {
  profile_visible: boolean;
  show_online_status: boolean;
  direct_messages: "all" | "none";
};

export type AISettings = {
  allow_ai_read_chats: boolean;
  persist_ai_history: boolean;
  response_style: "formal" | "neutral" | "friendly";
};

export const settingsApi = {
  getNotifications(): Promise<NotificationSettings> {
    return apiClient.request<NotificationSettings>("/settings/notifications");
  },
  updateNotifications(payload: NotificationSettings): Promise<NotificationSettings> {
    return apiClient.request<NotificationSettings>("/settings/notifications", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  getPrivacy(): Promise<PrivacySettings> {
    return apiClient.request<PrivacySettings>("/settings/privacy");
  },
  updatePrivacy(payload: PrivacySettings): Promise<PrivacySettings> {
    return apiClient.request<PrivacySettings>("/settings/privacy", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  getAI(): Promise<AISettings> {
    return apiClient.request<AISettings>("/settings/ai");
  },
  updateAI(payload: AISettings): Promise<AISettings> {
    return apiClient.request<AISettings>("/settings/ai", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }
};
