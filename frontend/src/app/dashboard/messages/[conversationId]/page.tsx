import { ChatPage } from "@/views/dashboard/ChatPage";

type Props = {
    params: Promise<{ conversationId: string }>;
};

export default async function ChatRoute({ params }: Props) {
    const { conversationId } = await params;
    return <ChatPage conversationId={conversationId} />;
}
