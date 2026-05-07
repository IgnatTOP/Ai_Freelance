"use client";

import { ShoppingBag } from "lucide-react";

type Props = { userId: string | undefined };

export const ProfileServicesTab = ({ userId }: Props) => {
    // Services/marketplace functionality will be connected to backend when ready (P1 task 5.6)
    return (
        <div className="mt-4 rounded-xl border border-dashed border-[var(--line)] py-8 text-center">
            <ShoppingBag size={28} className="mx-auto mb-3 text-[var(--fg-3)]" />
            <p className="mb-1 text-sm text-[var(--fg-2)]">Услуги пока не добавлены</p>
            <p className="text-xs text-[var(--fg-3)]">Здесь будут ваши платные услуги с ценами и описаниями</p>
        </div>
    );
};
