"use client";

import { useMemo, useState } from "react";
import { BriefcaseBusiness, Camera, Edit3, FolderOpen, MessageSquare, Rss, Save, ShoppingBag, Star, Trophy, User } from "lucide-react";
import { useSessionStore } from "@/shared/store/session.store";
import { usePortfolio, useProfile, useUpdateProfile, useUserReviews } from "@/features/profile-management";
import { FilkaButton, FilkaCard, FilkaChip, FilkaField, FilkaInput, FilkaTextarea } from "@/shared/ui/filka/FilkaPrimitives";

const initialsFromName = (value: string | undefined): string => {
    const text = value?.trim() || "Филка";
    const parts = text.split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "Ф";
};

const formatMoney = (value: number | null | undefined): string => {
    if (typeof value !== "number" || !Number.isFinite(value)) return "—";
    return `${value.toLocaleString("ru-RU")} ₽/час`;
};

export const ProfilePage = () => {
    const role = useSessionStore((s) => s.role);
    const { data: profile, isLoading } = useProfile();
    const { data: portfolio } = usePortfolio();
    const { data: reviews } = useUserReviews(profile?.id);
    const updateProfile = useUpdateProfile();

    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState("");
    const [bio, setBio] = useState("");
    const [hourlyRate, setHourlyRate] = useState("");

    const portfolioItems = portfolio ?? [];
    const reviewItems = reviews ?? [];
    const averageRating = reviewItems.length > 0
        ? (reviewItems.reduce((sum, review) => sum + review.rating, 0) / reviewItems.length).toFixed(1)
        : null;

    const completionItems = [
        { label: "Имя", done: Boolean(profile?.name) },
        { label: "О себе", done: Boolean(profile?.bio) },
        { label: "Фото", done: Boolean(profile?.avatar_url) },
        ...(role === "freelancer"
            ? [
                { label: "Навыки", done: (profile?.skills?.length ?? 0) > 0 },
                { label: "Портфолио", done: portfolioItems.length > 0 },
                { label: "Ставка", done: Boolean(profile?.hourly_rate) },
            ]
            : []),
    ];
    const completionPercent = Math.round((completionItems.filter((item) => item.done).length / completionItems.length) * 100);

    const topFacts = useMemo(
        () => [
            { label: role === "client" ? "Тип" : "Рейтинг", value: role === "client" ? "Заказчик" : averageRating ? `${averageRating} / 5` : "без отзывов" },
            { label: "Портфолио", value: `${portfolioItems.length}` },
            { label: "Отзывы", value: `${reviewItems.length}` },
        ],
        [averageRating, portfolioItems.length, reviewItems.length, role],
    );

    const startEditing = () => {
        setName(profile?.name ?? "");
        setBio(profile?.bio ?? "");
        setHourlyRate(profile?.hourly_rate ? String(profile.hourly_rate) : "");
        setIsEditing(true);
    };

    const handleSave = () => {
        const payload: Record<string, string | number | string[]> = {};
        if (name.trim()) payload.name = name.trim();
        if (typeof bio === "string") payload.bio = bio;
        if (hourlyRate.trim()) payload.hourly_rate = Number(hourlyRate);
        if (profile?.skills?.length) payload.skills = profile.skills;
        updateProfile.mutate(payload, {
            onSuccess: () => setIsEditing(false),
        });
    };

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-56 rounded-[18px] bg-[var(--bg-2)]" />
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="h-80 rounded-[16px] bg-[var(--bg-2)]" />
                    <div className="h-80 rounded-[16px] bg-[var(--bg-2)]" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-fade-in-up">
            <FilkaCard className="relative overflow-hidden rounded-[18px] bg-[var(--bg-1)]">
                <div
                    className="h-[150px]"
                    style={{
                        background:
                            "radial-gradient(ellipse 60% 100% at 20% 50%, rgba(102,58,243,0.25), transparent 70%)," +
                            "radial-gradient(ellipse 40% 100% at 80% 50%, rgba(186,215,247,0.15), transparent 70%)," +
                            "#0c1812",
                    }}
                />
                <div className="flex flex-col gap-6 px-7 pb-7 pt-0 lg:flex-row lg:items-end" style={{ marginTop: -46 }}>
                    <div className="relative">
                        {profile?.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt={profile.name || "Аватар"}
                                className="h-24 w-24 rounded-[22px] border-4 border-[var(--bg-1)] object-cover"
                            />
                        ) : (
                            <div className="grid h-24 w-24 place-items-center rounded-[22px] border-4 border-[var(--bg-1)] bg-[linear-gradient(135deg,#B6D9FC,#1a0e4a)] text-[28px] font-bold text-[#05060f]">
                                {initialsFromName(profile?.name)}
                            </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-[var(--bg-1)] bg-[var(--mint-400)] px-2 py-1 text-[10px] font-bold tracking-[0.08em] text-[#05060f]">
                            VERIFIED
                        </div>
                    </div>

                    <div className="min-w-0 flex-1 pb-1">
                        {isEditing ? (
                            <div className="grid gap-3 md:grid-cols-2">
                                <FilkaField label="Имя">
                                    <FilkaInput value={name} onChange={(event) => setName(event.target.value)} />
                                </FilkaField>
                                {role === "freelancer" ? (
                                    <FilkaField label="Ставка">
                                        <FilkaInput type="number" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} />
                                    </FilkaField>
                                ) : <div />}
                            </div>
                        ) : (
                            <>
                                <div className="mb-2 flex flex-wrap items-center gap-3">
                                    <h1 className="text-[28px] font-bold tracking-[-0.03em] text-[var(--fg-0)]">{profile?.name || "Пользователь"}</h1>
                                    <FilkaChip>{role === "client" ? "CLIENT" : "PRO · top 5%"}</FilkaChip>
                                </div>
                                <div className="mb-3 text-[15px] text-[var(--fg-1)]">
                                    {role === "client"
                                        ? "Заказчик · проекты, сделки и безопасная оплата"
                                        : "Веб-разработчик · Реакт / Некст · Тайпскрипт"}
                                </div>
                            </>
                        )}

                        <div className="flex flex-wrap gap-4 text-[13px] text-[var(--fg-2)]">
                            <span className="inline-flex items-center gap-1.5">
                                <Star size={14} className="text-[var(--accent-sun)]" />
                                {averageRating ? `${averageRating} · ${reviewItems.length} отзывов` : "Отзывов пока нет"}
                            </span>
                            <span>·</span>
                            <span>{profile?.phone || "Телефон не указан"}</span>
                            {role === "freelancer" && profile?.hourly_rate ? (
                                <>
                                    <span>·</span>
                                    <span>{formatMoney(profile.hourly_rate)}</span>
                                </>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {!isEditing ? (
                            <FilkaButton variant="ghost" size="sm" startContent={<Edit3 size={14} />} onClick={startEditing}>
                                Редактировать
                            </FilkaButton>
                        ) : (
                            <>
                                <FilkaButton variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                                    Отмена
                                </FilkaButton>
                                <FilkaButton size="sm" loading={updateProfile.isPending} startContent={<Save size={14} />} onClick={handleSave}>
                                    Сохранить
                                </FilkaButton>
                            </>
                        )}
                    </div>
                </div>
            </FilkaCard>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-5">
                    <FilkaCard className="rounded-[16px] bg-[var(--bg-1)] p-5">
                        <div className="t-eyebrow mb-3">О СЕБЕ</div>
                        {isEditing ? (
                            <FilkaField>
                                <FilkaTextarea rows={5} value={bio} onChange={(event) => setBio(event.target.value)} />
                            </FilkaField>
                        ) : (
                            <p className="text-[14px] leading-[1.65] text-[var(--fg-1)]">
                                {profile?.bio || "Добавьте краткое описание: чем вы занимаетесь, в каких проектах сильны и как предпочитаете работать."}
                            </p>
                        )}
                    </FilkaCard>

                    <FilkaCard className="rounded-[16px] bg-[var(--bg-1)] p-5">
                        <div className="mb-4 flex items-center gap-3">
                            <FolderOpen size={16} className="text-[var(--mint-300)]" />
                            <div className="t-eyebrow">ПОРТФОЛИО · {portfolioItems.length}</div>
                        </div>

                        {portfolioItems.length > 0 ? (
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {portfolioItems.map((item, index) => (
                                    <div key={item.id} className="overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--bg-2)]">
                                        <div
                                            className="relative h-[120px]"
                                            style={{
                                                background: [
                                                    "linear-gradient(135deg,#B6D9FC,#4F2BC7)",
                                                    "linear-gradient(135deg,#663AF3,#064E3B)",
                                                    "linear-gradient(135deg,#7DD3FC,#0284C7)",
                                                    "linear-gradient(135deg,#FFB38A,#F5E27A)",
                                                ][index % 4],
                                            }}
                                        >
                                            <div className="absolute right-3 top-3 text-[10px] font-bold text-[rgba(6,34,25,0.7)]">
                                                {String(index + 1).padStart(2, "0")}
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <div className="line-clamp-1 text-[13px] font-semibold text-[var(--fg-0)]">{item.title}</div>
                                            <div className="mt-1 line-clamp-2 text-[12px] leading-[1.45] text-[var(--fg-2)]">{item.description}</div>
                                            {item.link ? (
                                                <a href={item.link} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-[12px] font-medium text-[var(--mint-300)]">
                                                    Открыть проект
                                                </a>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-[12px] border border-dashed border-[var(--line)] bg-[var(--bg-2)] px-5 py-10 text-center">
                                <FolderOpen size={28} className="mx-auto mb-3 text-[var(--fg-3)]" />
                                <div className="text-[15px] font-semibold text-[var(--fg-0)]">Портфолио пока пусто</div>
                                <div className="mt-2 text-[13px] text-[var(--fg-2)]">Добавьте примеры работ, чтобы заказчики быстрее понимали ваш уровень.</div>
                            </div>
                        )}
                    </FilkaCard>

                    <FilkaCard className="rounded-[16px] bg-[var(--bg-1)] p-5">
                        <div className="mb-4 flex items-center gap-3">
                            <Trophy size={16} className="text-[var(--accent-sun)]" />
                            <div className="t-eyebrow">ОТЗЫВЫ · {reviewItems.length}</div>
                        </div>

                        {reviewItems.length > 0 ? (
                            <div className="space-y-4">
                                {reviewItems.map((review) => (
                                    <div key={review.id} className="rounded-[12px] border border-[var(--line)] bg-[var(--bg-2)] p-4">
                                        <div className="mb-2 flex items-center gap-3">
                                            <div className="grid h-9 w-9 place-items-center rounded-[10px] bg-[linear-gradient(135deg,#B6D9FC,#1a0e4a)] text-[12px] font-bold text-[#05060f]">
                                                {initialsFromName(review.reviewer_name)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-[13px] font-semibold text-[var(--fg-0)]">{review.reviewer_name}</div>
                                                <div className="mt-1 flex gap-1">
                                                    {Array.from({ length: 5 }).map((_, index) => (
                                                        <Star
                                                            key={index}
                                                            size={13}
                                                            className={index < review.rating ? "fill-[var(--accent-sun)] text-[var(--accent-sun)]" : "text-[var(--fg-3)]"}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-[13px] leading-[1.55] text-[var(--fg-1)]">{review.comment}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-[12px] border border-dashed border-[var(--line)] bg-[var(--bg-2)] px-5 py-10 text-center">
                                <Trophy size={28} className="mx-auto mb-3 text-[var(--fg-3)]" />
                                <div className="text-[15px] font-semibold text-[var(--fg-0)]">Отзывов пока нет</div>
                                <div className="mt-2 text-[13px] text-[var(--fg-2)]">Завершите первый заказ, чтобы получить социальное доказательство в профиле.</div>
                            </div>
                        )}
                    </FilkaCard>

                    <div className="grid gap-5 md:grid-cols-2">
                        <FilkaCard className="rounded-[16px] bg-[var(--bg-1)] p-5">
                            <div className="mb-3 flex items-center gap-2">
                                <Rss size={15} className="text-[var(--info)]" />
                                <div className="t-eyebrow">ЛЕНТА</div>
                            </div>
                            <div className="rounded-[12px] border border-dashed border-[var(--line)] bg-[var(--bg-2)] px-4 py-8 text-center text-[13px] text-[var(--fg-2)]">
                                Публикации, новости и апдейты появятся здесь, когда этот модуль будет подключён к backend.
                            </div>
                        </FilkaCard>

                        <FilkaCard className="rounded-[16px] bg-[var(--bg-1)] p-5">
                            <div className="mb-3 flex items-center gap-2">
                                <ShoppingBag size={15} className="text-[var(--mint-300)]" />
                                <div className="t-eyebrow">УСЛУГИ</div>
                            </div>
                            <div className="rounded-[12px] border border-dashed border-[var(--line)] bg-[var(--bg-2)] px-4 py-8 text-center text-[13px] text-[var(--fg-2)]">
                                Отдельные пакетные услуги можно будет публиковать здесь, как только модуль услуг будет активирован.
                            </div>
                        </FilkaCard>
                    </div>
                </div>

                <div className="space-y-5">
                    <FilkaCard className="rounded-[16px] bg-[var(--bg-1)] p-5">
                        <div className="t-eyebrow mb-3">СВОДКА ПРОФИЛЯ</div>
                        <div className="space-y-3">
                            {topFacts.map((fact, index) => (
                                <div key={fact.label} className={`flex items-center justify-between py-2 text-[13px] ${index > 0 ? "border-t border-[var(--line)]" : ""}`}>
                                    <span className="text-[var(--fg-2)]">{fact.label}</span>
                                    <span className="font-semibold text-[var(--fg-0)]">{fact.value}</span>
                                </div>
                            ))}
                        </div>
                    </FilkaCard>

                    <FilkaCard className="rounded-[16px] border-[rgba(102,58,243,0.22)] bg-[linear-gradient(135deg,rgba(102,58,243,0.10),transparent_65%),var(--bg-1)] p-5">
                        <div className="mb-3 flex items-center gap-2">
                            <User size={16} className="text-[var(--mint-300)]" />
                            <div className="t-eyebrow">ГОТОВНОСТЬ АККАУНТА</div>
                        </div>
                        <div className="text-[30px] font-bold tracking-[-0.03em] text-[var(--fg-0)]">{completionPercent}%</div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--bg-3)]">
                            <div className="h-full bg-[var(--grad-brand)]" style={{ width: `${completionPercent}%` }} />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {completionItems.map((item) => (
                                <FilkaChip key={item.label} tone={item.done ? "default" : "muted"}>
                                    {item.label}
                                </FilkaChip>
                            ))}
                        </div>
                    </FilkaCard>

                    <FilkaCard className="rounded-[16px] bg-[var(--bg-1)] p-5">
                        <div className="mb-3 flex items-center gap-2">
                            <BriefcaseBusiness size={16} className="text-[var(--mint-300)]" />
                            <div className="t-eyebrow">НАВЫКИ И СТЕК</div>
                        </div>
                        {(profile?.skills?.length ?? 0) > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {profile?.skills?.map((skill) => (
                                    <FilkaChip key={skill} tone="muted">{skill}</FilkaChip>
                                ))}
                            </div>
                        ) : (
                            <div className="text-[13px] leading-[1.5] text-[var(--fg-2)]">
                                Навыки ещё не заполнены. Добавьте стек в онбординге или настройках профиля, чтобы улучшить AI-матчинг.
                            </div>
                        )}
                    </FilkaCard>

                    <FilkaCard className="rounded-[16px] bg-[var(--bg-1)] p-5">
                        <div className="mb-3 flex items-center gap-2">
                            <Camera size={16} className="text-[var(--info)]" />
                            <div className="t-eyebrow">ВИДИМОСТЬ ДЛЯ КЛИЕНТОВ</div>
                        </div>
                        <div className="space-y-3 text-[13px] leading-[1.55] text-[var(--fg-2)]">
                            <p>Лучше всего работает связка: имя + короткий bio + несколько сильных кейсов в портфолио.</p>
                            <p>Если вы фрилансер, ставка и список навыков заметно влияют на ранжирование в подборе исполнителей.</p>
                            <p>AI использует эти поля при матчинге и рекомендации подходящих заказов.</p>
                        </div>
                    </FilkaCard>
                </div>
            </div>
        </div>
    );
};
