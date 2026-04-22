import { apiClient } from "../client";
import { env } from "@/shared/config/env";

export interface Profile {
  id: string;
  name: string;
  phone: string;
  role: string;
  avatar_url?: string;
  bio?: string;
  hourly_rate?: number;
  skills?: string[];
  created_at: string;
}

export interface UpdateProfileInput {
  name?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  photo_id?: string;
  hourly_rate?: number;
  skills?: string[];
  experience_level?: string;
  location?: string;
  phone?: string;
  telegram?: string;
  website?: string;
  company_name?: string;
  inn?: string;
  onboarding_completed_at?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  link?: string;
  created_at: string;
}

export interface CreatePortfolioInput {
  title: string;
  description: string;
  image_url?: string;
  link?: string;
}

type BackendCreatePortfolioInput = {
  title: string;
  description: string;
  cover_media_id?: string;
  external_link?: string;
  media_ids?: string[];
};

export interface Review {
  id: string;
  reviewer_id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

type BackendProfile = {
  id?: string;
  user_id?: string;
  name?: string;
  display_name?: string;
  username?: string;
  role?: string;
  avatar_url?: string;
  photo_url?: string;
  photo_id?: string;
  bio?: string | null;
  hourly_rate?: number | null;
  skills?: string[] | null;
  phone?: string | null;
  created_at?: string;
  updated_at?: string;
};

type BackendPortfolioItem = {
  id: string;
  title?: string;
  description?: string | null;
  image_url?: string | null;
  external_link?: string | null;
  link?: string | null;
  created_at?: string;
};

type BackendReviewsPayload =
  | Review[]
  | {
    reviews?: Array<{
      id?: string;
      reviewer_id?: string;
      reviewer_name?: string;
      rating?: number;
      comment?: string | null;
      created_at?: string;
    }>;
  };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toProfile = (raw: BackendProfile): Profile => {
  const id = raw.id ?? raw.user_id ?? "";
  const createdAt = raw.created_at ?? raw.updated_at ?? new Date().toISOString();
  const mapped: Profile = {
    id,
    name: raw.name ?? raw.display_name ?? raw.username ?? "Пользователь",
    phone: raw.phone ?? "",
    role: raw.role ?? "",
    skills: Array.isArray(raw.skills) ? raw.skills : [],
    created_at: createdAt,
  };
  const avatarURL = raw.avatar_url ?? raw.photo_url ?? undefined;
  if (avatarURL) mapped.avatar_url = avatarURL;
  if (typeof raw.bio === "string") mapped.bio = raw.bio;
  if (typeof raw.hourly_rate === "number") mapped.hourly_rate = raw.hourly_rate;
  return mapped;
};

const toPortfolioItem = (raw: BackendPortfolioItem): PortfolioItem => {
  const mapped: PortfolioItem = {
    id: raw.id,
    title: raw.title ?? "",
    description: raw.description ?? "",
    created_at: raw.created_at ?? new Date().toISOString(),
  };
  if (raw.image_url) mapped.image_url = raw.image_url;
  const link = raw.link ?? raw.external_link ?? undefined;
  if (link) mapped.link = link;
  return mapped;
};

export const profileApi = {
  async get(): Promise<Profile> {
    const raw = await apiClient.request<BackendProfile>("/profile");
    return toProfile(raw);
  },

  async getPublicProfile(userId: string): Promise<Profile> {
    const raw = await apiClient.request<BackendProfile>(`/users/${userId}/profile`);
    return toProfile(raw);
  },

  async update(input: UpdateProfileInput): Promise<Profile> {
    const payload: Record<string, unknown> = {};
    if (typeof input.display_name === "string") payload.display_name = input.display_name.trim();
    if (typeof input.name === "string" && input.name.trim()) payload.display_name = input.name.trim();
    if (typeof input.bio === "string") payload.bio = input.bio;
    if (typeof input.hourly_rate === "number") payload.hourly_rate = input.hourly_rate;
    if (Array.isArray(input.skills)) payload.skills = input.skills;
    if (typeof input.experience_level === "string") payload.experience_level = input.experience_level;
    if (typeof input.location === "string") payload.location = input.location;
    if (typeof input.phone === "string") payload.phone = input.phone;
    if (typeof input.telegram === "string") payload.telegram = input.telegram;
    if (typeof input.website === "string") payload.website = input.website;
    if (typeof input.company_name === "string") payload.company_name = input.company_name;
    if (typeof input.inn === "string") payload.inn = input.inn;
    if (typeof input.onboarding_completed_at === "string" && input.onboarding_completed_at.trim()) {
      const completedAt = new Date(input.onboarding_completed_at);
      if (!Number.isNaN(completedAt.getTime())) {
        payload.onboarding_completed_at = completedAt.toISOString();
      }
    }
    if (typeof input.photo_id === "string" && UUID_RE.test(input.photo_id)) payload.photo_id = input.photo_id;
    if (!("photo_id" in payload) && typeof input.avatar_url === "string" && UUID_RE.test(input.avatar_url)) {
      payload.photo_id = input.avatar_url;
    }

    const raw = await apiClient.request<BackendProfile>("/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return toProfile(raw);
  },

  async getPortfolio(): Promise<PortfolioItem[]> {
    const raw = await apiClient.request<BackendPortfolioItem[]>("/portfolio");
    return raw.map(toPortfolioItem);
  },

  async getPublicPortfolio(userId: string): Promise<PortfolioItem[]> {
    const raw = await apiClient.request<BackendPortfolioItem[]>(`/users/${userId}/portfolio`);
    return raw.map(toPortfolioItem);
  },

  async addPortfolioItem(input: CreatePortfolioInput): Promise<PortfolioItem> {
    const payload: BackendCreatePortfolioInput = {
      title: input.title,
      description: input.description,
    };
    if (input.image_url && UUID_RE.test(input.image_url)) payload.cover_media_id = input.image_url;
    if (input.link) payload.external_link = input.link;

    const raw = await apiClient.request<BackendPortfolioItem>("/portfolio", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return toPortfolioItem(raw);
  },

  async getReviews(userId?: string): Promise<Review[]> {
    if (!userId) return [];
    const payload = await apiClient.request<BackendReviewsPayload>(`/users/${userId}/reviews`);
    const rawItems = Array.isArray(payload) ? payload : payload.reviews ?? [];

    return rawItems.map((item) => ({
      id: item.id ?? "",
      reviewer_id: item.reviewer_id ?? "",
      reviewer_name: item.reviewer_name ?? "Пользователь",
      rating: typeof item.rating === "number" ? item.rating : 0,
      comment: item.comment ?? "",
      created_at: item.created_at ?? new Date().toISOString(),
    }));
  },
};
