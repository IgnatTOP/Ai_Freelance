import { apiClient } from "../client";

export interface Category {
    id: string;
    name: string;
    slug: string;
    icon?: string;
    order_count?: number;
}

export interface Skill {
    id: string;
    name: string;
    category_id?: string;
}

export const catalogApi = {
    async listCategories(): Promise<Category[]> {
        const response = await apiClient.request<Category[] | { categories?: Category[] }>("/catalog/categories");
        if (Array.isArray(response)) return response;
        return response.categories ?? [];
    },

    async listPopularCategories(): Promise<Category[]> {
        const response = await apiClient.request<Category[] | { categories?: Category[] }>("/catalog/categories/popular");
        if (Array.isArray(response)) return response;
        return response.categories ?? [];
    },

    async listSkills(): Promise<Skill[]> {
        const response = await apiClient.request<Skill[] | { skills?: Skill[] }>("/catalog/skills");
        if (Array.isArray(response)) return response;
        return response.skills ?? [];
    },
};
