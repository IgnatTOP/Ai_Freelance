"use client";

import { useState, useEffect } from "react";
import { Avatar, Chip, Button, Tabs, Tab } from "@heroui/react";
import { Briefcase, MessageSquare, Rss, FolderOpen, ShoppingBag, Star, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { profileApi, type Profile, type PortfolioItem, type Review } from "@/shared/api/endpoints/profile";
import { conversationsApi } from "@/shared/api/endpoints/conversations";
import { ProfileFeedTab } from "./profile/ProfileFeedTab";
import { ProfilePortfolioTab } from "./profile/ProfilePortfolioTab";
import { ProfileServicesTab } from "./profile/ProfileServicesTab";
import { ProfileReviewsTab } from "./profile/ProfileReviewsTab";
import { ProfileAboutTab } from "./profile/ProfileAboutTab";

type Props = { userId: string };

export const PublicProfilePage = ({ userId }: Props) => {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreatingChat, setIsCreatingChat] = useState(false);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                // Use the profile API to fetch public profile by user ID
                const [profileData, portfolioData, reviewsData] = await Promise.all([
                    profileApi.getPublicProfile(userId),
                    profileApi.getPublicPortfolio(userId).catch(() => [] as PortfolioItem[]),
                    profileApi.getReviews(userId).catch(() => [] as Review[]),
                ]);
                setProfile(profileData);
                setPortfolio(portfolioData);
                setReviews(reviewsData);
            } catch {
                // User not found or error
            } finally {
                setIsLoading(false);
            }
        };
        void load();
    }, [userId]);

    const handleStartChat = async () => {
        setIsCreatingChat(true);
        try {
            const conversation = await conversationsApi.findOrCreate(userId);
            router.push(`/dashboard/messages/${conversation.id}` as never);
        } catch {
            // error
        } finally {
            setIsCreatingChat(false);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="glass-card rounded-2xl p-8 h-48" />
                <div className="glass-card rounded-2xl p-8 h-40" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <User size={48} className="text-zinc-600 mb-4" />
                <h2 className="text-xl font-bold text-zinc-300 mb-2">Пользователь не найден</h2>
                <p className="text-sm text-zinc-500">Профиль не существует или был удалён</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Hero Banner */}
            <div className="relative glass-card rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/30 via-teal-900/20 to-zinc-900/10" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(168,85,247,0.15),transparent_60%)]" />
                <div className="relative p-6 md:p-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="absolute -inset-1 bg-gradient-to-br from-emerald-500/40 to-teal-500/40 rounded-full blur-sm" />
                            <Avatar
                                {...(profile.avatar_url ? { src: profile.avatar_url } : {})}
                                showFallback
                                className="w-24 h-24 relative"
                                classNames={{
                                    base: "bg-zinc-800 border-2 border-emerald-500/30",
                                    icon: "text-emerald-400",
                                }}
                            />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                                {profile.name || "Пользователь"}
                            </h1>
                            <div className="flex flex-wrap items-center gap-3">
                                <Chip
                                    size="sm"
                                    variant="flat"
                                    startContent={<Briefcase size={12} />}
                                    classNames={{ base: "bg-emerald-500/10 border border-emerald-500/20", content: "text-emerald-300 text-xs font-medium" }}
                                >
                                    {profile.role === "client" ? "Заказчик" : "Фрилансер"}
                                </Chip>
                                {profile.role === "freelancer" && profile.hourly_rate && (
                                    <Chip
                                        size="sm"
                                        variant="flat"
                                        classNames={{ base: "bg-emerald-500/10 border border-emerald-500/20", content: "text-emerald-300 text-xs font-medium" }}
                                    >
                                        ₽{profile.hourly_rate.toLocaleString()}/час
                                    </Chip>
                                )}
                            </div>
                        </div>

                        {/* Action button */}
                        <Button
                            className="font-medium"
                            style={{ backgroundColor: "#00E5C8", color: "#0a0a0f" }}
                            startContent={<MessageSquare size={16} />}
                            isLoading={isCreatingChat}
                            onPress={handleStartChat}
                        >
                            Написать
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tabs (read-only) */}
            <Tabs
                aria-label="Разделы профиля"
                variant="underlined"
                classNames={{
                    tabList: "gap-4 w-full border-b border-white/[0.06] px-2",
                    cursor: "bg-emerald-500",
                    tab: "text-zinc-500 data-[selected=true]:text-emerald-400 data-[hover=true]:text-zinc-300 px-1 py-3",
                    tabContent: "group-data-[selected=true]:text-emerald-400",
                }}
            >
                <Tab key="feed" title={<div className="flex items-center gap-2"><Rss size={16} /><span>Лента</span></div>}>
                    <ProfileFeedTab userId={profile.id} />
                </Tab>
                <Tab key="portfolio" title={<div className="flex items-center gap-2"><FolderOpen size={16} /><span>Портфолио</span></div>}>
                    <ProfilePortfolioTab portfolio={portfolio} onStartEdit={() => { }} />
                </Tab>
                <Tab key="services" title={<div className="flex items-center gap-2"><ShoppingBag size={16} /><span>Услуги</span></div>}>
                    <ProfileServicesTab userId={profile.id} />
                </Tab>
                <Tab key="reviews" title={<div className="flex items-center gap-2"><Star size={16} /><span>Отзывы</span></div>}>
                    <ProfileReviewsTab reviews={reviews} />
                </Tab>
                <Tab key="about" title={<div className="flex items-center gap-2"><User size={16} /><span>О себе</span></div>}>
                    <ProfileAboutTab profile={profile} role={profile.role} isEditing={false} onStartEdit={() => { }} />
                </Tab>
            </Tabs>
        </div>
    );
};
