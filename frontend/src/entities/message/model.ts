import { z } from "zod";

export const messageSchema = z.object({
  id: z.string(),
  conversation_id: z.string(),
  sender_id: z.string(),
  content: z.string(),
  is_edited: z.boolean().optional(),
  created_at: z.string()
});

export type Message = z.infer<typeof messageSchema>;
