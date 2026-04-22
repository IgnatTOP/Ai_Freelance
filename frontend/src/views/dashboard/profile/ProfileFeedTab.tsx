"use client";

import { Rss } from "lucide-react";

type Props = { userId: string | undefined };

export const ProfileFeedTab = ({ userId }: Props) => {
    // Feed/social functionality will be connected to backend when ready (P1 task 5.5)
    return (
        <div className="py-8 text-center border border-dashed border-zinc-800 rounded-xl mt-4">
            <Rss size={28} className="mx-auto mb-3 text-zinc-600" />
            <p className="text-sm text-zinc-500 mb-1">Лента пока пуста</p>
            <p className="text-xs text-zinc-600">Публикации, новости и обновления появятся здесь</p>
        </div>
    );
};
