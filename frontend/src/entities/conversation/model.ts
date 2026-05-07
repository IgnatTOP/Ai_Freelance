import { z } from "zod";
import { MessageAuthorType } from "@/shared/types/contracts";

export const messageAttachmentSchema = z.object({
  id: z.string(),
  message_id: z.string(),
  media_id: z.string(),
  file_path: z.string().optional(),
  file_type: z.string().optional(),
  file_size: z.number().optional(),
});

export const messageReactionSchema = z.object({
  id: z.string(),
  message_id: z.string(),
  user_id: z.string(),
  emoji: z.string(),
  created_at: z.string(),
});

export const conversationMessageSchema = z.object({
  id: z.string(),
  conversation_id: z.string(),
  author_id: z.string().optional(),
  author_type: z.nativeEnum(MessageAuthorType).or(z.string()),
  content: z.string(),
  parent_message_id: z.string().optional(),
  attachments: z.array(messageAttachmentSchema).optional(),
  reactions: z.array(messageReactionSchema).optional(),
  is_edited: z.boolean().optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  read_at: z.string().optional(),
});

export const conversationSchema = z.object({
  id: z.string(),
  order_id: z.string().optional(),
  client_id: z.string(),
  freelancer_id: z.string(),
  order_title: z.string().optional(),
  unread_count: z.number().optional(),
  created_at: z.string(),
});

export type ConversationMessage = z.infer<typeof conversationMessageSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
