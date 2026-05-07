import { apiClient } from "../client";
import { useSessionStore } from "@/shared/store/session.store";

export interface ConversationUser {
  id: string;
  display_name: string;
  photo_id?: string;
  photo_url?: string;
}

export interface Conversation {
  id: string;
  order_id?: string;
  client_id: string;
  freelancer_id: string;
  order_title?: string;
  other_user?: ConversationUser;
  last_message?: Message;
  unread_count?: number;
  created_at: string;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  media_id: string;
  file_path?: string;
  file_type?: string;
  file_size?: number;
  media?: {
    id: string;
    file_path: string;
    file_type?: string;
    file_size?: number;
  };
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  author_id?: string;
  author_type: string;
  content: string;
  parent_message_id?: string;
  parent_message?: Message;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  is_edited?: boolean;
  created_at: string;
  updated_at?: string;
  read_at?: string;
}

export interface PaginatedMessages {
  items: Message[];
  total: number;
  page: number;
  limit: number;
}

export interface SendMessageInput {
  content: string;
  parent_message_id?: string;
  attachment_ids?: string[];
}

type BackendConversation = {
  id: string;
  order_id?: string;
  client_id: string;
  freelancer_id: string;
  order_title?: string;
  other_user?: ConversationUser;
  other_participant?: { user_id: string; display_name: string; photo_id?: string };
  last_message?: BackendMessage;
  unread_count?: number;
  created_at: string;
};

type BackendMessage = {
  id: string;
  conversation_id: string;
  sender_id?: string;
  author_id?: string;
  author_type?: string;
  content: string;
  parent_message_id?: string;
  parent_message?: BackendMessage;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  is_edited?: boolean;
  created_at: string;
  updated_at?: string;
  read_at?: string;
};

type BackendMessageAttachment = {
  id: string;
  message_id: string;
  media_id: string;
  file_path?: string;
  file_type?: string;
  file_size?: number;
  media?: {
    id?: string;
    file_path?: string;
    file_type?: string;
    file_size?: number;
  };
};

type BackendReaction = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

type BackendProfileShort = {
  user_id?: string;
  id?: string;
  display_name?: string;
  username?: string;
  photo_id?: string;
  photo_url?: string;
  avatar_url?: string;
};

const isWrappedMessage = (value: unknown): value is { message?: BackendMessage } =>
  Boolean(value && typeof value === "object" && "message" in value);

const isWrappedReaction = (value: unknown): value is { reaction?: BackendReaction } =>
  Boolean(value && typeof value === "object" && "reaction" in value);

const mapAttachment = (attachment: BackendMessageAttachment): MessageAttachment => {
  const mediaFilePath = attachment.media?.file_path ?? attachment.file_path;
  const mediaFileType = attachment.media?.file_type ?? attachment.file_type;
  const mediaFileSize = attachment.media?.file_size ?? attachment.file_size;
  const mediaId = attachment.media?.id ?? attachment.media_id;
  const media = mediaFilePath
    ? {
        id: mediaId,
        file_path: mediaFilePath,
        ...(mediaFileType ? { file_type: mediaFileType } : {}),
        ...(typeof mediaFileSize === "number" ? { file_size: mediaFileSize } : {}),
      }
    : undefined;

  return {
    id: attachment.id,
    message_id: attachment.message_id,
    media_id: attachment.media_id,
    ...(mediaFilePath ? { file_path: mediaFilePath } : {}),
    ...(mediaFileType ? { file_type: mediaFileType } : {}),
    ...(typeof mediaFileSize === "number" ? { file_size: mediaFileSize } : {}),
    ...(media ? { media } : {}),
  };
};

export const mapMessage = (message: BackendMessage, currentUserId: string | null): Message => {
  const authorId = message.author_id ?? message.sender_id;
  const authorType =
    message.author_type ??
    (authorId && currentUserId && authorId === currentUserId ? "user" : "other");

  const mapped: Message = {
    id: message.id,
    conversation_id: message.conversation_id,
    author_type: authorType ?? "other",
    content: message.content,
    attachments: Array.isArray(message.attachments) ? message.attachments.map((item) => mapAttachment(item)) : [],
    reactions: Array.isArray(message.reactions) ? message.reactions : [],
    is_edited: Boolean(message.is_edited),
    created_at: message.created_at,
  };
  if (authorId) mapped.author_id = authorId;
  if (message.parent_message_id) mapped.parent_message_id = message.parent_message_id;
  if (message.parent_message) mapped.parent_message = mapMessage(message.parent_message, currentUserId);
  if (message.updated_at) mapped.updated_at = message.updated_at;
  if (message.read_at) mapped.read_at = message.read_at;
  return mapped;
};

const mapReaction = (reaction: BackendReaction): MessageReaction => ({
  id: reaction.id,
  message_id: reaction.message_id,
  user_id: reaction.user_id,
  emoji: reaction.emoji,
  created_at: reaction.created_at,
});

export const conversationsApi = {
  async getMyConversations(): Promise<Conversation[]> {
    const currentUserId = useSessionStore.getState().userId;
    const list = await apiClient.request<BackendConversation[]>("/conversations/my");

    const otherUserIDs = new Set<string>();
    for (const conversation of list) {
      if (conversation.other_user?.id) {
        otherUserIDs.add(conversation.other_user.id);
        continue;
      }
      if (conversation.other_participant?.user_id) {
        otherUserIDs.add(conversation.other_participant.user_id);
        continue;
      }
      if (currentUserId) {
        const otherId =
          conversation.client_id === currentUserId ? conversation.freelancer_id : conversation.client_id;
        if (otherId) otherUserIDs.add(otherId);
      }
    }

    const profilesByID = new Map<string, ConversationUser>();
    await Promise.allSettled(
      [...otherUserIDs].map(async (id) => {
        const profile = await apiClient.request<BackendProfileShort>(`/users/${id}`);
        const mapped: ConversationUser = {
          id,
          display_name: profile.display_name ?? profile.username ?? "Пользователь",
        };
        if (profile.photo_id) mapped.photo_id = profile.photo_id;
        const photoUrl = profile.photo_url ?? profile.avatar_url;
        if (photoUrl) mapped.photo_url = photoUrl;
        profilesByID.set(id, mapped);
      })
    );

    return list.map((conversation) => {
      let participantFromLegacy: ConversationUser | undefined;
      if (conversation.other_participant) {
        participantFromLegacy = {
          id: conversation.other_participant.user_id,
          display_name: conversation.other_participant.display_name,
        };
        if (conversation.other_participant.photo_id) {
          participantFromLegacy.photo_id = conversation.other_participant.photo_id;
        }
      }
      const mappedOtherUser =
        conversation.other_user ??
        participantFromLegacy ??
        (currentUserId
          ? profilesByID.get(
            conversation.client_id === currentUserId
              ? conversation.freelancer_id
              : conversation.client_id
          )
          : undefined);

      const mapped: Conversation = {
        id: conversation.id,
        client_id: conversation.client_id,
        freelancer_id: conversation.freelancer_id,
        created_at: conversation.created_at,
      };
      if (conversation.order_id) mapped.order_id = conversation.order_id;
      if (conversation.order_title) mapped.order_title = conversation.order_title;
      if (mappedOtherUser) mapped.other_user = mappedOtherUser;
      if (conversation.last_message) mapped.last_message = mapMessage(conversation.last_message, currentUserId);
      if (typeof conversation.unread_count === "number") mapped.unread_count = conversation.unread_count;
      return mapped;
    });
  },

  async getMessages(conversationId: string, page?: number): Promise<PaginatedMessages> {
    const limit = 50;
    const offset = page ? Math.max(page - 1, 0) * limit : 0;
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    const currentUserId = useSessionStore.getState().userId;
    const response = await apiClient.requestPaginated<BackendMessage>(
      `/conversations/${conversationId}/messages?${params.toString()}`
    );
    const items = response.data.map((message) => mapMessage(message, currentUserId));
    return {
      items,
      total: response.pagination.total,
      page: Math.floor(response.pagination.offset / Math.max(response.pagination.limit, 1)) + 1,
      limit: response.pagination.limit
    };
  },

  async sendMessage(conversationId: string, input: SendMessageInput): Promise<Message> {
    const currentUserId = useSessionStore.getState().userId;
    const response = await apiClient.request<BackendMessage | { message?: BackendMessage }>(
      `/conversations/${conversationId}/messages`,
      {
        method: "POST",
        body: JSON.stringify(input),
      }
    );
    const message = isWrappedMessage(response) ? response.message : response;
    if (!message) {
      throw new Error("Invalid sendMessage response");
    }
    return mapMessage(message, currentUserId);
  },

  async addReaction(conversationId: string, messageId: string, emoji: string): Promise<MessageReaction> {
    const response = await apiClient.request<BackendReaction | { reaction?: BackendReaction }>(
      `/conversations/${conversationId}/messages/${messageId}/reactions`,
      {
        method: "POST",
        body: JSON.stringify({ emoji })
      }
    );
    const reaction = isWrappedReaction(response) ? response.reaction : response;
    if (!reaction) {
      throw new Error("Invalid addReaction response");
    }
    return mapReaction(reaction);
  },

  async removeReaction(conversationId: string, messageId: string): Promise<void> {
    await apiClient.request(`/conversations/${conversationId}/messages/${messageId}/reactions`, {
      method: "DELETE"
    });
  },

};
