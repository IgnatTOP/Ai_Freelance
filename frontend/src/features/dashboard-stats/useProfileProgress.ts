"use client";

import { useProfile, usePortfolio } from "@/features/profile-management";

interface ProfileProgressResult {
    percentage: number;
    completedSteps: string[];
    missingSteps: string[];
    isLoading: boolean;
}

const STEPS = [
    { key: "name", label: "Имя заполнено", check: (p: any) => !!p?.name },
    { key: "bio", label: "Описание профиля", check: (p: any) => !!p?.bio && p.bio.length > 10 },
    { key: "avatar", label: "Фото профиля", check: (p: any) => !!p?.avatar_url },
    { key: "skills", label: "Навыки указаны", check: (p: any) => !!p?.skills?.length },
    { key: "portfolio", label: "Портфолио (хотя бы 1 работа)", check: (_p: any, portfolio: any[]) => portfolio.length > 0 },
] as const;

export const useProfileProgress = (): ProfileProgressResult => {
    const { data: profile, isLoading: profileLoading } = useProfile();
    const { data: portfolio, isLoading: portfolioLoading } = usePortfolio();

    const isLoading = profileLoading || portfolioLoading;
    const items = portfolio ?? [];

    const completedSteps: string[] = [];
    const missingSteps: string[] = [];

    for (const step of STEPS) {
        if (step.check(profile, items)) {
            completedSteps.push(step.label);
        } else {
            missingSteps.push(step.label);
        }
    }

    const percentage = STEPS.length > 0 ? Math.round((completedSteps.length / STEPS.length) * 100) : 0;

    return { percentage, completedSteps, missingSteps, isLoading };
};
