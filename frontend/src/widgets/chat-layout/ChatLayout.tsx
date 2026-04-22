"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Button, Chip, Input, ScrollShadow } from "@heroui/react";
import { ArrowDown, ArrowLeft, Check, CheckCheck, ImagePlus, Reply, Search, Send, Smile, Sparkles, UserCheck } from "lucide-react";
import { useMyConversations, useConversationMessages } from "@/features/conversation-list";
import { useSendMessage } from "@/features/chat-compose";
import { useAddReaction, useRemoveReaction } from "@/features/chat-reactions";
import { createTypingPublisher } from "@/features/chat-typing";
import { markConversationRead } from "@/features/chat-read";
import { useSessionStore } from "@/shared/store/session.store";
import { wsManager } from "@/shared/ws/manager";
import { mediaApi } from "@/shared/api/endpoints/media";
import { env } from "@/shared/config/env";
import { apiClient } from "@/shared/api/client";
import { useOrderDetail } from "@/features/order-management";
import { useMyProposals } from "@/features/proposal-management";
import { useRouter } from "next/navigation";
import type { Message, MessageAttachment } from "@/shared/api/endpoints/conversations";

interface ChatLayoutProps {
  readonly initialConversationId?: string;
}

const QUICK_REACTIONS = ["👍", "🔥", "✅", "👏", "🤝", "🙂"] as const;

const formatDateLabel = (dateStr: string): string => {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Сегодня";
  if (d.toDateString() === yesterday.toDateString()) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
};

const formatTime = (dateStr: string): string =>
  new Date(dateStr).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

const toMediaUrl = (filePath?: string): string | null => {
  if (!filePath) return null;
  if (filePath.startsWith("http")) return filePath;
  // Static files are served at /media/ (not /api/media/photos/)
  const apiOrigin = new URL(env.API_URL).origin;
  if (filePath.startsWith("/")) return `${apiOrigin}${filePath}`;
  // Relative paths (e.g. "uuid/file.webp") → /media/uuid/file.webp
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
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isAiSuggestLoading, setIsAiSuggestLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingStopTimer = useRef<number | null>(null);
  const aiSuggestTimer = useRef<number | null>(null);
  const userId = useSessionStore((s) => s.userId);
  const role = useSessionStore((s) => s.role);
  const router = useRouter();

  const { data: conversations } = useMyConversations();
  const { data: messagesData } = useConversationMessages(selectedId);
  const sendMessage = useSendMessage(selectedId);
  const addReaction = useAddReaction(selectedId);
  const removeReaction = useRemoveReaction(selectedId);
  const { data: allProposalsData } = useMyProposals(role === "client" ? "client" : "freelancer");

  const messages = useMemo(() => sortMessagesByDate(messagesData?.items ?? []), [messagesData?.items]);
  const selectedConversation = conversations?.find((conversation) => conversation.id === selectedId);
  const { data: relatedOrder } = useOrderDetail(selectedConversation?.order_id ?? "");

  // Build a lookup: conversationKey (orderId:freelancerId) -> proposal status
  const proposalStatusMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!allProposalsData?.items) return map;
    for (const proposal of allProposalsData.items) {
      map.set(`${proposal.order_id}:${proposal.freelancer_id}`, proposal.status);
    }
    return map;
  }, [allProposalsData]);
  const typingPublisher = useMemo(
    () => (selectedId ? createTypingPublisher(selectedId) : null),
    [selectedId]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

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
        setReadByPeerMessageIds((prev) => new Set(prev).add(payload.message_id as string));
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
    if (!selectedId || !showAISuggestions) return;
    if (aiSuggestTimer.current) {
      window.clearTimeout(aiSuggestTimer.current);
    }

    aiSuggestTimer.current = window.setTimeout(async () => {
      const promptSource = messageText.trim();
      const contextTail = messages
        .slice(-6)
        .map((msg) => {
          const authorLabel = msg.author_id === userId ? "Я" : (selectedConversation?.other_user?.display_name ?? "Собеседник");
          return `${authorLabel}: ${msg.content}`;
        })
        .filter(Boolean)
        .join("\n");

      const orderContext = selectedConversation?.order_title
        ? `Тема обсуждения (заказ): "${selectedConversation.order_title}". `
        : "";
      const roleLabel = role === "client" ? "заказчик" : "исполнитель";

      const baseInstruction = `${orderContext}Ты помогаешь ${roleLabel === "заказчик" ? "заказчику" : "исполнителю"} на фриланс-платформе. Сгенерируй 3 коротких, уместных варианта ответа в чате (каждый на отдельной строке, без нумерации и маркеров). Варианты должны быть конкретными и связанными с контекстом диалога.`;

      const prompt =
        promptSource.length > 0
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
              "Согласен, давайте уточним детали по срокам и этапам.",
              "Спасибо за информацию, подготовлю решение и вернусь с планом.",
              "Предлагаю созвониться на 15 минут, чтобы зафиксировать требования.",
            ]
        );
      } catch {
        setAiSuggestions([]);
      } finally {
        setIsAiSuggestLoading(false);
      }
    }, 700);

    return () => {
      if (aiSuggestTimer.current) window.clearTimeout(aiSuggestTimer.current);
    };
  }, [messageText, messages, selectedId, showAISuggestions]);

  const groupedMessages = useMemo(() => {
    const groups: Array<{ date: string; items: typeof messages }> = [];
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

  const filteredConversations = useMemo(() => {
    const list = conversations ?? [];
    const q = conversationSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((conversation) => {
      const participant = conversation.other_user?.display_name?.toLowerCase() ?? "";
      const orderTitle = conversation.order_title?.toLowerCase() ?? "";
      const preview = conversation.last_message?.content?.toLowerCase() ?? "";
      return participant.includes(q) || orderTitle.includes(q) || preview.includes(q);
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

  const handleSelectConversation = (conversationId: string) => {
    setSelectedId(conversationId);
    setShowList(false);
    setReplyToMessage(null);
    setUploadedMedia([]);
  };

  const handleSend = () => {
    if (!selectedId) return;
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
    if (typingStopTimer.current) window.clearTimeout(typingStopTimer.current);
    typingStopTimer.current = window.setTimeout(() => typingPublisher.setTyping(false), 3000);
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploading(true);
    try {
      const files = Array.from(fileList).slice(0, 5);
      const uploaded = await Promise.all(files.map((file) => mediaApi.uploadPhoto(file)));
      setUploadedMedia((prev) => [...prev, ...uploaded]);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden flex h-[calc(100vh-8rem)]">
      <div className={`w-full md:w-80 border-r border-white/[0.06] flex flex-col ${!showList && selectedId ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b border-white/[0.06] space-y-3">
          <h3 className="text-lg font-semibold text-white">Сообщения</h3>
          <Input
            placeholder="Поиск чатов..."
            value={conversationSearch}
            onValueChange={setConversationSearch}
            size="sm"
            variant="bordered"
            startContent={<Search size={14} className="text-zinc-500" />}
            classNames={{
              inputWrapper: "bg-zinc-900/50 border-zinc-800 hover:border-emerald-500/30 h-9",
              input: "text-zinc-300 text-sm placeholder:text-zinc-600"
            }}
          />
        </div>
        <ScrollShadow className="flex-1 overflow-y-auto scrollbar-styled">
          {filteredConversations.map((conversation) => {
            const convKey = conversation.order_id ? `${conversation.order_id}:${conversation.freelancer_id}` : "";
            const proposalStatus = convKey ? proposalStatusMap.get(convKey) : undefined;
            const isAccepted = proposalStatus === "accepted";
            const isRejected = proposalStatus === "rejected";

            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => handleSelectConversation(conversation.id)}
                className={`w-full text-left p-4 hover:bg-white/[0.04] transition-colors border-b border-white/[0.03] ${selectedId === conversation.id
                  ? "bg-emerald-600/10 border-l-2 border-l-emerald-500"
                  : isAccepted
                    ? "border-l-2 border-l-emerald-500/60"
                    : ""
                  } ${isRejected ? "opacity-50" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar
                      size="sm"
                      showFallback
                      {...(toMediaUrl(conversation.other_user?.photo_url ?? undefined)
                        ? { src: toMediaUrl(conversation.other_user?.photo_url ?? undefined) ?? "" }
                        : {})}
                      {...(conversation.other_user?.display_name ? { name: conversation.other_user.display_name } : {})}
                      classNames={{
                        base: isAccepted
                          ? "ring-2 ring-emerald-500/60 bg-emerald-600/20"
                          : isRejected
                            ? "bg-zinc-700/30"
                            : "bg-emerald-600/20",
                        icon: isAccepted ? "text-emerald-400" : isRejected ? "text-zinc-600" : "text-emerald-400"
                      }}
                    />
                    {isAccepted && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <UserCheck size={8} className="text-white" />
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-sm font-medium truncate ${isRejected ? "text-zinc-500" : "text-zinc-200"}`}>
                        {conversation.other_user?.display_name ?? conversation.order_title ?? "Диалог"}
                      </p>
                      {isAccepted && (
                        <Chip size="sm" variant="flat" className="h-4 text-[9px] px-1.5 bg-emerald-500/15 text-emerald-400 shrink-0">
                          Исполнитель
                        </Chip>
                      )}
                      {isRejected && (
                        <Chip size="sm" variant="flat" className="h-4 text-[9px] px-1.5 bg-zinc-700/40 text-zinc-500 shrink-0">
                          Отклонён
                        </Chip>
                      )}
                    </div>
                    <p className={`text-xs truncate ${isRejected ? "text-zinc-600" : "text-zinc-500"}`}>
                      {conversation.last_message
                        ? (conversation.last_message.content || (conversation.last_message.attachments?.length ? "📎 Вложение" : "Сообщение"))
                        : "Нет сообщений"}
                    </p>
                  </div>
                  {(conversation.unread_count ?? 0) > 0 && (
                    <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center shrink-0">
                      {conversation.unread_count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
          {!filteredConversations.length && (
            <div className="p-4 text-xs text-zinc-500">Диалоги не найдены</div>
          )}
        </ScrollShadow>
      </div>

      <div className={`flex-1 flex flex-col ${showList && !selectedId ? "hidden md:flex" : "flex"}`}>
        {selectedConversation ? (
          <>
            <div className="p-4 border-b border-white/[0.06] flex items-center gap-3">
              <Button isIconOnly variant="light" size="sm" className="md:hidden text-zinc-400" onPress={() => setShowList(true)}>
                <ArrowLeft size={18} />
              </Button>
              <div className="relative">
                <Avatar
                  size="sm"
                  showFallback
                  {...(toMediaUrl(selectedConversation.other_user?.photo_url ?? undefined)
                    ? { src: toMediaUrl(selectedConversation.other_user?.photo_url ?? undefined) ?? "" }
                    : {})}
                  {...(selectedConversation.other_user?.display_name
                    ? { name: selectedConversation.other_user.display_name }
                    : {})}
                  classNames={{ base: "bg-emerald-600/20", icon: "text-emerald-400" }}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200">{selectedConversation.other_user?.display_name ?? "Собеседник"}</p>
                <p className="text-[10px] text-zinc-500">{selectedConversation.order_title ?? relatedOrder?.title ?? "Без привязки к заказу"}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-styled relative" ref={scrollContainerRef}>
              {groupedMessages.map((group) => (
                <div key={group.date}>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-white/[0.04]" />
                    <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider shrink-0">{group.date}</span>
                    <div className="flex-1 h-px bg-white/[0.04]" />
                  </div>
                  <div className="space-y-3">
                    {group.items.map((message) => {
                      const isOwn = message.author_id === userId;
                      const mediaItems = message.attachments ?? [];
                      return (
                        <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${isOwn
                              ? "bg-emerald-600/20 border border-emerald-500/20 text-zinc-200"
                              : "bg-zinc-800/50 border border-zinc-700/30 text-zinc-300"
                              }`}
                          >
                            {message.parent_message ? (
                              <div className="mb-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs text-zinc-400">
                                Ответ на: {message.parent_message.content.slice(0, 80)}
                              </div>
                            ) : null}
                            {message.content ? (
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            ) : mediaItems.length === 0 ? (
                              <p className="text-sm text-zinc-400 italic">Пустое сообщение</p>
                            ) : null}
                            {mediaItems.length > 0 ? (
                              <div className="mt-2 grid grid-cols-2 gap-2">
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
                                      className="rounded-lg border border-white/10"
                                    />
                                  ) : (
                                    <a key={attachment.id} href={url} target="_blank" className="text-xs underline text-zinc-300" rel="noreferrer">
                                      Файл
                                    </a>
                                  );
                                })}
                              </div>
                            ) : null}

                            <div className="mt-2 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-1">
                                {QUICK_REACTIONS.map((emoji) => {
                                  const reacted = (message.reactions ?? []).some(
                                    (reaction) => reaction.emoji === emoji && reaction.user_id === userId
                                  );
                                  return (
                                    <button
                                      key={`${message.id}:${emoji}`}
                                      type="button"
                                      onClick={() =>
                                        reacted
                                          ? removeReaction.mutate(message.id)
                                          : addReaction.mutate({ messageId: message.id, emoji })
                                      }
                                      className={`text-xs rounded px-1.5 py-0.5 ${reacted ? "bg-emerald-500/30" : "bg-white/5 hover:bg-white/10"
                                        }`}
                                      aria-label={`Reaction ${emoji}`}
                                    >
                                      {emoji}
                                    </button>
                                  );
                                })}
                                <button
                                  type="button"
                                  onClick={() => setReplyToMessage({ id: message.id, content: message.content })}
                                  className="text-zinc-500 hover:text-zinc-300"
                                >
                                  <Reply size={12} />
                                </button>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-[10px] text-zinc-600">{formatTime(message.created_at)}</p>
                                {isOwn ? (
                                  readByPeerMessageIds.has(message.id) ? (
                                    <CheckCheck size={12} className="text-emerald-400" />
                                  ) : (
                                    <Check size={12} className="text-zinc-500" />
                                  )
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {typingUsers.length > 0 ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-3 py-2 border border-white/10 bg-zinc-800/40 text-xs text-zinc-400">
                    {selectedConversation.other_user?.display_name ?? "Собеседник"} печатает...
                  </div>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
              {showScrollBtn ? (
                <button
                  type="button"
                  onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
                  className="sticky bottom-2 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg"
                >
                  <ArrowDown size={16} />
                </button>
              ) : null}
            </div>

            <div className="p-4 border-t border-white/[0.06] space-y-2">
              {isLockedByFirstResponseRule ? (
                <p className="text-xs text-amber-300 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                  Ожидаем ответа заказчика. Отправка новых сообщений временно недоступна.
                </p>
              ) : null}

              {replyToMessage ? (
                <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-400 flex items-center justify-between">
                  <span>Ответ на: {replyToMessage.content.slice(0, 100)}</span>
                  <button type="button" className="text-zinc-500 hover:text-zinc-300" onClick={() => setReplyToMessage(null)}>
                    ×
                  </button>
                </div>
              ) : null}

              {uploadedMedia.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {uploadedMedia.map((item) => {
                    const isImage = item.file_type?.startsWith("image/");
                    const url = toMediaUrl(item.file_path);
                    return (
                      <div key={item.id} className="relative group">
                        {isImage && url ? (
                          <img
                            src={url}
                            alt="preview"
                            className="w-16 h-16 rounded-lg object-cover border border-white/10"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                            <span className="text-[10px] text-zinc-400 text-center px-1 break-all">
                              {item.file_type?.split("/").pop()?.toUpperCase() ?? "FILE"}
                            </span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setUploadedMedia((prev) => prev.filter((m) => m.id !== item.id))}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {showAISuggestions && (
                <div className="rounded-xl border border-white/[0.08] bg-zinc-900/40 p-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Sparkles size={12} className="text-emerald-400" />
                      AI-подсказки
                    </div>
                    <button
                      type="button"
                      className="text-[11px] text-zinc-500 hover:text-zinc-300"
                      onClick={() => setShowAISuggestions(false)}
                    >
                      Свернуть
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(isAiSuggestLoading ? [] : aiSuggestions).map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setMessageText(suggestion)}
                        className="text-xs rounded-full px-3 py-1.5 border border-emerald-500/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                      >
                        {suggestion}
                      </button>
                    ))}
                    {isAiSuggestLoading && <span className="text-xs text-zinc-500">Генерируем подсказки...</span>}
                  </div>
                </div>
              )}
              {!showAISuggestions && (
                <button
                  type="button"
                  onClick={() => setShowAISuggestions(true)}
                  className="text-xs text-emerald-300 hover:text-emerald-200 inline-flex items-center gap-1"
                >
                  <Sparkles size={12} /> Показать AI-подсказки
                </button>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="Введите сообщение..."
                  value={messageText}
                  onValueChange={handleInputChange}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                  isDisabled={isLockedByFirstResponseRule}
                  variant="bordered"
                  classNames={{
                    inputWrapper: "bg-zinc-900/50 border-zinc-700/50 hover:border-emerald-500/40",
                    input: "text-zinc-200 placeholder:text-zinc-600"
                  }}
                  className="flex-1"
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
                  disabled={isUploading || isLockedByFirstResponseRule}
                />
                <Button
                  isIconOnly
                  variant="flat"
                  isLoading={isUploading}
                  isDisabled={isLockedByFirstResponseRule}
                  onPress={() => fileInputRef.current?.click()}
                >
                  <ImagePlus size={16} />
                </Button>
                <Button isIconOnly variant="flat" isDisabled>
                  <Smile size={16} />
                </Button>
                <Button
                  isIconOnly
                  onPress={handleSend}
                  isLoading={sendMessage.isPending}
                  className="bg-emerald-600 text-white hover:bg-emerald-500"
                  isDisabled={isLockedByFirstResponseRule || (!messageText.trim() && uploadedMedia.length === 0)}
                  aria-label="Отправить"
                >
                  <Send size={18} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <p className="text-base font-medium text-zinc-400 mb-1">Выберите чат</p>
            <p className="text-sm text-zinc-600 text-center max-w-xs">
              Выберите диалог из списка слева, чтобы начать общение
            </p>
          </div>
        )}
      </div>

      {selectedConversation && (
        <aside className="hidden xl:flex xl:w-80 border-l border-white/[0.06] p-4 flex-col gap-4">
          <div className="rounded-xl border border-white/[0.08] bg-zinc-900/30 p-4">
            <h4 className="text-sm font-semibold text-zinc-100 mb-2">Данные заказа</h4>
            <p className="text-sm text-zinc-300">{relatedOrder?.title ?? selectedConversation.order_title ?? "Без привязки к заказу"}</p>
            {relatedOrder && (
              <div className="mt-3 space-y-1.5 text-xs text-zinc-400">
                <p>Статус: <span className="text-zinc-200">{relatedOrder.status}</span></p>
                <p>Бюджет: <span className="text-zinc-200">₽{relatedOrder.budget_min.toLocaleString()} – ₽{relatedOrder.budget_max.toLocaleString()}</span></p>
                {relatedOrder.deadline && <p>Дедлайн: <span className="text-zinc-200">{new Date(relatedOrder.deadline).toLocaleDateString("ru-RU")}</span></p>}
              </div>
            )}
            {role === "client" && selectedConversation.order_id && (() => {
              const orderId = selectedConversation.order_id;
              const isExecutorAssigned = relatedOrder && ["in_progress", "completed", "dispute"].includes(relatedOrder.status);

              if (!isExecutorAssigned) {
                return (
                  <Button
                    size="sm"
                    className="mt-3 bg-emerald-600 text-white hover:bg-emerald-500"
                    onPress={() => router.push(`/dashboard/orders/${orderId}`)}
                  >
                    Выбрать исполнителя
                  </Button>
                );
              }

              // Find the accepted proposal's freelancer_id for this order
              const acceptedProposal = (allProposalsData?.items ?? []).find(
                (p) => p.order_id === orderId && p.status === "accepted"
              );
              // Find that freelancer's conversation to get their display info
              const executorConversation = acceptedProposal
                ? (conversations ?? []).find(
                  (c) => c.order_id === orderId && c.freelancer_id === acceptedProposal.freelancer_id
                )
                : undefined;
              const executorName = acceptedProposal?.freelancer_name
                ?? executorConversation?.other_user?.display_name
                ?? "Исполнитель";
              const executorPhotoUrl = executorConversation?.other_user?.photo_url;

              return (
                <div className="mt-3 rounded-lg border border-white/[0.08] bg-zinc-800/40 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">Исполнитель</p>
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      size="sm"
                      showFallback
                      {...(toMediaUrl(executorPhotoUrl ?? undefined)
                        ? { src: toMediaUrl(executorPhotoUrl ?? undefined) ?? "" }
                        : {})}
                      name={executorName}
                      classNames={{ base: "bg-emerald-600/20 shrink-0", icon: "text-emerald-400" }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">
                        {executorName}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="flat"
                    className="mt-2 w-full text-zinc-300 bg-zinc-700/40 hover:bg-zinc-700/60"
                    onPress={() => router.push(`/dashboard/orders/${orderId}`)}
                  >
                    Перейти к заказу
                  </Button>
                </div>
              );
            })()}
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-zinc-900/30 p-4">
            <h4 className="text-sm font-semibold text-zinc-100 mb-2">Медиа из переписки</h4>
            {!galleryItems.length ? (
              <p className="text-xs text-zinc-500">Файлы пока не загружены</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {galleryItems.slice(0, 12).map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt="chat-media"
                    loading="lazy"
                    decoding="async"
                    className="rounded-lg border border-white/10"
                  />
                ))}
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
};
