import { useDashboardData } from "@/features/dashboard-stats";
import { useSessionStore } from "@/shared/store/session.store";
import { Sparkles, ArrowRight, RefreshCw, Search, Send } from "lucide-react";
import { Button, Link, Progress, Tooltip, Chip } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import NextLink from "next/link";

/* ── Animated "searching" shimmer cards ── */
const SearchingState = () => (
    <div className="space-y-4">
        {/* Animated icon header */}
        <div className="flex flex-col items-center py-4 gap-3">
            <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-300 animate-pulse">
                    <Search size={20} />
                </div>
                {/* Orbiting sparkles */}
                <Sparkles
                    size={14}
                    className="absolute -top-1 -right-1 text-emerald-300 animate-bounce"
                    style={{ animationDelay: "0ms", animationDuration: "1.4s" }}
                />
                <Sparkles
                    size={10}
                    className="absolute -bottom-1 -left-1 text-emerald-400 animate-bounce"
                    style={{ animationDelay: "400ms", animationDuration: "1.4s" }}
                />
            </div>
            <p className="text-sm text-zinc-400 animate-pulse">
                AI подбирает рекомендации…
            </p>
        </div>

        {/* Shimmer skeleton carousel */}
        <div className="flex overflow-hidden gap-4 pb-2">
            {Array.from({ length: 3 }).map((_, i) => (
                <div
                    key={i}
                    className="rounded-2xl bg-zinc-800/40 p-5 shimmer min-w-[280px] w-[280px] flex-shrink-0"
                    style={{ animationDelay: `${i * 120}ms` }}
                >
                    <div className="h-5 bg-zinc-700/60 rounded w-3/4 mb-4" />
                    <div className="space-y-2 mb-6">
                        <div className="h-3 bg-zinc-700/40 rounded w-full" />
                        <div className="h-3 bg-zinc-700/40 rounded w-5/6" />
                        <div className="h-3 bg-zinc-700/40 rounded w-1/3" />
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="h-8 bg-zinc-700/40 rounded-full w-24" />
                        <div className="h-4 bg-zinc-700/40 rounded w-12" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export const AIRecommendations = () => {
    const role = useSessionStore((s) => s.role);
    const { data, isLoading, isFetching } = useDashboardData();
    const queryClient = useQueryClient();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const recommendations = (data?.recommendations ?? []).slice(0, 6);

    const heading =
        role === "freelancer"
            ? "Рекомендованные заказы"
            : "Подходящие фрилансеры";

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await queryClient.invalidateQueries({
            queryKey: ["dashboard", "data"],
        });
        setIsRefreshing(false);
    };

    // Show searching animation while loading or refetching
    if (isLoading || (isFetching && recommendations.length === 0)) {
        return (
            <div className="glass-card rounded-2xl p-6 overflow-hidden">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Sparkles size={18} className="text-emerald-300" />
                    {heading}
                </h3>
                <SearchingState />
            </div>
        );
    }

    return (
        <div className="glass-card rounded-2xl p-6 overflow-hidden relative">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles size={18} className="text-emerald-300" />
                    {heading}
                </h3>
                <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    className="text-zinc-500 hover:text-emerald-300 bg-white/[0.02] border border-white/[0.05]"
                    onPress={handleRefresh}
                    isLoading={isRefreshing}
                    aria-label="Обновить рекомендации"
                >
                    <RefreshCw
                        size={16}
                        className={isRefreshing ? "animate-spin" : ""}
                    />
                </Button>
            </div>
            {recommendations.length === 0 ? (
                <div className="text-center py-8">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-300 mx-auto mb-4">
                        <Sparkles size={24} />
                    </div>
                    <p className="text-zinc-400">
                        Пока нет крутых совпадений — AI анализирует рынок
                    </p>
                </div>
            ) : (
                <div className="flex overflow-x-auto pb-6 -mx-2 px-2 gap-4 snap-x snap-mandatory hide-scrollbar">
                    {recommendations.map((rec, i) => (
                        <div
                            key={rec.id}
                            className="bg-black/20 backdrop-blur-md border border-white/[0.08] hover:border-emerald-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 animate-fade-in-up group min-w-[300px] w-[300px] flex-shrink-0 snap-start relative overflow-hidden shadow-lg"
                            style={{ animationDelay: `${i * 80}ms` }}
                        >
                            {/* Animated gradient top border layer */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/10 via-emerald-400/40 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="mb-4">
                                <div className="flex items-start justify-between mb-3 gap-2">
                                    <h4 className="text-base font-bold text-zinc-100 line-clamp-2 leading-snug">
                                        {rec.title}
                                    </h4>
                                </div>
                                <p className="text-sm text-zinc-400 line-clamp-3 leading-relaxed">
                                    {rec.description}
                                </p>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <Tooltip
                                        content={
                                            <div className="px-1 py-1 max-w-xs">
                                                <div className="text-sm font-bold mb-1">AI-Анализ совпадения</div>
                                                <div className="text-xs text-zinc-300">
                                                    Мы считаем этот {role === "freelancer" ? "заказ" : "профиль"} отличным вариантом на {rec.match}% на основе ваших навыков и истории.
                                                </div>
                                            </div>
                                        }
                                        classNames={{
                                            content: "bg-zinc-900 border border-emerald-500/20 shadow-xl",
                                        }}
                                        placement="top"
                                    >
                                        <div className="cursor-help flex items-center gap-2 group/match p-1 -m-1 rounded-lg hover:bg-white/[0.04] transition-colors">
                                            <Progress
                                                size="sm"
                                                value={rec.match}
                                                className="w-16"
                                                classNames={{
                                                    track: "bg-zinc-800 h-1.5",
                                                    indicator:
                                                        rec.match >= 80
                                                            ? "bg-gradient-to-r from-emerald-500 to-green-400"
                                                            : rec.match >= 50
                                                                ? "bg-gradient-to-r from-emerald-400 to-teal-400"
                                                                : "bg-gradient-to-r from-amber-500 to-orange-400",
                                                }}
                                            />
                                            <span className="text-xs font-bold text-zinc-300 group-hover/match:text-emerald-300 transition-colors tabular-nums flex items-center gap-1">
                                                <Sparkles size={11} className="text-emerald-300/70" />
                                                {rec.match}%
                                            </span>
                                        </div>
                                    </Tooltip>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        as={NextLink}
                                        href={`/dashboard/orders/${rec.id}#respond`}
                                        size="sm"
                                        className="bg-[var(--mint-400)] hover:bg-[var(--mint-300)] text-[#062219] font-semibold shadow-md flex-1"
                                        startContent={<Send size={14} />}
                                    >
                                        {role === "freelancer" ? "Откликнуться" : "Пригласить"}
                                    </Button>
                                    <Button
                                        as={NextLink}
                                        href={`/dashboard/orders/${rec.id}`}
                                        size="sm"
                                        isIconOnly
                                        variant="flat"
                                        className="bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300"
                                        aria-label="Подробнее"
                                    >
                                        <ArrowRight size={16} />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
