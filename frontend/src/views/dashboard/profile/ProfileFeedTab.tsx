"use client";

import { Rss } from "lucide-react";

type Props = { userId: string | undefined };

export const ProfileFeedTab = ({ userId }: Props) => {
    // Feed/social functionality will be connected to backend when ready (P1 task 5.5)
    return (
        <div className="mt-4 rounded-xl border border-dashed border-[var(--line)] py-8 text-center">
            <Rss size={28} className="mx-auto mb-3 text-[var(--fg-3)]" />
            <p className="mb-1 text-sm text-[var(--fg-2)]">Лента пока пуста</p>
            <p className="text-xs text-[var(--fg-3)]">Публикации, новости и обновления появятся здесь</p>
        </div>
    );
};
