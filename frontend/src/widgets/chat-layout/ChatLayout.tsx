"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  IconArrowDown,
  IconArrowLeft,
  IconCheck,
  IconFile,
  IconLock,
  IconPaperclip,
  IconSearch,
  IconSend,
  IconShield,
  IconSpark,
  IconStar,
  IconStarFilled,
} from "@/shared/ui/filka";
import { useMyConversations, useConversationMessages } from "@/features/conversation-list";
import { useSendMessage } from "@/features/chat-compose";
import { useAddReaction, useRemoveReaction } from "@/features/chat-reactions";
import { createTypingPublisher } from "@/features/chat-typing";
import { markConversationRead } from "@/features/chat-read";
import { useOrderDetail } from "@/features/order-management";
import { useCanLeaveReview, useCreateOrderReview, useOrderReviews } from "@/features/order-reviews/model";
import { useMyProposals, useMyOrderProposal } from "@/features/proposal-management";
import { useEscrowStatus } from "@/features/balance-management";
import { mediaApi } from "@/shared/api/endpoints/media";
import { ApiError, apiClient } from "@/shared/api/client";
import { env } from "@/shared/config/env";
import { cn } from "@/shared/lib/cn";
import { notify } from "@/shared/notifications/notify";
import { useSessionStore } from "@/shared/store/session.store";
import { FilkaButton, FilkaCard, FilkaChip, FilkaInput } from "@/shared/ui/filka/FilkaPrimitives";
import { wsManager } from "@/shared/ws/manager";
import type { Conversation, Message, MessageAttachment } from "@/shared/api/endpoints/conversations";

interface ChatLayoutProps {
  readonly initialConversationId?: string;
}

const QUICK_REACTIONS = ["👍", "🔥", "✅", "👏", "🤝", "🙂"] as const;

const formatDateLabel = (dateStr: string): string => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Сегодня";
  if (date.toDateString() === yesterday.toDateString()) return "Вчера";
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
};

const formatTime = (dateStr: string): string =>
  new Date(dateStr).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

const formatCurrency = (value?: number): string =>
  typeof value === "number" ? `${value.toLocaleString("ru-RU")} ₽` : "—";

const formatFileSize = (value?: number): string => {
  if (!value || value <= 0) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const getInitials = (name?: string): string => {
  if (!name) return "FL";
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "FL";
};

const toMediaUrl = (filePath?: string): string | null => {
  if (!filePath) return null;
  if (filePath.startsWith("http")) return filePath;
  const apiOrigin = new URL(env.API_URL).origin;
  if (filePath.startsWith("/")) return `${apiOrigin}${filePath}`;
  return `${apiOrigin}/media/${filePath}`;
};

export const sortMessagesByDate = (messages: Message[]): Message[] =>
  [...messages].sort((left, right) => {
    const leftTimestamp = new Date(left.created_at).getTime();
    const rightTimestamp = new Date(right.created_at).getTime();
    return leftTimestamp - rightTimestamp;
  });

const getAttachmentFilePath = (attachment: MessageAttachment): string | undefined =>
  attachment.media?.file_path ?? attachment.file_path;

const getAttachmentFileType = (attachment: MessageAttachment): string | undefined =>
  attachment.media?.file_type ?? attachment.file_type;

const getOrderBadge = (conversation?: Conversation): string | null => {
  if (!conversation?.order_id) return null;
  return conversation.order_title ?? `#${conversation.order_id.slice(0, 8).toUpperCase()}`;
};

const AvatarBadge = ({
  name,
  photoUrl,
  size = "md",
  isActive = false,
}: {
  readonly name?: string | undefined;
  readonly photoUrl?: string | undefined;
  readonly size?: "sm" | "md" | "lg";
  readonly isActive?: boolean;
}) => {
  const resolvedUrl = toMediaUrl(photoUrl);
  const sizeClass = size === "sm" ? "h-9 w-9 rounded-[10px] text-[12px]" : size === "lg" ? "h-12 w-12 rounded-[14px] text-[14px]" : "h-10 w-10 rounded-[12px] text-[13px]";

  return (
    <div className="relative shrink-0">
      <div
        className={cn(
          "grid place-items-center overflow-hidden bg-[linear-gradient(135deg,#B6D9FC,#1a0e4a)] font-bold text-[#05060f]",
          sizeClass,
        )}
      >
        {resolvedUrl ? (
          <img src={resolvedUrl} alt={name ?? "avatar"} className="h-full w-full object-cover" />
        ) : (
          getInitials(name)
        )}
      </div>
      {isActive ? (
        <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full border-2 border-[var(--bg-1)] bg-[var(--ok)] text-[#05060f]">
          <IconCheck size={9} />
        </span>
      ) : null}
    </div>
  );
};

const statusLabelMap: Record<string, string> = {
  draft: "Черновик",
  open: "Открыт",
  in_progress: "В работе",
  completed: "Завершён",
  dispute: "Спор",
  cancelled: "Отменён",
};

export const ChatLayout = ({ initialConversationId }: ChatLayoutProps) => {
  const [selectedId, setSelectedId] = useState(initialConversationId ?? "");
  const [conversationSearch, setConversationSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const [showList, setShowList] = useState(!initialConversationId);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<{ id: string; content: string } | null>(null);
  const [uploadedMedia, setUploadedMedia] = useState<Array<{ id: string; file_path?: string; file_type?: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [readByPeerMessageIds, setReadByPeerMessageIds] = useState<Set<string>>(new Set());
  const [showAISuggestions, setShowAISuggestions] = useState(true);
  const [showRejectedChats, setShowRejectedChats] = useState(false);
  const [showOtherResponderChats, setShowOtherResponderChats] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isAiSuggestLoading, setIsAiSuggestLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingStopTimer = useRef<number | null>(null);
  const aiSuggestTimer = useRef<number | null>(null);
  const lastSuggestMsgCountRef = useRef(-1);
  const lastSuggestDraftRef = useRef("");

  const queryClient = useQueryClient();

  const userId = useSessionStore((state) => state.userId);
  const role = useSessionStore((state) => state.role);
  const router = useRouter();

  const { data: conversations } = useMyConversations();
  const { data: messagesData } = useConversationMessages(selectedId);
  const sendMessage = useSendMessage(selectedId);
  const addReaction = useAddReaction(selectedId);
  const removeReaction = useRemoveReaction(selectedId);
  const { data: allProposalsData } = useMyProposals(role === "client" ? "client" : "freelancer");

  const messages = useMemo(() => sortMessagesByDate(messagesData?.items ?? []), [messagesData?.items]);
  const selectedConversation = conversations?.find((conversation) => conversation.id === selectedId);
  const orderIdForReview = selectedConversation?.order_id;
  const { data: relatedOrder } = useOrderDetail(orderIdForReview ?? "", { refetchInterval: 30_000 });

  const chatOrderReviewParticipant =
    Boolean(userId && selectedConversation) &&
    (userId === selectedConversation!.client_id || userId === selectedConversation!.freelancer_id);
  const showOrderReviewPanel =
    Boolean(orderIdForReview && relatedOrder?.status === "completed" && chatOrderReviewParticipant);

  const { data: chatEscrow } = useEscrowStatus(orderIdForReview ?? "");
  const { data: myChatOrderProposal } = useMyOrderProposal(orderIdForReview ?? "", Boolean(orderIdForReview && role === "freelancer"));
  const { data: canLeaveReview, isFetched: canReviewFetched } = useCanLeaveReview(orderIdForReview, showOrderReviewPanel);
  const { data: orderReviews = [], isFetched: orderReviewsFetched } = useOrderReviews(orderIdForReview, showOrderReviewPanel);
  const createOrderReview = useCreateOrderReview();

  const proposalStatusMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!allProposalsData?.items) return map;
    for (const proposal of allProposalsData.items) {
      map.set(`${proposal.order_id}:${proposal.freelancer_id}`, proposal.status);
    }
    return map;
  }, [allProposalsData]);

  const acceptedFreelancerByOrderId = useMemo(() => {
    const map = new Map<string, string>();
    if (role !== "client" || !allProposalsData?.items) return map;
    for (const proposal of allProposalsData.items) {
      if (proposal.status === "accepted") map.set(proposal.order_id, proposal.freelancer_id);
    }
    return map;
  }, [allProposalsData, role]);

  const typingPublisher = useMemo(
    () => (selectedId ? createTypingPublisher(selectedId) : null),
    [selectedId],
  );

  useEffect(() => {
    if (!selectedId && conversations?.length) {
      setSelectedId(conversations[0]!.id);
    }
  }, [conversations, selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedId]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowScrollBtn(distanceToBottom > 160);
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [selectedId, messages.length]);

  useEffect(() => {
    if (!selectedId) return;
    const latestFromOther = [...messages]
      .reverse()
      .find((message) => message.author_id && message.author_id !== userId);
    if (latestFromOther?.id) {
      void markConversationRead(selectedId, latestFromOther.id);
    }
  }, [messages, selectedId, userId]);

  useEffect(() => {
    const unsubscribe = wsManager.subscribe((event) => {
      if (event.type === "chat.message.read") {
        const payload = event.data as { conversation_id?: string; message_id?: string; user_id?: string };
        if (payload.conversation_id !== selectedId) return;
        if (!payload.message_id || !payload.user_id || payload.user_id === userId) return;
        const messageId = payload.message_id;
        setReadByPeerMessageIds((prev) => new Set(prev).add(messageId));
        return;
      }

      if (event.type !== "chat.typing.updated") return;
      const payload = event.data as { conversation_id?: string; typing_users?: string[] };
      if (payload.conversation_id !== selectedId) return;
      setTypingUsers((payload.typing_users ?? []).filter((id) => id !== userId));
    });

    return unsubscribe;
  }, [selectedId, userId]);

  useEffect(() => {
    setReadByPeerMessageIds(new Set());
  }, [selectedId]);

  useEffect(() => {
    lastSuggestMsgCountRef.current = -1;
    lastSuggestDraftRef.current = "";
    setAiSuggestions([]);
    if (aiSuggestTimer.current) {
      window.clearTimeout(aiSuggestTimer.current);
      aiSuggestTimer.current = null;
    }
  }, [selectedId]);

  useEffect(() => {
    if (!showAISuggestions) return;
    lastSuggestMsgCountRef.current = -1;
    lastSuggestDraftRef.current = "";
  }, [showAISuggestions]);

  useEffect(() => {
    if (!selectedId || !showAISuggestions) return;
    if (!selectedConversation?.order_id) {
      setAiSuggestions([]);
      setIsAiSuggestLoading(false);
      return;
    }

    if (
      lastSuggestMsgCountRef.current >= 0 &&
      messageText === lastSuggestDraftRef.current &&
      messages.length !== lastSuggestMsgCountRef.current
    ) {
      lastSuggestMsgCountRef.current = messages.length;
      return;
    }

    if (
      messages.length === lastSuggestMsgCountRef.current &&
      messageText === lastSuggestDraftRef.current
    ) {
      return;
    }

    if (aiSuggestTimer.current) {
      window.clearTimeout(aiSuggestTimer.current);
    }

    aiSuggestTimer.current = window.setTimeout(async () => {
      lastSuggestMsgCountRef.current = messages.length;
      lastSuggestDraftRef.current = messageText;
      const promptSource = messageText.trim();
      const contextTail = messages
        .slice(-6)
        .map((message) => {
          const authorLabel = message.author_id === userId ? "Я" : (selectedConversation?.other_user?.display_name ?? "Собеседник");
          return `${authorLabel}: ${message.content}`;
        })
        .filter(Boolean)
        .join("\n");

      const orderContext = selectedConversation?.order_title
        ? `Тема обсуждения (заказ): "${selectedConversation.order_title}". `
        : "";
      const roleLabel = role === "client" ? "заказчик" : "исполнитель";

      const baseInstruction = `${orderContext}Ты помогаешь ${roleLabel === "заказчик" ? "заказчику" : "исполнителю"} на фриланс-платформе. Сгенерируй 3 коротких, уместных варианта ответа в чате (каждый на отдельной строке, без нумерации и маркеров). Варианты должны быть конкретными и связанными с контекстом диалога.`;
      const prompt = promptSource.length > 0
        ? `${baseInstruction}\n\nИстория диалога:\n${contextTail}\n\nЧерновик пользователя: ${promptSource}`
        : `${baseInstruction}\n\nИстория диалога:\n${contextTail}`;

      setIsAiSuggestLoading(true);
      try {
        const data = await apiClient.request<{ response?: string; data?: { response?: string } }>("/ai/assistant", {
          method: "POST",
          body: JSON.stringify({ message: prompt }),
        });
        const responseText = data.response ?? data.data?.response ?? "";
        const variants = responseText
          .split("\n")
          .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
          .filter(Boolean)
          .slice(0, 3);

        setAiSuggestions(
          variants.length > 0
            ? variants
            : [
              "Согласен, давайте уточним сроки и этапы.",
              "Спасибо, подготовлю план и вернусь с деталями.",
              "Предлагаю зафиксировать этап и перейти к старту.",
            ],
        );
      } catch {
        setAiSuggestions([]);
      } finally {
        setIsAiSuggestLoading(false);
      }
    }, 700);

    return () => {
      if (aiSuggestTimer.current) {
        window.clearTimeout(aiSuggestTimer.current);
      }
    };
  }, [messageText, messages, role, selectedConversation, selectedId, showAISuggestions, userId]);

  const groupedMessages = useMemo(() => {
    const groups: Array<{ date: string; items: Message[] }> = [];
    let currentDate = "";
    for (const message of messages) {
      const dateLabel = formatDateLabel(message.created_at);
      if (dateLabel !== currentDate) {
        currentDate = dateLabel;
        groups.push({ date: dateLabel, items: [] });
      }
      groups[groups.length - 1]?.items.push(message);
    }
    return groups;
  }, [messages]);

  const isLockedByFirstResponseRule = useMemo(() => {
    if (!selectedConversation || role !== "freelancer") return false;
    const hasFreelancerMessage = messages.some((message) => message.author_id === selectedConversation.freelancer_id);
    const hasClientMessage = messages.some((message) => message.author_id === selectedConversation.client_id);
    return hasFreelancerMessage && !hasClientMessage;
  }, [messages, role, selectedConversation]);

  const isChatClosed = relatedOrder?.status === "completed" || relatedOrder?.status === "cancelled";
  const composeLocked = isLockedByFirstResponseRule || isChatClosed;

  const reviewedIdForOrder =
    userId && selectedConversation
      ? userId === selectedConversation.client_id
        ? selectedConversation.freelancer_id
        : selectedConversation.client_id
      : "";

  const myOrderReview = useMemo(
    () => (userId ? orderReviews.find((review) => review.reviewer_id === userId) : undefined),
    [orderReviews, userId],
  );
  const peerOrderReview = useMemo(
    () => (userId ? orderReviews.find((review) => review.reviewer_id !== userId) : undefined),
    [orderReviews, userId],
  );

  useEffect(() => {
    setReviewRating(0);
    setReviewComment("");
  }, [selectedId, orderIdForReview]);

  const filteredConversations = useMemo(() => {
    const list = conversations ?? [];
    const query = conversationSearch.trim().toLowerCase();
    if (!query) return list;
    return list.filter((conversation) => {
      const participant = conversation.other_user?.display_name?.toLowerCase() ?? "";
      const orderTitle = conversation.order_title?.toLowerCase() ?? "";
      const preview = conversation.last_message?.content?.toLowerCase() ?? "";
      return participant.includes(query) || orderTitle.includes(query) || preview.includes(query);
    });
  }, [conversationSearch, conversations]);

  const galleryItems = useMemo(() => {
    const urls: string[] = [];
    for (const message of messages) {
      for (const attachment of message.attachments ?? []) {
        const fileType = getAttachmentFileType(attachment) ?? "";
        if (!fileType.startsWith("image/")) continue;
        const url = toMediaUrl(getAttachmentFilePath(attachment));
        if (!url) continue;
        urls.push(url);
      }
    }
    return urls;
  }, [messages]);

  const acceptedProposal = useMemo(
    () => (allProposalsData?.items ?? []).find(
      (proposal) => proposal.order_id === selectedConversation?.order_id && proposal.status === "accepted",
    ),
    [allProposalsData, selectedConversation?.order_id],
  );

  const executorConversation = useMemo(
    () => acceptedProposal
      ? (conversations ?? []).find(
        (conversation) => conversation.order_id === selectedConversation?.order_id && conversation.freelancer_id === acceptedProposal.freelancer_id,
      )
      : undefined,
    [acceptedProposal, conversations, selectedConversation?.order_id],
  );

  const executorName = acceptedProposal?.freelancer_name
    ?? executorConversation?.other_user?.display_name
    ?? "Исполнитель";
  const executorPhotoUrl = executorConversation?.other_user?.photo_url;

  const handleSelectConversation = (conversationId: string) => {
    setSelectedId(conversationId);
    setShowList(false);
    setReplyToMessage(null);
    setUploadedMedia([]);
  };

  const handleSend = () => {
    if (!selectedId) return;
    if (composeLocked) return;
    if (!messageText.trim() && uploadedMedia.length === 0) return;

    const payload: { content: string; parent_message_id?: string; attachment_ids?: string[] } = {
      content: messageText.trim(),
    };

    if (replyToMessage?.id) payload.parent_message_id = replyToMessage.id;
    if (uploadedMedia.length > 0) payload.attachment_ids = uploadedMedia.map((item) => item.id);

    sendMessage.mutate(payload);
    setMessageText("");
    setReplyToMessage(null);
    setUploadedMedia([]);
    typingPublisher?.setTyping(false);
  };

  const handleInputChange = (value: string) => {
    setMessageText(value);
    if (!typingPublisher || !selectedId) return;
    typingPublisher.setTyping(value.trim().length > 0);
    if (typingStopTimer.current) {
      window.clearTimeout(typingStopTimer.current);
    }
    typingStopTimer.current = window.setTimeout(() => typingPublisher.setTyping(false), 3000);
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploading(true);
    try {
      const files = Array.from(fileList).slice(0, 5);
      const uploaded = await Promise.all(files.map((file) => mediaApi.uploadPhoto(file)));
      setUploadedMedia((prev) => [...prev, ...uploaded]);
      notify.success({ title: "Файл загружен", message: uploaded.length > 1 ? `Файлов: ${uploaded.length}` : "Можно отправлять сообщение." });
    } catch (error) {
      notify.error({
        title: "Не удалось загрузить файл",
        message: error instanceof Error ? error.message : "Проверьте формат и размер файла.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCompleteInChat = async () => {
    const orderId = selectedConversation?.order_id;
    if (!orderId) return;
    try {
      await apiClient.request<unknown>(`/orders/${orderId}/complete-by-freelancer`, { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["orders", orderId] });
      notify.success({ title: "Работа отправлена на приёмку" });
    } catch (e) {
      notify.error({ title: "Не удалось завершить", ...(e instanceof Error && { message: e.message }) });
    }
  };

  return (
    <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--bg-1)] shadow-[var(--shadow-xl)]">
      <div
        className={cn(
          "grid h-[calc(100vh-11.25rem)] min-h-[720px] grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)]",
          selectedConversation?.order_id ? "2xl:grid-cols-[300px_minmax(0,1fr)_340px]" : "2xl:grid-cols-[300px_minmax(0,1fr)]",
        )}
      >
        <section
          className={cn(
            "border-r border-[var(--line)] bg-[var(--bg-1)]",
            !showList && selectedConversation ? "hidden lg:flex" : "flex",
            "flex-col",
          )}
        >
          <div className="border-b border-[var(--line)] p-4">
            <div className="mb-3 text-[15px] font-bold tracking-[-0.01em] text-[var(--fg-0)]">Диалоги</div>
            <div className="relative">
              <IconSearch size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-3)]" />
              <FilkaInput
                placeholder="Поиск"
                value={conversationSearch}
                onChange={(event) => setConversationSearch(event.target.value)}
                className="h-[36px] pl-9 text-[13px]"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {(() => {
              const nonRejected = filteredConversations.filter((c) => {
                const key = c.order_id ? `${c.order_id}:${c.freelancer_id}` : "";
                return proposalStatusMap.get(key) !== "rejected";
              });
              const rejectedConversations = filteredConversations.filter((c) => {
                const key = c.order_id ? `${c.order_id}:${c.freelancer_id}` : "";
                return proposalStatusMap.get(key) === "rejected";
              });

              const primaryConversations = nonRejected.filter((c) => {
                if (role !== "client" || !c.order_id) return true;
                const acceptedFl = acceptedFreelancerByOrderId.get(c.order_id);
                if (!acceptedFl) return true;
                return c.freelancer_id === acceptedFl;
              });

              const otherResponderConversations = nonRejected.filter((c) => {
                if (role !== "client" || !c.order_id) return false;
                const acceptedFl = acceptedFreelancerByOrderId.get(c.order_id);
                if (!acceptedFl) return false;
                return c.freelancer_id !== acceptedFl;
              });

              const renderConversation = (conversation: Conversation) => {
                const conversationKey = conversation.order_id ? `${conversation.order_id}:${conversation.freelancer_id}` : "";
                const proposalStatus = conversationKey ? proposalStatusMap.get(conversationKey) : undefined;
                const isAccepted = proposalStatus === "accepted";
                const isActive = selectedId === conversation.id;

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => handleSelectConversation(conversation.id)}
                    className={cn(
                      "flex w-full min-w-0 gap-3 border-b border-[var(--line)] px-4 py-3 text-left transition-colors",
                      isActive ? "bg-[var(--bg-3)]" : "hover:bg-[rgba(255,255,255,0.02)]",
                    )}
                    style={{ borderLeft: isActive ? "2px solid var(--mint-400)" : "2px solid transparent" }}
                  >
                    <AvatarBadge
                      name={conversation.other_user?.display_name ?? conversation.order_title ?? "Диалог"}
                      photoUrl={conversation.other_user?.photo_url}
                      isActive={isAccepted}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13.5px] font-semibold text-[var(--fg-0)]">
                            {conversation.other_user?.display_name ?? conversation.order_title ?? "Диалог"}
                          </div>
                          {getOrderBadge(conversation) ? (
                            <div className="t-mono mt-0.5 truncate text-[10px] text-[var(--mint-400)]">{getOrderBadge(conversation)}</div>
                          ) : null}
                        </div>
                        <div className="text-[10.5px] text-[var(--fg-3)]">
                          {conversation.last_message ? formatTime(conversation.last_message.created_at) : ""}
                        </div>
                      </div>

                      <div className="mt-1 truncate text-[12.5px] text-[var(--fg-2)]">
                        {conversation.last_message
                          ? (conversation.last_message.content || (conversation.last_message.attachments?.length ? "📎 Вложение" : "Сообщение"))
                          : "Нет сообщений"}
                      </div>

                      {isAccepted ? (
                        <div className="mt-2">
                          <FilkaChip className="text-[10px]">Исполнитель подтверждён</FilkaChip>
                        </div>
                      ) : null}
                    </div>

                    {(conversation.unread_count ?? 0) > 0 ? (
                      <div className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--mint-400)] px-1.5 text-[11px] font-bold text-[#05060f]">
                        {conversation.unread_count}
                      </div>
                    ) : null}
                  </button>
                );
              };

              return (
                <>
                  {primaryConversations.map(renderConversation)}

                  {otherResponderConversations.length > 0 ? (
                    <>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 border-b border-[var(--line)] px-4 py-2.5 text-left transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                        onClick={() => setShowOtherResponderChats((prev) => !prev)}
                      >
                        <span className="text-[11px] text-[var(--fg-3)]">
                          Другие отклики · {otherResponderConversations.length}
                        </span>
                        <span className="ml-auto text-[10px] text-[var(--fg-3)]">{showOtherResponderChats ? "▲" : "▼"}</span>
                      </button>
                      {showOtherResponderChats ? otherResponderConversations.map(renderConversation) : null}
                    </>
                  ) : null}

                  {rejectedConversations.length > 0 ? (
                    <>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 border-b border-[var(--line)] px-4 py-2.5 text-left transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                        onClick={() => setShowRejectedChats((prev) => !prev)}
                      >
                        <span className="text-[11px] text-[var(--fg-3)]">
                          Отклонённые · {rejectedConversations.length}
                        </span>
                        <span className="ml-auto text-[10px] text-[var(--fg-3)]">{showRejectedChats ? "▲" : "▼"}</span>
                      </button>
                      {showRejectedChats ? rejectedConversations.map(renderConversation) : null}
                    </>
                  ) : null}

                  {!filteredConversations.length ? (
                    <div className="px-4 py-6 text-[12px] text-[var(--fg-3)]">Диалоги не найдены</div>
                  ) : null}
                </>
              );
            })()}
          </div>
        </section>

        <section
          className={cn(
            "flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[var(--bg-0)]",
            showList && !selectedConversation ? "hidden lg:flex" : "flex",
          )}
        >
          {selectedConversation ? (
            <>
              <div className="flex shrink-0 min-w-0 flex-col gap-1.5 border-b border-[var(--line)] px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowList(true)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-[var(--bg-1)] text-[var(--fg-1)] lg:hidden"
                  >
                    <IconArrowLeft size={16} />
                  </button>

                  <AvatarBadge
                    name={selectedConversation.other_user?.display_name ?? "Собеседник"}
                    photoUrl={selectedConversation.other_user?.photo_url}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-bold tracking-[-0.01em]">
                      {selectedConversation.other_user?.display_name ?? "Собеседник"}
                    </div>
                  </div>

                  <div className="flex max-w-[48%] shrink-0 flex-wrap items-center justify-end gap-2 sm:max-w-none">
                    {relatedOrder &&
                    role === "freelancer" &&
                    relatedOrder.status === "in_progress" &&
                    myChatOrderProposal?.status === "accepted" ? (
                      <FilkaButton size="sm" variant="ghost" startContent={<IconCheck size={13} />} onClick={handleCompleteInChat}>
                        Сдать работу
                      </FilkaButton>
                    ) : null}
                    {relatedOrder && role === "client" && ["in_progress", "completed"].includes(relatedOrder.status) ? (
                      <FilkaButton size="sm" startContent={<IconCheck size={13} />} onClick={() => router.push(`/dashboard/orders/${relatedOrder.id}` as never)}>
                        Принять работу
                      </FilkaButton>
                    ) : null}
                    {getOrderBadge(selectedConversation) ? (
                      <div className="rounded-[8px] border border-[var(--line)] px-2 py-1">
                        <div className="t-mono text-[10.5px] text-[var(--fg-2)]">{getOrderBadge(selectedConversation)}</div>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pl-11 text-[11px] text-[var(--fg-3)] sm:pl-11">
                  <span className="dot-live h-[6px] w-[6px] shrink-0" />
                  <span className="min-w-0">{typingUsers.length > 0 ? "собеседник печатает…" : "онлайн"}</span>
                </div>
              </div>

              <div ref={scrollContainerRef} className="relative min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7">
                <div className="flex flex-col gap-3">
                  {relatedOrder ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/dashboard/orders/${relatedOrder.id}`)}
                      className="mx-auto inline-flex items-center gap-2 rounded-full border border-[rgba(102,58,243,0.18)] bg-[rgba(102,58,243,0.08)] px-4 py-2 text-[12px] text-[var(--mint-300)]"
                    >
                      <IconSpark size={12} />
                      AI проверил контекст заказа и подсветил статус сделки
                    </button>
                  ) : null}

                  {groupedMessages.map((group) => (
                    <div key={group.date} className="space-y-3">
                      <div className="my-1 text-center">
                        <span className="t-caption rounded-full bg-[var(--bg-0)] px-3 py-1 text-[var(--fg-3)]">
                          {group.date}
                        </span>
                      </div>

                      {group.items.map((message) => {
                        const isOwn = message.author_id === userId;
                        const mediaItems = message.attachments ?? [];
                        const reactionCounts = new Map<string, number>();
                        for (const reaction of message.reactions ?? []) {
                          reactionCounts.set(reaction.emoji, (reactionCounts.get(reaction.emoji) ?? 0) + 1);
                        }

                        return (
                          <div key={message.id} className={cn("flex min-w-0", isOwn ? "justify-end" : "justify-start")}>
                            <div className={cn("w-full min-w-0 max-w-[540px]", isOwn ? "items-end" : "items-start")}>
                              <div
                                className={cn(
                                  "rounded-[14px] border px-4 py-3",
                                  isOwn
                                    ? "border-[rgba(102,58,243,0.22)] bg-[rgba(102,58,243,0.14)] text-[var(--fg-0)]"
                                    : "border-[var(--line)] bg-[var(--bg-2)] text-[var(--fg-0)]",
                                )}
                                style={{ borderTopRightRadius: isOwn ? 4 : 14, borderTopLeftRadius: isOwn ? 14 : 4 }}
                              >
                                {message.parent_message ? (
                                  <div className="mb-2 rounded-[10px] border border-[var(--line)] bg-[rgba(0,0,0,0.12)] px-3 py-2 text-[12px] text-[var(--fg-2)]">
                                    Ответ на: {message.parent_message.content.slice(0, 80)}
                                  </div>
                                ) : null}

                                {message.content ? (
                                  <p className="whitespace-pre-wrap text-[14px] leading-[1.55]">{message.content}</p>
                                ) : mediaItems.length === 0 ? (
                                  <p className="text-[14px] italic text-[var(--fg-3)]">Пустое сообщение</p>
                                ) : null}

                                {mediaItems.length > 0 ? (
                                  <div className="mt-3 grid max-w-full grid-cols-1 gap-2 overflow-hidden sm:grid-cols-2">
                                    {mediaItems.map((attachment) => {
                                      const url = toMediaUrl(getAttachmentFilePath(attachment));
                                      const isImage = getAttachmentFileType(attachment)?.startsWith("image/");

                                      if (!url) return null;

                                      return isImage ? (
                                        <img
                                          key={attachment.id}
                                          src={url}
                                          alt="attachment"
                                          loading="lazy"
                                          decoding="async"
                                          className="max-h-[min(40vh,280px)] w-full max-w-full rounded-[12px] border border-[var(--line)] object-cover"
                                        />
                                      ) : (
                                        <a
                                          key={attachment.id}
                                          href={url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="flex items-center gap-3 rounded-[12px] border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-3 text-left"
                                        >
                                          <div className="grid h-10 w-10 place-items-center rounded-[10px] bg-[var(--bg-3)] text-[var(--mint-300)]">
                                            <IconFile size={16} />
                                          </div>
                                          <div className="min-w-0">
                                            <div className="truncate text-[13px] font-medium text-[var(--fg-0)]">Файл</div>
                                            <div className="text-[11px] text-[var(--fg-3)]">
                                              {(getAttachmentFileType(attachment) ?? "file").split("/").pop()?.toUpperCase() ?? "FILE"}
                                            </div>
                                          </div>
                                        </a>
                                      );
                                    })}
                                  </div>
                                ) : null}
                              </div>

                              <div className={cn("mt-1.5 flex flex-wrap items-center gap-2", isOwn ? "justify-end" : "justify-start")}>
                                {reactionCounts.size > 0 ? (
                                  [...reactionCounts.entries()].map(([emoji, count]) => (
                                    <button
                                      key={`${message.id}:count:${emoji}`}
                                      type="button"
                                      onClick={() => removeReaction.mutate(message.id)}
                                      className="rounded-full border border-[var(--line)] bg-[var(--bg-2)] px-2 py-1 text-[11px] text-[var(--fg-1)]"
                                    >
                                      {emoji} {count}
                                    </button>
                                  ))
                                ) : null}

                                {QUICK_REACTIONS.map((emoji) => {
                                  const reacted = (message.reactions ?? []).some(
                                    (reaction) => reaction.emoji === emoji && reaction.user_id === userId,
                                  );

                                  return (
                                    <button
                                      key={`${message.id}:${emoji}`}
                                      type="button"
                                      onClick={() => (
                                        reacted
                                          ? removeReaction.mutate(message.id)
                                          : addReaction.mutate({ messageId: message.id, emoji })
                                      )}
                                      className={cn(
                                        "rounded-full px-2 py-1 text-[11px] transition-colors",
                                        reacted
                                          ? "border border-[rgba(102,58,243,0.22)] bg-[rgba(102,58,243,0.14)]"
                                          : "border border-[var(--line)] bg-[var(--bg-2)] hover:bg-[var(--bg-3)]",
                                      )}
                                      aria-label={`Reaction ${emoji}`}
                                    >
                                      {emoji}
                                    </button>
                                  );
                                })}

                                <button
                                  type="button"
                                  onClick={() => setReplyToMessage({ id: message.id, content: message.content })}
                                  className="text-[var(--fg-3)] transition-colors hover:text-[var(--fg-1)]"
                                >
                                  <IconArrowLeft size={13} />
                                </button>

                                <div className="ml-1 flex items-center gap-1 text-[11px] text-[var(--fg-3)]">
                                  <span>{formatTime(message.created_at)}</span>
                                  {isOwn ? (
                                    readByPeerMessageIds.has(message.id) ? (
                                      <IconCheck size={12} className="text-[var(--mint-300)]" />
                                    ) : (
                                      <IconCheck size={12} />
                                    )
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {typingUsers.length > 0 ? (
                    <div className="flex justify-start">
                      <div className="flex w-[52px] items-center justify-center gap-1 rounded-[12px] border border-[var(--line)] bg-[var(--bg-2)] px-4 py-3">
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                      </div>
                    </div>
                  ) : null}

                  <div ref={messagesEndRef} />
                </div>

                {showScrollBtn ? (
                  <button
                    type="button"
                    onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
                    className="sticky bottom-3 left-1/2 grid h-10 w-10 -translate-x-1/2 place-items-center rounded-full border border-[rgba(102,58,243,0.22)] bg-[rgba(10,11,20,0.82)] text-[var(--mint-200)] shadow-[var(--shadow-md)]"
                  >
                    <IconArrowDown size={16} />
                  </button>
                ) : null}
              </div>

              <div className="border-t border-[var(--line)] bg-[var(--bg-0)] px-4 py-3 sm:px-5 shrink-0">
                {relatedOrder?.status === "completed" ? (
                  <div className="mb-3 rounded-[12px] border border-[rgba(54,211,153,0.25)] bg-[rgba(54,211,153,0.06)] px-4 py-2.5 text-[12px] text-[var(--mint-300)]">
                    ✓ Заказ завершён. Чат доступен только для просмотра истории.
                  </div>
                ) : relatedOrder?.status === "cancelled" ? (
                  <div className="mb-3 rounded-[12px] border border-[rgba(248,113,113,0.25)] bg-[rgba(248,113,113,0.06)] px-4 py-2.5 text-[12px] text-[var(--err)]">
                    Заказ отменён.
                  </div>
                ) : isLockedByFirstResponseRule ? (
                  <div className="mb-3 rounded-[12px] border border-[rgba(245,158,11,0.22)] bg-[rgba(245,158,11,0.08)] px-4 py-3 text-[12px] text-[#fcd34d]">
                    Ожидаем ответа заказчика. Новые сообщения временно недоступны.
                  </div>
                ) : null}

                {showOrderReviewPanel && selectedConversation && orderIdForReview && userId && reviewedIdForOrder ? (
                  <div className="mb-3 space-y-3 rounded-[14px] border border-[var(--line)] bg-[var(--bg-2)] px-4 py-3">
                    <div className="text-[13px] font-semibold text-[var(--fg-0)]">Оцените сделку</div>

                    {!canReviewFetched || !orderReviewsFetched ? (
                      <p className="text-[11px] text-[var(--fg-3)]">Загрузка…</p>
                    ) : (
                      <>
                        {peerOrderReview ? (
                          <div className="rounded-[12px] border border-[var(--line)] bg-[var(--bg-1)] px-3 py-2.5">
                            <div className="mb-1 text-[11px] font-medium text-[var(--fg-2)]">
                              Отзыв от {selectedConversation.other_user?.display_name ?? "собеседника"}
                            </div>
                            <div className="mb-1 flex items-center gap-0.5">
                              {Array.from({ length: 5 }, (_, index) =>
                                index < peerOrderReview.rating ? (
                                  <IconStarFilled key={index} size={16} className="text-[var(--accent-sun)]" />
                                ) : (
                                  <IconStar key={index} size={16} className="text-[var(--fg-3)]" />
                                ),
                              )}
                            </div>
                            {peerOrderReview.comment ? (
                              <p className="text-[12px] leading-snug text-[var(--fg-1)]">{peerOrderReview.comment}</p>
                            ) : null}
                          </div>
                        ) : null}

                        {canLeaveReview && !myOrderReview ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1" role="group" aria-label="Оценка от 1 до 5">
                              {Array.from({ length: 5 }, (_, index) => {
                                const value = index + 1;
                                const active = reviewRating >= value;
                                return (
                                  <button
                                    key={value}
                                    type="button"
                                    className="grid h-9 w-9 place-items-center rounded-[10px] text-[var(--accent-sun)] transition-colors hover:bg-[var(--bg-3)]"
                                    onClick={() => setReviewRating(value)}
                                    aria-label={`${value} из 5`}
                                  >
                                    {active ? <IconStarFilled size={22} /> : <IconStar size={22} className="text-[var(--fg-3)]" />}
                                  </button>
                                );
                              })}
                            </div>
                            <textarea
                              value={reviewComment}
                              onChange={(event) => setReviewComment(event.target.value)}
                              placeholder="Комментарий (необязательно)"
                              rows={2}
                              className="w-full resize-none rounded-[12px] border border-[var(--line)] bg-[var(--bg-0)] px-3 py-2 text-[13px] text-[var(--fg-0)] outline-none placeholder:text-[var(--fg-3)]"
                            />
                            <FilkaButton
                              size="sm"
                              className="w-full sm:w-auto"
                              disabled={reviewRating < 1 || createOrderReview.isPending}
                              onClick={() => {
                                if (!orderIdForReview || !userId || !reviewedIdForOrder || reviewRating < 1) return;
                                createOrderReview.mutate(
                                  {
                                    orderId: orderIdForReview,
                                    reviewerId: userId,
                                    input: {
                                      order_id: orderIdForReview,
                                      reviewed_id: reviewedIdForOrder,
                                      rating: reviewRating,
                                      comment: reviewComment.trim() ? reviewComment.trim() : null,
                                    },
                                  },
                                  {
                                    onSuccess: () => {
                                      notify.success({ title: "Спасибо!", message: "Отзыв сохранён" });
                                      setReviewRating(0);
                                      setReviewComment("");
                                    },
                                    onError: (err) => {
                                      notify.error({
                                        title: "Не удалось отправить отзыв",
                                        message: err instanceof ApiError ? err.message : "Попробуйте ещё раз",
                                      });
                                    },
                                  },
                                );
                              }}
                            >
                              {createOrderReview.isPending ? "Отправка…" : "Отправить отзыв"}
                            </FilkaButton>
                          </div>
                        ) : null}

                        {myOrderReview ? (
                          <div className="rounded-[12px] border border-[rgba(102,58,243,0.2)] bg-[rgba(102,58,243,0.06)] px-3 py-2.5">
                            <div className="mb-1 text-[11px] font-medium text-[var(--fg-2)]">Ваш отзыв</div>
                            <div className="mb-1 flex items-center gap-0.5">
                              {Array.from({ length: 5 }, (_, index) =>
                                index < myOrderReview.rating ? (
                                  <IconStarFilled key={index} size={16} className="text-[var(--accent-sun)]" />
                                ) : (
                                  <IconStar key={index} size={16} className="text-[var(--fg-3)]" />
                                ),
                              )}
                            </div>
                            {myOrderReview.comment ? (
                              <p className="text-[12px] leading-snug text-[var(--fg-1)]">{myOrderReview.comment}</p>
                            ) : null}
                          </div>
                        ) : null}

                        {!canLeaveReview && !myOrderReview && !peerOrderReview ? (
                          <p className="text-[12px] text-[var(--fg-2)]">Вы уже оставили отзыв или оценка сейчас недоступна.</p>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}

                {replyToMessage ? (
                  <div className="mb-3 flex items-center justify-between gap-3 rounded-[12px] border border-[var(--line)] bg-[var(--bg-2)] px-4 py-3 text-[12px] text-[var(--fg-2)]">
                    <span className="truncate">Ответ на: {replyToMessage.content.slice(0, 100)}</span>
                    <button type="button" className="text-[var(--fg-3)] hover:text-[var(--fg-1)]" onClick={() => setReplyToMessage(null)}>
                      ×
                    </button>
                  </div>
                ) : null}

                {uploadedMedia.length > 0 ? (
                  <div className="mb-2 max-w-full overflow-x-auto overflow-y-hidden [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
                    <div className="flex w-max max-w-full flex-nowrap gap-2 pb-1">
                    {uploadedMedia.map((item) => {
                      const isImage = item.file_type?.startsWith("image/");
                      const url = toMediaUrl(item.file_path);

                      return (
                        <div key={item.id} className="group relative shrink-0">
                          {isImage && url ? (
                            <img src={url} alt="preview" className="h-14 w-14 rounded-[10px] border border-[var(--line)] object-cover sm:h-16 sm:w-16" />
                          ) : (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] border border-[var(--line)] bg-[var(--bg-2)] px-1 text-center text-[9px] text-[var(--fg-2)] sm:h-16 sm:w-16 sm:text-[10px]">
                              {item.file_type?.split("/").pop()?.toUpperCase() ?? "FILE"}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setUploadedMedia((prev) => prev.filter((media) => media.id !== item.id))}
                            className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[var(--err)] text-[11px] text-white shadow-sm"
                            aria-label="Удалить вложение"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-[16px] border border-[var(--line-2)] bg-[var(--bg-1)] p-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="grid h-9 w-9 place-items-center rounded-[12px] text-[var(--fg-2)] transition-colors hover:bg-[var(--bg-3)] hover:text-[var(--fg-0)]"
                      disabled={isUploading || composeLocked}
                    >
                      <IconPaperclip size={17} />
                    </button>

                    <textarea
                      placeholder={`Напишите ${selectedConversation.other_user?.display_name ?? "собеседнику"}…`}
                      value={messageText}
                      onChange={(event) => handleInputChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          handleSend();
                        }
                      }}
                      disabled={composeLocked}
                      rows={1}
                      className="min-h-10 flex-1 resize-none border-none bg-transparent px-0 py-2 text-[14px] text-[var(--fg-0)] outline-none placeholder:text-[var(--fg-3)]"
                    />

                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                      onChange={(event) => {
                        void handleUpload(event.target.files);
                        event.target.value = "";
                      }}
                      disabled={isUploading || composeLocked}
                    />

                    {selectedConversation.order_id ? (
                      <FilkaButton
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 px-0"
                        onClick={() => setShowAISuggestions((value) => !value)}
                        disabled={composeLocked}
                        title={showAISuggestions ? "Скрыть подсказки ИИ" : "Показать подсказки ИИ"}
                      >
                        <IconSpark size={16} />
                      </FilkaButton>
                    ) : null}

                    <FilkaButton
                      size="sm"
                      className="h-9 w-9 px-0"
                      loading={sendMessage.isPending}
                      onClick={handleSend}
                      disabled={composeLocked || (!messageText.trim() && uploadedMedia.length === 0)}
                    >
                      {!sendMessage.isPending ? <IconSend size={16} /> : null}
                    </FilkaButton>
                  </div>
                </div>

                {selectedConversation.order_id && showAISuggestions ? (
                  <div className="mt-2 max-h-[min(40vh,220px)] space-y-2 overflow-y-auto overscroll-contain rounded-[14px] border border-[var(--line)] bg-[var(--bg-2)] p-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
                    <div className="flex items-center justify-between gap-2 px-1 pt-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--fg-3)]">ИИ · варианты ответа</span>
                      <IconSpark size={12} className="shrink-0 text-[var(--mint-300)] opacity-80" />
                    </div>
                    {isAiSuggestLoading ? (
                      <div className="space-y-2 px-1 pb-1">
                        {[1, 2, 3].map((row) => (
                          <div key={row} className="h-[52px] animate-pulse rounded-[12px] bg-[rgba(102,58,243,0.08)]" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1.5 px-1 pb-1">
                        {aiSuggestions.map((suggestion, index) => (
                          <button
                            key={`${index}-${suggestion.slice(0, 48)}`}
                            type="button"
                            disabled={composeLocked}
                            onClick={() => setMessageText(suggestion)}
                            className="flex w-full gap-2.5 rounded-[12px] border border-[var(--line)] bg-[var(--bg-1)] px-3 py-2.5 text-left text-[13px] leading-snug text-[var(--fg-1)] transition-colors hover:border-[rgba(102,58,243,0.35)] hover:bg-[rgba(102,58,243,0.06)] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <IconSpark size={14} className="mt-0.5 shrink-0 text-[var(--mint-300)]" />
                            <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">{suggestion}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="mb-2 text-[16px] font-semibold text-[var(--fg-1)]">Выберите диалог</div>
              <div className="max-w-[280px] text-[13px] leading-[1.6] text-[var(--fg-3)]">
                Список слева показывает все активные сделки и личные сообщения.
              </div>
            </div>
          )}
        </section>

        {selectedConversation?.order_id ? (
          <aside className="hidden min-h-0 min-w-0 overflow-y-auto border-l border-[var(--line)] bg-[var(--bg-1)] p-4 2xl:flex 2xl:flex-col 2xl:gap-4">
            <div>
              <div className="t-eyebrow mb-2">ЗАКАЗ</div>
              <div className="text-[15px] font-bold leading-[1.35] tracking-[-0.01em]">
                {relatedOrder?.title ?? selectedConversation.order_title ?? "Без привязки к заказу"}
              </div>
              {getOrderBadge(selectedConversation) ? (
                <div className="t-mono mt-2 text-[11px] text-[var(--mint-400)]">{getOrderBadge(selectedConversation)}</div>
              ) : null}
            </div>

            <FilkaCard className="relative overflow-hidden p-5" glow>
              <div
                className="pointer-events-none absolute inset-auto right-[-32px] top-[-18px] h-[120px] w-[120px] rounded-full border border-[rgba(102,58,243,0.18)] opacity-60"
              />
              <div className="pointer-events-none absolute right-4 top-5 grid h-[62px] w-[62px] place-items-center rounded-full bg-[rgba(102,58,243,0.10)] text-[var(--mint-300)]">
                <IconLock size={22} />
              </div>
              <div className="mb-3 flex items-center gap-2">
                <IconShield size={16} className="text-[var(--mint-300)]" />
                <div className="t-caption text-[var(--mint-300)]">
                  {chatEscrow ? "ЭСКРОУ · СУММА" : "БЮДЖЕТ · ПО ЗАКАЗУ"}
                </div>
              </div>
              <div className="text-[30px] font-bold tracking-[-0.02em]">
                {chatEscrow
                  ? formatCurrency(chatEscrow.amount)
                  : formatCurrency(role === "client" ? relatedOrder?.budget_max : relatedOrder?.budget_min)}
              </div>
              <div className="mt-1 text-[12px] text-[var(--fg-2)]">
                {chatEscrow
                  ? chatEscrow.status === "held"
                    ? "заморожено по сделке"
                    : chatEscrow.status === "released"
                      ? "выплачено"
                      : chatEscrow.status === "refunded"
                        ? "возвращено"
                        : chatEscrow.status
                  : role === "client"
                    ? "по заказу (эскроу после принятия отклика)"
                    : "ориентир по заказу"}
              </div>

              <div className="mt-5 flex gap-2">
                <FilkaButton
                  size="sm"
                  className="flex-1"
                  startContent={<IconCheck size={13} />}
                  onClick={() => selectedConversation.order_id ? router.push(`/dashboard/orders/${selectedConversation.order_id}`) : undefined}
                >
                  К заказу
                </FilkaButton>
                <FilkaButton
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/dashboard/notifications")}
                >
                  Спор
                </FilkaButton>
              </div>
            </FilkaCard>

            {relatedOrder ? (
              <FilkaCard className="p-4">
                <div className="t-eyebrow mb-3">СТАТУС СДЕЛКИ</div>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[var(--fg-3)]">Статус</span>
                    <FilkaChip>{statusLabelMap[relatedOrder.status] ?? relatedOrder.status}</FilkaChip>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[var(--fg-3)]">Бюджет</span>
                    <span className="text-[13px] font-semibold">{formatCurrency(relatedOrder.budget_min)} - {formatCurrency(relatedOrder.budget_max)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[var(--fg-3)]">Дедлайн</span>
                    <span className="text-[13px] font-semibold">
                      {relatedOrder.deadline ? new Date(relatedOrder.deadline).toLocaleDateString("ru-RU") : "—"}
                    </span>
                  </div>
                </div>
              </FilkaCard>
            ) : null}

            {role === "client" && selectedConversation.order_id ? (
              <FilkaCard className="p-4">
                <div className="t-eyebrow mb-3">ИСПОЛНИТЕЛЬ</div>
                {acceptedProposal ? (
                  <>
                    <div className="flex items-center gap-3">
                      <AvatarBadge name={executorName} photoUrl={executorPhotoUrl} />
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-semibold">{executorName}</div>
                        <div className="text-[12px] text-[var(--fg-3)]">подтверждён для заказа</div>
                      </div>
                    </div>
                    <FilkaButton
                      variant="ghost"
                      size="sm"
                      className="mt-3 w-full"
                      onClick={() => router.push(`/dashboard/orders/${selectedConversation.order_id}`)}
                    >
                      Перейти к заказу
                    </FilkaButton>
                  </>
                ) : (
                  <>
                    <div className="text-[12.5px] leading-[1.55] text-[var(--fg-2)]">
                      Исполнитель ещё не закреплён. Выберите лучший отклик прямо в карточке заказа.
                    </div>
                    <FilkaButton
                      size="sm"
                      className="mt-3 w-full"
                      onClick={() => router.push(`/dashboard/orders/${selectedConversation.order_id}`)}
                    >
                      Выбрать исполнителя
                    </FilkaButton>
                  </>
                )}
              </FilkaCard>
            ) : null}

            <FilkaCard className="p-4">
              <div className="t-eyebrow mb-3">ФАЙЛЫ И МЕДИА</div>
              {galleryItems.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {galleryItems.slice(0, 8).map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt="chat-media"
                      loading="lazy"
                      decoding="async"
                      className="rounded-[12px] border border-[var(--line)] object-cover"
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {(messages.flatMap((message) => message.attachments ?? []).slice(0, 4)).map((attachment) => {
                    const fileType = getAttachmentFileType(attachment) ?? "file";
                    const filePath = getAttachmentFilePath(attachment);
                    const url = toMediaUrl(filePath);

                    return url ? (
                      <a
                        key={attachment.id}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 border-t border-[var(--line)] py-2 first:border-t-0"
                      >
                        <div className="grid h-8 w-8 place-items-center rounded-[8px] bg-[var(--bg-3)] text-[var(--mint-300)]">
                          <IconFile size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium">Вложение</div>
                          <div className="text-[11px] text-[var(--fg-3)]">
                            {fileType.split("/").pop()?.toUpperCase() ?? "FILE"} {formatFileSize(attachment.file_size)}
                          </div>
                        </div>
                      </a>
                    ) : null;
                  })}
                  {messages.flatMap((message) => message.attachments ?? []).length === 0 ? (
                    <div className="text-[12px] text-[var(--fg-3)]">Файлы пока не загружены</div>
                  ) : null}
                </div>
              )}
            </FilkaCard>

            <FilkaCard className="p-4">
              <div className="t-eyebrow mb-3">БЫСТРЫЕ ДЕЙСТВИЯ</div>
              <div className="grid gap-2">
                <FilkaButton
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  startContent={<IconSpark size={13} />}
                  onClick={() => setMessageText("Отправляю обновлённое ТЗ и предлагаю зафиксировать следующий этап.")}
                >
                  Отправить ТЗ
                </FilkaButton>
                <FilkaButton
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  startContent={<IconPaperclip size={13} />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Загрузить файл
                </FilkaButton>
              </div>
            </FilkaCard>
          </aside>
        ) : null}
      </div>
    </div>
  );
};
