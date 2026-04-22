"use client";

import { ChatLayout } from "@/widgets/chat-layout";

interface ChatPageProps {
    readonly conversationId: string;
}

export const ChatPage = ({ conversationId }: ChatPageProps) => {
    return <ChatLayout initialConversationId={conversationId} />;
};
