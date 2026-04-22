"use client";

import { useState } from "react";
import { Input, Textarea, Button, Avatar, Chip, Progress, Tabs, Tab } from "@heroui/react";
import { Camera, Save, PenLine, Briefcase, Rss, FolderOpen, ShoppingBag, Star, User } from "lucide-react";
import { useSessionStore } from "@/shared/store/session.store";
import { useProfile, useUpdateProfile, usePortfolio, useUserReviews } from "@/features/profile-management";
import { ProfileAboutTab } from "./profile/ProfileAboutTab";
import { ProfilePortfolioTab } from "./profile/ProfilePortfolioTab";
import { ProfileReviewsTab } from "./profile/ProfileReviewsTab";
import { ProfileFeedTab } from "./profile/ProfileFeedTab";
import { ProfileServicesTab } from "./profile/ProfileServicesTab";

export const ProfilePage = () => {
    const role = useSessionStore((s) => s.role);
    const { data: profile, isLoading } = useProfile();
    const updateProfile = useUpdateProfile();
    const { data: portfolio } = usePortfolio();
    const { data: reviews } = useUserReviews(profile?.id);

    const [name, setName] = useState("");
    const [bio, setBio] = useState("");
    const [hourlyRate, setHourlyRate] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    const startEditing = () => {
        setName(profile?.name ?? "");
        setBio(profile?.bio ?? "");
        setHourlyRate(String(profile?.hourly_rate ?? ""));
        setIsEditing(true);
    };

    const handleSave = () => {
        const payload: Record<string, string | number> = {};
        if (name) payload.name = name;
        if (bio) payload.bio = bio;
        if (hourlyRate) payload.hourly_rate = Number(hourlyRate);
        updateProfile.mutate(payload);
        setIsEditing(false);
    };

    // Profile completion calc
    const completionItems = [
        { label: "Имя", done: !!profile?.name },
        { label: "О себе", done: !!profile?.bio },
        { label: "Аватар", done: !!profile?.avatar_url },
        ...(role === "freelancer" ? [
            { label: "Навыки", done: (profile?.skills?.length ?? 0) > 0 },
            { label: "Портфолио", done: (portfolio?.length ?? 0) > 0 },
            { label: "Ставка", done: !!profile?.hourly_rate },
        ] : []),
    ];
    const completionPercent = Math.round((completionItems.filter(i => i.done).length / completionItems.length) * 100);

    const inputClasses = {
        inputWrapper: "bg-zinc-900/50 border-zinc-700/50 hover:border-purple-500/40 group-data-[focus=true]:border-purple-500/60",
        label: "text-zinc-400",
        input: "text-zinc-200",
    };

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="glass-card rounded-2xl p-8 h-48" />
                <div className="glass-card rounded-2xl p-8 h-40" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Hero Banner */}
            <div className="relative glass-card rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-zinc-900/10" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(168,85,247,0.15),transparent_60%)]" />
                <div className="relative p-6 md:p-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        {/* Avatar */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-br from-purple-500/40 to-indigo-500/40 rounded-full blur-sm group-hover:blur-md transition-all" />
                            <Avatar
                                {...(profile?.avatar_url ? { src: profile.avatar_url } : {})}
                                showFallback
                                className="w-24 h-24 relative"
                                classNames={{
                                    base: "bg-zinc-800 border-2 border-purple-500/30",
                                    icon: "text-purple-400",
                                }}
                            />
                            <button
                                type="button"
                                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center border-2 border-[#0a0a0f] hover:bg-purple-500 transition-colors shadow-lg shadow-purple-500/30"
                            >
                                <Camera size={14} />
                            </button>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            {isEditing ? (
                                <div className="space-y-3">
                                    <Input
                                        label="Имя"
                                        value={name}
                                        onValueChange={setName}
                                        variant="bordered"
                                        classNames={inputClasses}
                                        className="max-w-sm"
                                    />
                                    <Textarea
                                        label="О себе"
                                        value={bio}
                                        onValueChange={setBio}
                                        variant="bordered"
                                        minRows={2}
                                        classNames={{ ...inputClasses, input: "text-zinc-200 min-h-[60px]" }}
                                        className="max-w-sm"
                                    />
                                    {role === "freelancer" && (
                                        <Input
                                            label="Ставка (₽/час)"
                                            type="number"
                                            value={hourlyRate}
                                            onValueChange={setHourlyRate}
                                            variant="bordered"
                                            classNames={inputClasses}
                                            className="max-w-[200px]"
                                        />
                                    )}
                                </div>
                            ) : (
                                <>
                                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                                        {profile?.name || "Имя не указано"}
                                    </h1>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <Chip
                                            size="sm"
                                            variant="flat"
                                            startContent={<Briefcase size={12} />}
                                            classNames={{ base: "bg-purple-500/10 border border-purple-500/20", content: "text-purple-300 text-xs font-medium" }}
                                        >
                                            {role === "client" ? "Заказчик" : "Фрилансер"}
                                        </Chip>
                                        {profile?.phone && (
                                            <span className="text-sm text-zinc-500">{profile.phone}</span>
                                        )}
                                        {role === "freelancer" && profile?.hourly_rate && (
                                            <Chip
                                                size="sm"
                                                variant="flat"
                                                classNames={{ base: "bg-emerald-500/10 border border-emerald-500/20", content: "text-emerald-300 text-xs font-medium" }}
                                            >
                                                ₽{profile.hourly_rate.toLocaleString()}/час
                                            </Chip>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="shrink-0">
                            {!isEditing ? (
                                <Button
                                    variant="flat"
                                    className="bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 font-medium"
                                    startContent={<PenLine size={16} />}
                                    onPress={startEditing}
                                >
                                    Редактировать
                                </Button>
                            ) : (
                                <div className="flex gap-2">
                                    <Button variant="light" className="text-zinc-400" onPress={() => setIsEditing(false)}>
                                        Отмена
                                    </Button>
                                    <Button
                                        className="bg-purple-600 hover:bg-purple-500 text-white font-medium"
                                        onPress={handleSave}
                                        isLoading={updateProfile.isPending}
                                        startContent={<Save size={14} />}
                                    >
                                        Сохранить
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Profile Completion Bar */}
                    {completionPercent < 100 && (
                        <div className="mt-4 pt-4 border-t border-white/[0.06]">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                                <span className="text-zinc-500">Заполненность профиля</span>
                                <span className={`font-bold ${completionPercent === 100 ? "text-emerald-400" : "text-purple-400"}`}>
                                    {completionPercent}%
                                </span>
                            </div>
                            <Progress
                                value={completionPercent}
                                size="sm"
                                classNames={{
                                    track: "bg-zinc-800",
                                    indicator: "bg-gradient-to-r from-purple-600 to-indigo-500",
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <Tabs
                aria-label="Разделы профиля"
                variant="underlined"
                classNames={{
                    tabList: "gap-4 w-full border-b border-white/[0.06] px-2",
                    cursor: "bg-purple-500",
                    tab: "text-zinc-500 data-[selected=true]:text-purple-400 data-[hover=true]:text-zinc-300 px-1 py-3",
                    tabContent: "group-data-[selected=true]:text-purple-400",
                }}
            >
                <Tab
                    key="feed"
                    title={
                        <div className="flex items-center gap-2">
                            <Rss size={16} />
                            <span>Лента</span>
                        </div>
                    }
                >
                    <ProfileFeedTab userId={profile?.id} />
                </Tab>
                <Tab
                    key="portfolio"
                    title={
                        <div className="flex items-center gap-2">
                            <FolderOpen size={16} />
                            <span>Портфолио</span>
                        </div>
                    }
                >
                    <ProfilePortfolioTab portfolio={portfolio ?? []} onStartEdit={startEditing} />
                </Tab>
                <Tab
                    key="services"
                    title={
                        <div className="flex items-center gap-2">
                            <ShoppingBag size={16} />
                            <span>Услуги</span>
                        </div>
                    }
                >
                    <ProfileServicesTab userId={profile?.id} />
                </Tab>
                <Tab
                    key="reviews"
                    title={
                        <div className="flex items-center gap-2">
                            <Star size={16} />
                            <span>Отзывы</span>
                        </div>
                    }
                >
                    <ProfileReviewsTab reviews={reviews ?? []} />
                </Tab>
                <Tab
                    key="about"
                    title={
                        <div className="flex items-center gap-2">
                            <User size={16} />
                            <span>О себе</span>
                        </div>
                    }
                >
                    <ProfileAboutTab
                        profile={profile ?? null}
                        role={role}
                        isEditing={isEditing}
                        onStartEdit={startEditing}
                    />
                </Tab>
            </Tabs>
        </div>
    );
};
