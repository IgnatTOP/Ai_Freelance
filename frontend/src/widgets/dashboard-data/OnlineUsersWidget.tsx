"use client";

import { useOnlineCount } from "@/features/dashboard-stats";
import { Users } from "lucide-react";

export const OnlineUsersWidget = () => {
    const { data, isLoading } = useOnlineCount();
    const count = data?.count ?? 0;

    return (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 w-fit animate-fade-in-up">
            {/* Pulsing dot */}
            <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <Users size={14} className="text-emerald-400" />
            <span className="text-sm text-emerald-300 font-medium">
                {isLoading ? "—" : count.toLocaleString("ru-RU")} онлайн
            </span>
        </div>
    );
};
