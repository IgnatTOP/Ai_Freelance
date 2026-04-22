"use client";

import { useMyConversations } from "@/features/conversation-list/model";
import { Card, CardBody, Button, Avatar, Skeleton } from "@heroui/react";
import { MessageSquare, ArrowRight } from "lucide-react";
import NextLink from "next/link";
import { useMemo } from "react";

const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Less than 24 hours
    if (diff < 86_400_000 && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    }
    // Less than a week
    if (diff < 7 * 86_400_000) {
        return date.toLocaleDateString("ru-RU", { weekday: "short" });
    }
    // Older
    return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });
};

export const SmartChatFeedWidget = () => {
    const { data: conversations, isLoading } = useMyConversations();

    const recentChats = useMemo(() => {
        if (!conversations) return [];
        return [...conversations]
            .sort((a, b) => {
                const dateA = a.last_message?.created_at || a.created_at;
                const dateB = b.last_message?.created_at || b.created_at;
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            })
            .slice(0, 5);
    }, [conversations]);

    if (isLoading) {
        return (
            <Card className="glass-card animate-fade-in-up">
                <CardBody className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                            <MessageSquare size={20} />
                        </div>
                        <h3 className="text-lg font-semibold text-zinc-100">Последние сообщения</h3>
                    </div>
                    <div className="space-y-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex gap-4 p-3 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
                                <Skeleton className="w-12 h-12 rounded-full shrink-0" classNames={{ base: "bg-zinc-800" }} />
                                <div className="flex-1 min-w-0 space-y-2 py-1">
                                    <div className="flex justify-between">
                                        <Skeleton className="h-4 w-1/3 rounded-lg" classNames={{ base: "bg-zinc-800" }} />
                                        <Skeleton className="h-3 w-10 rounded-lg" classNames={{ base: "bg-zinc-800" }} />
                                    </div>
                                    <Skeleton className="h-3 w-4/5 rounded-lg" classNames={{ base: "bg-zinc-800" }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardBody>
            </Card>
        );
    }

    if (recentChats.length === 0) {
        return (
            <Card className="glass-card border-zinc-800/60 animate-fade-in-up">
                <CardBody className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                            <MessageSquare size={20} />
                        </div>
                        <h3 className="text-lg font-semibold text-zinc-100">Последние сообщения</h3>
                    </div>
                    <p className="text-sm text-zinc-500 text-center py-6">Диалогов пока нет</p>
                </CardBody>
            </Card>
        );
    }

    return (
        <Card className="glass-card border-zinc-800/60 transition-all duration-300 animate-fade-in-up">
            <CardBody className="p-6">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                            <MessageSquare size={20} />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Умная лента сообщений</h3>
                    </div>
                    <Button
                        as={NextLink}
                        href="/dashboard/messages"
                        variant="light"
                        size="sm"
                        className="text-blue-400 hover:text-blue-300"
                        endContent={<ArrowRight size={14} />}
                    >
                        Все чаты
                    </Button>
                </div>

                <div className="space-y-2">
                    {recentChats.map((chat) => {
                        const otherUser = chat.other_user;
                        const lastMessage = chat.last_message;
                        const unread = chat.unread_count || 0;

                        return (
                            <NextLink
                                key={chat.id}
                                href={`/dashboard/messages?chat=${chat.id}`}
                                className="block group"
                            >
                                <div className={`p-3 rounded-xl transition-all duration-200 flex gap-3 ${unread > 0 ? "bg-blue-500/5 border border-blue-500/20" : "bg-transparent hover:bg-white/[0.03]"}`}>
                                    <div className="relative shrink-0">
                                        <Avatar
                                            name={otherUser?.display_name || "Пользователь"}
                                            {...(otherUser?.photo_url ? { src: otherUser.photo_url } : {})}
                                            classNames={{ base: "bg-zinc-800 text-zinc-300" }}
                                            size="md"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h4 className={`text-sm font-medium truncate ${unread > 0 ? "text-zinc-100" : "text-zinc-300"} group-hover:text-blue-300 transition-colors`}>
                                                {otherUser?.display_name || "Пользователь"}
                                            </h4>
                                            {lastMessage && (
                                                <span className={`text-xs shrink-0 pl-2 ${unread > 0 ? "text-blue-400" : "text-zinc-500"}`}>
                                                    {formatMessageTime(lastMessage.created_at)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className={`text-sm truncate flex-1 ${unread > 0 ? "text-zinc-300 font-medium" : "text-zinc-500"}`}>
                                                {lastMessage
                                                ? (lastMessage.content || (lastMessage.attachments?.length ? "📎 Вложение" : "Сообщение"))
                                                : "Нет сообщений..."}
                                            </p>
                                            {unread > 0 && (
                                                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-lg shadow-blue-500/30">
                                                    {unread > 99 ? "99+" : unread}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </NextLink>
                        );
                    })}
                </div>
            </CardBody>
        </Card>
    );
};
