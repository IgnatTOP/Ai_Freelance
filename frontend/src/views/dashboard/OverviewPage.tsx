"use client";

import {
    OverviewStats,
    RecentActivity,
    QuickActions,
    AIRecommendations,
    WelcomeSection,
    BalanceWidget,
    ActiveOrdersWidget,
    SmartChatFeedWidget,
} from "@/widgets/dashboard-data";
import { useSessionStore } from "@/shared/store/session.store";

export const OverviewPage = () => {
    const role = useSessionStore((s) => s.role);

    return (
        <div className="max-w-screen-xl mx-auto animate-fade-in-up w-full">
            <div className="space-y-6">
                {/* Welcome (includes online users widget) */}
                <WelcomeSection />

                {/* Stats */}
                <OverviewStats />

                {/* Quick Actions */}
                <QuickActions />

                {/* Main content grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left column (wider) */}
                    <div className="lg:col-span-2 space-y-6">
                        {role === "client" && <ActiveOrdersWidget />}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <SmartChatFeedWidget />
                            <RecentActivity />
                        </div>
                    </div>

                    {/* Right column (sidebar-like) */}
                    <div className="space-y-6">
                        <BalanceWidget />
                        <AIRecommendations />
                    </div>
                </div>
            </div>
        </div>
    );
};
