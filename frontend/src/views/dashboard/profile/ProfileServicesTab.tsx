"use client";

import { ShoppingBag } from "lucide-react";

type Props = { userId: string | undefined };

export const ProfileServicesTab = ({ userId }: Props) => {
    // Services/marketplace functionality will be connected to backend when ready (P1 task 5.6)
    return (
        <div className="py-8 text-center border border-dashed border-zinc-800 rounded-xl mt-4">
            <ShoppingBag size={28} className="mx-auto mb-3 text-zinc-600" />
            <p className="text-sm text-zinc-500 mb-1">Услуги пока не добавлены</p>
            <p className="text-xs text-zinc-600">Здесь будут ваши платные услуги с ценами и описаниями</p>
        </div>
    );
};
