"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Bell, Laptop, MapPin, Monitor, Shield, Smartphone, Sparkles, Trash2 } from "lucide-react";
import { usePrivacySettings, useUpdatePrivacySettings } from "@/features/privacy-settings";
import { useAISettings, useNotificationSettings, useSessions, useUpdateAISettings, useUpdateNotificationSettings } from "@/features/settings-management";
import { useTerminateSession } from "@/features/session-management";
import { notify } from "@/shared/notifications/notify";
import { FilkaButton, FilkaCard, FilkaSelect } from "@/shared/ui/filka/FilkaPrimitives";

type TabKey = "notifications" | "privacy" | "ai" | "sessions";

const TABS: Array<{ key: TabKey; title: string }> = [
    { key: "notifications", title: "Уведомления" },
    { key: "privacy", title: "Приватность" },
    { key: "ai", title: "AI-помощник" },
    { key: "sessions", title: "Сессии" },
];

const Toggle = ({ checked, onClick }: { checked: boolean; onClick: () => void }) => (
    <button
        type="button"
        aria-pressed={checked}
        onClick={onClick}
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-[var(--mint-400)]" : "bg-[var(--bg-3)]"}`}
    >
        <span
            className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
            style={{ left: checked ? 18 : 2 }}
        />
    </button>
);

const SectionHeader = ({ title, description, icon }: { title: string; description?: string; icon?: ReactNode }) => (
    <div className="mb-5">
        <div className="mb-2 flex items-center gap-3">
            {icon ? (
                <div className="grid h-9 w-9 place-items-center rounded-[11px] border border-[rgba(52,211,153,0.18)] bg-[rgba(52,211,153,0.08)] text-[var(--mint-300)]">
                    {icon}
                </div>
            ) : null}
            <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-[var(--fg-0)]">{title}</h2>
        </div>
        {description ? <p className="text-[13px] leading-[1.5] text-[var(--fg-2)]">{description}</p> : null}
    </div>
);

const Row = ({
    title,
    description,
    action,
    bordered = true,
}: {
    title: string;
    description?: string;
    action: ReactNode;
    bordered?: boolean;
}) => (
    <div className={`flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between ${bordered ? "border-t border-[var(--line)]" : ""}`}>
        <div>
            <div className="text-[13.5px] font-semibold text-[var(--fg-0)]">{title}</div>
            {description ? <div className="mt-1 text-[12px] leading-[1.45] text-[var(--fg-3)]">{description}</div> : null}
        </div>
        <div className="shrink-0">{action}</div>
    </div>
);

const NotificationsTab = () => {
    const { data } = useNotificationSettings();
    const update = useUpdateNotificationSettings();
    const [quietFrom, setQuietFrom] = useState("22:00");
    const [quietTo, setQuietTo] = useState("08:00");

    useEffect(() => {
        if (!data) return;
        if (data.quiet_hours_from) setQuietFrom(data.quiet_hours_from);
        if (data.quiet_hours_to) setQuietTo(data.quiet_hours_to);
    }, [data]);

    const settings = useMemo(() => {
        const fallback = {
            browser: {
                new_proposals: true,
                messages: true,
                status_changes: true,
                payments: true,
            },
            email: {
                new_proposals: true,
                messages: false,
                status_changes: true,
                payments: true,
            },
            sms: {
                new_proposals: false,
                messages: false,
                status_changes: false,
                payments: false,
            },
            quiet_hours_from: quietFrom,
            quiet_hours_to: quietTo,
        };

        if (!data) return fallback;
        return {
            browser: data.browser ?? fallback.browser,
            email: data.email ?? fallback.email,
            sms: data.sms ?? fallback.sms,
            quiet_hours_from: data.quiet_hours_from ?? fallback.quiet_hours_from,
            quiet_hours_to: data.quiet_hours_to ?? fallback.quiet_hours_to,
        };
    }, [data, quietFrom, quietTo]);

    const labels: Record<string, { title: string; desc: string }> = {
        new_proposals: { title: "Отклики на заказ", desc: "Новые предложения от фрилансеров" },
        messages: { title: "Сообщения в чате", desc: "Личные и проектные диалоги" },
        status_changes: { title: "Изменение статуса", desc: "Этапы, приёмка и ключевые переходы" },
        payments: { title: "Платёжные операции", desc: "Удержания, зачисления и возвраты" },
    };

    const channels = useMemo(() => {
        const keys = new Set<string>([
            ...Object.keys(settings.browser ?? {}),
            ...Object.keys(settings.email ?? {}),
            ...Object.keys(settings.sms ?? {}),
        ]);
        return [...keys];
    }, [settings.browser, settings.email, settings.sms]);
    const emailSettings = settings.email as Record<string, boolean>;
    const browserSettings = settings.browser as Record<string, boolean>;
    const smsSettings = settings.sms as Record<string, boolean>;

    const updateChannel = (medium: "browser" | "email" | "sms", channel: string, value: boolean) => {
        update.mutate(
            {
                ...settings,
                [medium]: {
                    ...settings[medium],
                    [channel]: value,
                },
            },
            {
                onSuccess: () => notify.success({ title: "Настройки уведомлений обновлены" }),
            },
        );
    };

    const saveQuietHours = () => {
        update.mutate(
            {
                ...settings,
                quiet_hours_from: quietFrom,
                quiet_hours_to: quietTo,
            },
            {
                onSuccess: () => notify.success({ title: "Тихие часы сохранены" }),
            },
        );
    };

    return (
        <div>
            <SectionHeader
                title="Уведомления"
                description="Что и куда присылать. Срочные алерты и арбитраж приходят всегда."
                icon={<Bell size={18} />}
            />

            <FilkaCard className="rounded-[14px] bg-[var(--bg-1)] p-5">
                <div className="grid grid-cols-[minmax(0,1fr)_80px_80px_80px] items-center gap-3 text-[10.5px] uppercase tracking-[0.08em] text-[var(--fg-3)]">
                    <div />
                    <div className="text-center">Email</div>
                    <div className="text-center">Пуш</div>
                    <div className="text-center">SMS</div>
                </div>

                <div className="mt-2">
                    {channels.map((channel, index) => {
                        const meta = labels[channel] ?? { title: channel, desc: "Кастомный канал уведомлений" };
                        return (
                            <div
                                key={channel}
                                className={`grid grid-cols-[minmax(0,1fr)_80px_80px_80px] items-center gap-3 py-4 ${index > 0 ? "border-t border-[var(--line)]" : ""}`}
                            >
                                <div className="pr-4">
                                    <div className="text-[13.5px] font-semibold text-[var(--fg-0)]">{meta.title}</div>
                                    <div className="mt-1 text-[12px] leading-[1.4] text-[var(--fg-3)]">{meta.desc}</div>
                                </div>
                                <div className="grid place-items-center">
                                    <Toggle checked={Boolean(emailSettings[channel])} onClick={() => updateChannel("email", channel, !emailSettings[channel])} />
                                </div>
                                <div className="grid place-items-center">
                                    <Toggle checked={Boolean(browserSettings[channel])} onClick={() => updateChannel("browser", channel, !browserSettings[channel])} />
                                </div>
                                <div className="grid place-items-center">
                                    <Toggle checked={Boolean(smsSettings[channel])} onClick={() => updateChannel("sms", channel, !smsSettings[channel])} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </FilkaCard>

            <FilkaCard className="mt-4 rounded-[14px] bg-[var(--bg-1)] p-5">
                <SectionHeader title="Тихие часы" description="В это время пуш-уведомления будут приглушены." />
                <div className="flex flex-wrap items-center gap-3">
                    <input
                        type="time"
                        value={quietFrom}
                        onChange={(event) => setQuietFrom(event.target.value)}
                        className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--bg-2)] px-3 text-[13px] text-[var(--fg-0)] outline-none"
                    />
                    <span className="text-[var(--fg-3)]">—</span>
                    <input
                        type="time"
                        value={quietTo}
                        onChange={(event) => setQuietTo(event.target.value)}
                        className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--bg-2)] px-3 text-[13px] text-[var(--fg-0)] outline-none"
                    />
                    <FilkaButton size="sm" loading={update.isPending} onClick={saveQuietHours}>
                        Сохранить
                    </FilkaButton>
                </div>
            </FilkaCard>
        </div>
    );
};

const PrivacyTab = () => {
    const { data } = usePrivacySettings();
    const update = useUpdatePrivacySettings();

    const handleChange = (key: "profile_visible" | "show_online_status" | "direct_messages", value: boolean | "all" | "none") => {
        update.mutate(
            {
                ...(data ?? { profile_visible: true, show_online_status: true, direct_messages: "all" as const }),
                [key]: value,
            },
            {
                onSuccess: () => notify.success({ title: "Приватность обновлена" }),
            },
        );
    };

    return (
        <div>
            <SectionHeader
                title="Приватность"
                description="Кто видит ваш профиль, статус присутствия и кто может писать вам напрямую."
                icon={<Shield size={18} />}
            />

            <FilkaCard className="rounded-[14px] bg-[var(--bg-1)] p-5">
                <Row
                    title="Публичный профиль"
                    description="Ваш аккаунт будет виден в поиске и рекомендациях маркетплейса."
                    bordered={false}
                    action={<Toggle checked={data?.profile_visible ?? true} onClick={() => handleChange("profile_visible", !(data?.profile_visible ?? true))} />}
                />
                <Row
                    title="Онлайн-статус"
                    description="Другие пользователи увидят, когда вы сейчас в сети."
                    action={<Toggle checked={data?.show_online_status ?? true} onClick={() => handleChange("show_online_status", !(data?.show_online_status ?? true))} />}
                />
                <Row
                    title="Личные сообщения"
                    description="Кто может инициировать переписку с вами без активной сделки."
                    action={
                        <FilkaSelect
                            value={data?.direct_messages ?? "all"}
                            onChange={(event) => handleChange("direct_messages", event.target.value as "all" | "none")}
                            className="min-w-[170px]"
                        >
                            <option value="all">От всех</option>
                            <option value="none">Никому</option>
                        </FilkaSelect>
                    }
                />
            </FilkaCard>
        </div>
    );
};

const AITab = () => {
    const { data } = useAISettings();
    const update = useUpdateAISettings();

    const settings = data ?? {
        allow_ai_read_chats: false,
        persist_ai_history: true,
        response_style: "neutral" as const,
    };

    const save = (patch: Partial<typeof settings>) => {
        update.mutate(
            { ...settings, ...patch },
            {
                onSuccess: () => notify.success({ title: "AI-настройки сохранены" }),
            },
        );
    };

    return (
        <div className="space-y-4">
            <FilkaCard className="rounded-[14px] border-[rgba(52,211,153,0.25)] bg-[linear-gradient(135deg,rgba(52,211,153,0.10),transparent_60%),var(--bg-1)] p-6">
                <SectionHeader
                    title="AI-помощник"
                    description="Что Filka может делать без ручного подтверждения и как глубоко использовать ваш контекст."
                    icon={<Sparkles size={18} />}
                />
                <Row
                    title="Анализ контекста чатов"
                    description="AI использует переписки для более точных рекомендаций и подсказок."
                    bordered={false}
                    action={<Toggle checked={settings.allow_ai_read_chats} onClick={() => save({ allow_ai_read_chats: !settings.allow_ai_read_chats })} />}
                />
                <Row
                    title="Сохранение истории диалогов"
                    description="Ассистент будет помнить прошлые обсуждения и повторяющиеся задачи."
                    action={<Toggle checked={settings.persist_ai_history} onClick={() => save({ persist_ai_history: !settings.persist_ai_history })} />}
                />
                <Row
                    title="Тональность ответов"
                    description="Предпочтительный стиль подсказок и автоматических черновиков."
                    action={
                        <FilkaSelect
                            value={settings.response_style}
                            onChange={(event) => save({ response_style: event.target.value as "formal" | "neutral" | "friendly" })}
                            className="min-w-[170px]"
                        >
                            <option value="formal">Формальный</option>
                            <option value="neutral">Нейтральный</option>
                            <option value="friendly">Дружелюбный</option>
                        </FilkaSelect>
                    }
                />
            </FilkaCard>

            <FilkaCard className="rounded-[14px] bg-[var(--bg-1)] p-5">
                <div className="t-eyebrow mb-3">ПАМЯТЬ AI</div>
                <div className="space-y-3 text-[13px] leading-[1.5] text-[var(--fg-2)]">
                    <p>AI может помнить ваши предпочтения по срокам, тону коммуникации и типам проектов.</p>
                    <p>Если память включена, рекомендации по заказам и черновики сообщений будут точнее от сессии к сессии.</p>
                    <p>Любую часть контекста можно будет удалить позже из персональной памяти ассистента.</p>
                </div>
            </FilkaCard>
        </div>
    );
};

const SessionsTab = () => {
    const { data: sessions, isLoading } = useSessions();
    const terminate = useTerminateSession();

    const getDeviceIcon = (userAgent: string) => {
        const ua = userAgent.toLowerCase();
        if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
            return <Smartphone size={22} className="text-[var(--info)]" />;
        }
        return <Laptop size={22} className="text-[var(--mint-300)]" />;
    };

    return (
        <div>
            <SectionHeader
                title="Активные сессии"
                description="Устройства, браузеры и текущие подключения к вашему аккаунту."
                icon={<Monitor size={18} />}
            />

            <FilkaCard className="rounded-[14px] bg-[var(--bg-1)] p-5">
                {!sessions?.length ? (
                    <div className="py-12 text-center text-[var(--fg-3)]">
                        <Monitor size={42} className="mx-auto mb-4 opacity-30" />
                        <div className="text-[14px]">{isLoading ? "Загружаем список сессий…" : "Активных сессий не найдено"}</div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sessions.map((session, index) => {
                            const isCurrent = index === 0;
                            return (
                                <div
                                    key={session.id}
                                    className="flex flex-col gap-4 rounded-[12px] border border-[var(--line)] bg-[var(--bg-2)] p-4 md:flex-row md:items-center md:justify-between"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--bg-3)]">
                                            {getDeviceIcon(session.device)}
                                        </div>
                                        <div>
                                            <div className="mb-1 flex items-center gap-2">
                                                <span className="text-[14px] font-semibold text-[var(--fg-0)]">{session.device.split(" ")[0] || "Браузер"}</span>
                                                {isCurrent ? <span className="filka-chip">Текущая</span> : null}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--fg-3)]">
                                                <span className="inline-flex items-center gap-1"><MapPin size={12} />{session.ip}</span>
                                                <span>·</span>
                                                <span>{new Date(session.last_active).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {!isCurrent ? (
                                        <FilkaButton
                                            variant="danger"
                                            size="sm"
                                            loading={terminate.isPending}
                                            startContent={<Trash2 size={14} />}
                                            onClick={() => terminate.mutate(session.id, { onSuccess: () => notify.success({ title: "Сессия завершена" }) })}
                                        >
                                            Завершить
                                        </FilkaButton>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                )}
            </FilkaCard>
        </div>
    );
};

export const SettingsPage = () => {
    const [selectedTab, setSelectedTab] = useState<TabKey>("notifications");

    return (
        <div className="mx-auto grid max-w-[1240px] gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="flex flex-col gap-1">
                {TABS.map((tab) => {
                    const isActive = selectedTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setSelectedTab(tab.key)}
                            className={`rounded-[10px] border px-4 py-2.5 text-left text-[13.5px] transition-colors ${isActive
                                ? "border-[var(--line)] bg-[var(--bg-2)] font-semibold text-[var(--fg-0)]"
                                : "border-transparent text-[var(--fg-2)] hover:bg-[var(--bg-2)]/60 hover:text-[var(--fg-1)]"
                                }`}
                        >
                            {tab.title}
                        </button>
                    );
                })}
                <div className="px-4 pt-4 text-[10.5px] uppercase tracking-[0.08em] text-[var(--fg-3)]">v 4.18 · филка</div>
            </aside>

            <div>
                {selectedTab === "notifications" ? <NotificationsTab /> : null}
                {selectedTab === "privacy" ? <PrivacyTab /> : null}
                {selectedTab === "ai" ? <AITab /> : null}
                {selectedTab === "sessions" ? <SessionsTab /> : null}
            </div>
        </div>
    );
};
