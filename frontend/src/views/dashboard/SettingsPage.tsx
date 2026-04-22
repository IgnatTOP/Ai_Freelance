"use client";

import { useEffect, useMemo, useState } from "react";
import { Switch, Select, SelectItem, Button, Divider } from "@heroui/react";
import { Bell, Shield, Sparkles, Monitor, Trash2, Smartphone, Laptop, Settings as SettingsIcon, MapPin } from "lucide-react";
import { usePrivacySettings, useUpdatePrivacySettings } from "@/features/privacy-settings";
import { useNotificationSettings, useUpdateNotificationSettings, useSessions } from "@/features/settings-management";
import { useTerminateSession } from "@/features/session-management";
import { notify } from "@/shared/notifications/notify";
import { PageHeader } from "@/shared/ui/page-header/PageHeader";

type TabKey = "notifications" | "privacy" | "ai" | "sessions";


const TABS = [
    { key: "notifications" as TabKey, label: "Уведомления", icon: <Bell size={18} /> },
    { key: "privacy" as TabKey, label: "Приватность", icon: <Shield size={18} /> },
    { key: "ai" as TabKey, label: "AI Ассистент", icon: <Sparkles size={18} /> },
    { key: "sessions" as TabKey, label: "Сессии", icon: <Monitor size={18} /> },
];

export const SettingsPage = () => {
    const [selectedTab, setSelectedTab] = useState<TabKey>("notifications");

    return (
        <div className="space-y-6 animate-fade-in-up max-w-5xl mx-auto">
            <PageHeader
                title="Настройки"
                description="Управляйте параметрами аккаунта и безопасности"
            />

            <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar */}
                <div className="md:w-64 shrink-0">
                    <div className="glass-card rounded-2xl p-3 flex flex-col gap-1 sticky top-24">
                        {TABS.map((tab) => {
                            const isActive = selectedTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setSelectedTab(tab.key)}
                                    className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                        ? "bg-purple-600/10 text-purple-400 font-medium"
                                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                                        }`}
                                >
                                    <span className={isActive ? "text-purple-400" : "text-zinc-500"}>{tab.icon}</span>
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0">
                    <div className="glass-card rounded-2xl p-6 md:p-8 min-h-[500px]">
                        {selectedTab === "notifications" && <NotificationsTab />}
                        {selectedTab === "privacy" && <PrivacyTab />}
                        {selectedTab === "ai" && <AITab />}
                        {selectedTab === "sessions" && <SessionsTab />}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SectionHeader = ({ title, description, icon }: { title: string, description?: string, icon?: React.ReactNode }) => (
    <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
            {icon && <div className="p-2 rounded-lg bg-white/[0.04] text-zinc-400">{icon}</div>}
            <h2 className="text-xl font-semibold text-white">{title}</h2>
        </div>
        {description && <p className="text-sm text-zinc-400">{description}</p>}
    </div>
);

const NotificationsTab = () => {
    const { data } = useNotificationSettings();
    const update = useUpdateNotificationSettings();
    const [quietFrom, setQuietFrom] = useState("22:00");
    const [quietTo, setQuietTo] = useState("08:00");
    type NotificationChannels = {
        browser: Record<string, boolean>;
        email: Record<string, boolean>;
        sms: Record<string, boolean>;
        quiet_hours_from: string;
        quiet_hours_to: string;
    };

    useEffect(() => {
        if (!data) return;
        if (data.quiet_hours_from) setQuietFrom(data.quiet_hours_from);
        if (data.quiet_hours_to) setQuietTo(data.quiet_hours_to);
    }, [data]);

    const settings = useMemo<NotificationChannels>(() => {
        const fallback: NotificationChannels = {
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

    const channels = useMemo(() => {
        const keys = new Set<string>([
            ...Object.keys(settings.browser ?? {}),
            ...Object.keys(settings.email ?? {}),
            ...Object.keys(settings.sms ?? {}),
        ]);
        return [...keys];
    }, [settings.browser, settings.email, settings.sms]);

    const LABELS: Record<string, { title: string; desc: string }> = {
        new_proposals: { title: "Новые отклики", desc: "Уведомления о новых предложениях от фрилансеров" },
        messages: { title: "Сообщения", desc: "Прямые сообщения в чатах" },
        status_changes: { title: "Изменения статуса", desc: "Обновления статусов ваших заказов" },
        payments: { title: "Платежи и финансы", desc: "Удержания, возвраты и зачисления" },
    };

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
                onSuccess: () => notify.success({ title: "Настройки сохранены" }),
            }
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
                onSuccess: () => notify.success({ title: "Тихие часы обновлены" }),
            }
        );
    };

    return (
        <div className="animate-fade-in-up">
            <SectionHeader title="Каналы уведомлений" description="Выберите, какие уведомления вы хотите получать" icon={<Bell size={20} />} />

            <div className="space-y-1">
                {channels.map((key, i) => {
                    const meta = LABELS[key] ?? { title: key, desc: "Кастомный тип уведомлений" };
                    return (
                    <div key={key}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-4">
                            <div>
                                <p className="text-sm font-medium text-zinc-200">{meta.title}</p>
                                <p className="text-xs text-zinc-500 mt-1">{meta.desc}</p>
                            </div>
                            <div className="flex bg-zinc-900/50 p-1.5 rounded-xl border border-white/[0.04] gap-2">
                                <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.02] rounded-lg cursor-pointer transition-colors">
                                    <Switch
                                        size="sm"
                                        isSelected={Boolean(settings.browser?.[key])}
                                        onValueChange={(v) => updateChannel("browser", key, v)}
                                        classNames={{ wrapper: "group-data-[selected=true]:bg-purple-600" }}
                                    />
                                    <span className="text-xs text-zinc-400 font-medium">Push</span>
                                </label>
                                <div className="w-px bg-white/[0.04] my-1" />
                                <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.02] rounded-lg cursor-pointer transition-colors">
                                    <Switch
                                        size="sm"
                                        isSelected={Boolean(settings.email?.[key])}
                                        onValueChange={(v) => updateChannel("email", key, v)}
                                        classNames={{ wrapper: "group-data-[selected=true]:bg-purple-600" }}
                                    />
                                    <span className="text-xs text-zinc-400 font-medium">Email</span>
                                </label>
                                <div className="w-px bg-white/[0.04] my-1" />
                                <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.02] rounded-lg cursor-pointer transition-colors">
                                    <Switch
                                        size="sm"
                                        isSelected={Boolean(settings.sms?.[key])}
                                        onValueChange={(v) => updateChannel("sms", key, v)}
                                        classNames={{ wrapper: "group-data-[selected=true]:bg-purple-600" }}
                                    />
                                    <span className="text-xs text-zinc-400 font-medium">SMS</span>
                                </label>
                            </div>
                        </div>
                        {i < channels.length - 1 && <Divider className="bg-white/[0.04]" />}
                    </div>
                )})}
            </div>

            <Divider className="bg-white/[0.04] my-6" />
            <div className="space-y-3">
                <p className="text-sm font-medium text-zinc-200">Тихие часы</p>
                <p className="text-xs text-zinc-500">В это время push-уведомления будут приглушены.</p>
                <div className="flex items-center gap-3">
                    <input
                        type="time"
                        value={quietFrom}
                        onChange={(e) => setQuietFrom(e.target.value)}
                        className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-200"
                    />
                    <span className="text-zinc-500">—</span>
                    <input
                        type="time"
                        value={quietTo}
                        onChange={(e) => setQuietTo(e.target.value)}
                        className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-200"
                    />
                    <Button
                        size="sm"
                        className="bg-purple-600 text-white hover:bg-purple-500"
                        onPress={saveQuietHours}
                        isLoading={update.isPending}
                    >
                        Сохранить
                    </Button>
                </div>
            </div>
        </div>
    );
};

const PrivacyTab = () => {
    const { data } = usePrivacySettings();
    const update = useUpdatePrivacySettings();

    const handleChange = (key: string, v: any) => {
        const payload = data ?? { profile_visible: true, show_online_status: true, direct_messages: "all" as const };
        update.mutate({ ...payload, [key]: v }, {
            onSuccess: () => notify.success({ title: "Настройки приватности обновлены" })
        });
    };

    return (
        <div className="animate-fade-in-up">
            <SectionHeader title="Приватность" description="Управляйте тем, кто может видеть ваш профиль" icon={<Shield size={20} />} />

            <div className="space-y-1">
                <div className="flex items-center justify-between py-5">
                    <div>
                        <p className="text-sm font-medium text-zinc-200">Публичный профиль</p>
                        <p className="text-xs text-zinc-500 mt-1">Ваш профиль будет виден в поиске маркетплейса</p>
                    </div>
                    <Switch
                        isSelected={data?.profile_visible ?? true}
                        onValueChange={(v) => handleChange("profile_visible", v)}
                        classNames={{ wrapper: "group-data-[selected=true]:bg-purple-600" }}
                    />
                </div>
                <Divider className="bg-white/[0.04]" />
                <div className="flex items-center justify-between py-5">
                    <div>
                        <p className="text-sm font-medium text-zinc-200">Онлайн-статус</p>
                        <p className="text-xs text-zinc-500 mt-1">Другие пользователи увидят, когда вы в сети</p>
                    </div>
                    <Switch
                        isSelected={data?.show_online_status ?? true}
                        onValueChange={(v) => handleChange("show_online_status", v)}
                        classNames={{ wrapper: "group-data-[selected=true]:bg-purple-600" }}
                    />
                </div>
                <Divider className="bg-white/[0.04]" />
                <div className="flex items-center justify-between py-5">
                    <div>
                        <p className="text-sm font-medium text-zinc-200">Личные сообщения</p>
                        <p className="text-xs text-zinc-500 mt-1">Кто может отправлять вам сообщения в чат</p>
                    </div>
                    <Select
                        selectedKeys={[data?.direct_messages ?? "all"]}
                        onSelectionChange={(keys) => handleChange("direct_messages", Array.from(keys)[0] as "all" | "none")}
                        variant="bordered"
                        className="w-40"
                        classNames={{ trigger: "bg-zinc-900/50 border-zinc-700/50 hover:border-purple-500/40", value: "text-zinc-200" }}
                        aria-label="Личные сообщения"
                        startContent={<SettingsIcon size={16} className="text-zinc-500 shrink-0" />}
                    >
                        <SelectItem key="all">От всех</SelectItem>
                        <SelectItem key="none">Никому</SelectItem>
                    </Select>
                </div>
            </div>
        </div>
    );
};

const AITab = () => {
    const handleToggle = () => {
        notify.success({ title: "Настройки сохранены" });
    };

    return (
        <div className="animate-fade-in-up">
            <SectionHeader title="Искусственный интеллект" description="Настройки AI-ассистента и рекомендаций" icon={<Sparkles size={20} />} />

            <div className="space-y-1">
                <div className="flex items-center justify-between py-5">
                    <div>
                        <p className="text-sm font-medium text-zinc-200">Анализ контекста чатов</p>
                        <p className="text-xs text-zinc-500 mt-1">AI читает чаты для улучшения персональных рекомендаций проектов</p>
                    </div>
                    <Switch size="sm" onValueChange={handleToggle} classNames={{ wrapper: "group-data-[selected=true]:bg-purple-600" }} />
                </div>
                <Divider className="bg-white/[0.04]" />
                <div className="flex items-center justify-between py-5">
                    <div>
                        <p className="text-sm font-medium text-zinc-200">Сохранение истории диалогов</p>
                        <p className="text-xs text-zinc-500 mt-1">Ассистент будет 'помнить' контекст прошлых обсуждений</p>
                    </div>
                    <Switch size="sm" defaultSelected onValueChange={handleToggle} classNames={{ wrapper: "group-data-[selected=true]:bg-purple-600" }} />
                </div>
                <Divider className="bg-white/[0.04]" />
                <div className="flex items-center justify-between py-5">
                    <div>
                        <p className="text-sm font-medium text-zinc-200">Тональность ответов</p>
                        <p className="text-xs text-zinc-500 mt-1">Предпочтительный стиль общения AI</p>
                    </div>
                    <Select
                        variant="bordered"
                        defaultSelectedKeys={["neutral"]}
                        className="w-44"
                        classNames={{ trigger: "bg-zinc-900/50 border-zinc-700/50 hover:border-purple-500/40", value: "text-zinc-200" }}
                        aria-label="Стиль ответов"
                        onChange={handleToggle}
                        startContent={<Sparkles size={16} className="text-purple-400 shrink-0" />}
                    >
                        <SelectItem key="formal">Формальный</SelectItem>
                        <SelectItem key="neutral">Нейтральный</SelectItem>
                        <SelectItem key="friendly">Дружелюбный</SelectItem>
                    </Select>
                </div>
            </div>
        </div>
    );
};

const SessionsTab = () => {
    const { data: sessions } = useSessions();
    const terminate = useTerminateSession();

    const handleTerminate = (id: string) => {
        terminate.mutate(id, {
            onSuccess: () => notify.success({ title: "Сессия завершена" })
        });
    };

    const getDeviceIcon = (userAgent: string) => {
        const ua = userAgent.toLowerCase();
        if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) return <Smartphone size={24} className="text-indigo-400" />;
        return <Laptop size={24} className="text-purple-400" />;
    };

    return (
        <div className="animate-fade-in-up">
            <SectionHeader title="Активные сессии" description="Устройства, с которых выполнен вход в ваш аккаунт" icon={<Monitor size={20} />} />

            {!sessions?.length ? (
                <div className="py-12 text-center text-zinc-500">
                    <Monitor size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Загрузка данных о сессиях...</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sessions.map((session: { id: string; device: string; ip: string; last_active: string }, i: number) => {
                        const isCurrent = i === 0; // В реальном АПИ обычно есть флаг is_current
                        return (
                            <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-white/[0.04] hover:border-purple-500/20 transition-colors gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                                        {getDeviceIcon(session.device)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-sm font-medium text-zinc-100">{session.device.split(' ')[0] || "Unknown Browser"}</p>
                                            {isCurrent && <span className="text-[10px] uppercase font-bold tracking-wide bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">Текущая</span>}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                                            <span className="flex items-center gap-1"><MapPin size={12} />{session.ip}</span>
                                            <span>•</span>
                                            <span>{new Date(session.last_active).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                                        </div>
                                    </div>
                                </div>
                                {!isCurrent && (
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        className="text-red-400 bg-red-500/10 hover:bg-red-500/20 hover:text-red-300 font-medium shrink-0"
                                        onPress={() => handleTerminate(session.id)}
                                        startContent={<Trash2 size={16} />}
                                    >
                                        Завершить
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
