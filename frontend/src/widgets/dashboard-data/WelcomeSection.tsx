import { useProfile } from "@/features/profile-management";
import { useProfileProgress, useOnlineCount, useDashboardStats } from "@/features/dashboard-stats";
import { useMyConversations } from "@/features/conversation-list/model";
import { useSessionStore } from "@/shared/store/session.store";
import { Progress, Button, Link, Skeleton } from "@heroui/react";
import { Sparkles, ArrowRight, Sun, Moon, CloudSun, Users } from "lucide-react";
import { useMemo } from "react";

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return { text: "Доброй ночи", icon: <Moon size={20} /> };
    if (hour < 12) return { text: "Доброе утро", icon: <Sun size={20} /> };
    if (hour < 18) return { text: "Добрый день", icon: <CloudSun size={20} /> };
    return { text: "Добрый вечер", icon: <Moon size={20} /> };
};

export const WelcomeSection = () => {
    const { data: profile, isLoading } = useProfile();
    const { percentage, missingSteps } = useProfileProgress();
    const role = useSessionStore((s) => s.role);
    const { data: onlineData, isLoading: onlineLoading } = useOnlineCount();
    const onlineCount = onlineData?.count ?? 0;

    // Dynamic Stats & Messages for AI insight
    const { data: statsData, isLoading: statsLoading } = useDashboardStats();
    const { data: conversations, isLoading: convsLoading } = useMyConversations();

    const aiInsight = useMemo(() => {
        if (statsLoading || convsLoading) return null;
        if (percentage < 60) {
            return { text: "Заполните профиль для получения персональных рекомендаций", href: "/dashboard/profile" };
        }

        const unreadMsgCount = conversations?.reduce((sum, c) => sum + (c.unread_count || 0), 0) || 0;

        if (role === "client") {
            const proposals = parseInt(statsData?.stats?.find(s => s.label === "Получено откликов")?.value || "0", 10);
            const msgFragment = unreadMsgCount > 0 ? `${unreadMsgCount} новых сообщений` : "";
            const propFragment = proposals > 0 ? `${proposals} новых откликов` : "";

            if (msgFragment && propFragment) {
                return { text: `Вас ждут ${msgFragment} и ${propFragment}`, href: "/dashboard/orders" };
            }
            if (msgFragment) return { text: `У вас ${msgFragment} от исполнителей`, href: "/dashboard/messages" };
            if (propFragment) return { text: `Отличные новости! Вы получили ${propFragment}`, href: "/dashboard/orders" };

            return { text: "Создайте первый заказ и соберите команду", href: "/dashboard/orders/new" };
        } else {
            // Freelancer
            const msgFragment = unreadMsgCount > 0 ? `${unreadMsgCount} новых сообщений` : "";
            const offers = parseInt(statsData?.stats?.find(s => s.label === "Доступные заказы")?.value || "0", 10);

            if (msgFragment && offers > 0) {
                return { text: `У вас ${msgFragment} и ${offers} подходящих заказов`, href: "/dashboard/orders" };
            }
            if (msgFragment) return { text: `У вас ${msgFragment} от заказчиков`, href: "/dashboard/messages" };
            if (offers > 0) return { text: `Найдено ${offers} новых заказов для вас`, href: "/dashboard/orders" };

            return { text: "Посмотрите новые заказы на маркетплейсе", href: "/dashboard/orders" };
        }
    }, [conversations, statsData, percentage, role, statsLoading, convsLoading]);

    const greeting = getGreeting();
    const displayName = profile?.name || "пользователь";
    const today = new Date().toLocaleDateString("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long",
    });

    return (
        <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up" style={{ borderLeft: "3px solid rgba(139,92,246,0.4)" }}>
            <div className="p-6 md:p-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    {/* Left: Greeting */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-2 text-zinc-500 text-sm">
                                <span className="text-yellow-400">{greeting.icon}</span>
                                <span className="capitalize">{today}</span>
                            </div>
                            {/* Online badge inline */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                </span>
                                <Users size={12} className="text-emerald-400" />
                                <span className="text-xs text-emerald-300 font-medium">
                                    {onlineLoading ? "—" : onlineCount.toLocaleString("ru-RU")} онлайн
                                </span>
                            </div>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 mb-2">
                            {isLoading ? (
                                <Skeleton className="h-8 w-48 rounded-lg" classNames={{ base: "bg-zinc-800", content: "bg-zinc-700" }} />
                            ) : (
                                <>
                                    {greeting.text},{" "}
                                    <span className="gradient-text">{displayName}</span>!
                                </>
                            )}
                        </h1>
                        <div className="flex items-center gap-2 mt-3">
                            {statsLoading || convsLoading ? (
                                <Skeleton className="h-5 w-64 rounded-lg" classNames={{ base: "bg-zinc-800", content: "bg-zinc-700" }} />
                            ) : aiInsight ? (
                                <>
                                    <Sparkles size={14} className="text-purple-400 shrink-0" />
                                    <Button
                                        as={Link}
                                        href={aiInsight.href}
                                        variant="light"
                                        size="sm"
                                        className="text-purple-400 hover:text-purple-300 p-0 h-auto min-w-0 text-sm font-medium"
                                        endContent={<ArrowRight size={14} />}
                                    >
                                        {aiInsight.text}
                                    </Button>
                                </>
                            ) : null}
                        </div>
                    </div>

                    {/* Right: Profile progress */}
                    <div className="lg:w-72 shrink-0">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-zinc-400">Прогресс профиля</span>
                            <span className="text-sm font-semibold text-purple-400">{percentage}%</span>
                        </div>
                        <Progress
                            size="sm"
                            value={percentage}
                            classNames={{
                                track: "bg-zinc-800",
                                indicator: percentage === 100
                                    ? "bg-gradient-to-r from-emerald-500 to-green-400"
                                    : "bg-gradient-to-r from-purple-600 to-indigo-500",
                            }}
                        />
                        {missingSteps.length > 0 && (
                            <p className="text-xs text-zinc-600 mt-2 truncate">
                                Осталось: {missingSteps[0]}
                                {missingSteps.length > 1 && ` и ещё ${missingSteps.length - 1}`}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
