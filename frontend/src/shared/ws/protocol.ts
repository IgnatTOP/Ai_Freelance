import { z } from "zod";

export const wsServerEnvelopeSchema = z.object({
  type: z.string(),
  version: z.literal(1),
  event_id: z.string(),
  ts: z.string(),
  data: z.unknown()
});

export const wsAckSchema = z.object({
  type: z.literal("ack"),
  request_id: z.string()
});

export const wsNackSchema = z.object({
  type: z.literal("nack"),
  request_id: z.string(),
  error: z.object({
    code: z.string(),
    message: z.string()
  })
});

export type WsServerEnvelope = z.infer<typeof wsServerEnvelopeSchema>;
export type WsAck = z.infer<typeof wsAckSchema>;
export type WsNack = z.infer<typeof wsNackSchema>;

export const wsEventPayloadSchemas = {
  "notification.created": z.object({
    id: z.string().optional(),
    type: z.string().optional(),
    title: z.string().optional(),
    message: z.string().optional()
  }),
  "notification.unread_count.updated": z.object({
    unread_count: z.number().int().nonnegative()
  }),
  "notification.read": z.object({
    notification_id: z.string().optional(),
    all: z.boolean().optional()
  }),
  "presence.online_count.updated": z.object({
    online_count: z.number().int().nonnegative()
  }),
  "balance.updated": z.object({
    available: z.number(),
    frozen: z.number()
  }),
  "transaction.created": z.object({
    type: z.string(),
    amount: z.number().optional(),
    order_id: z.string().optional()
  }),
  "chat.message.read": z.object({
    conversation_id: z.string(),
    message_id: z.string(),
    user_id: z.string().optional()
  }),
  "chat.typing.updated": z.object({
    conversation_id: z.string(),
    user_id: z.string(),
    is_typing: z.boolean(),
    typing_users: z.array(z.string()).optional()
  }),
  "connection.state": z.object({
    state: z.enum(["reconnecting", "recovered"])
  }),
  "counter.updated": z.object({
    domain: z.string(),
    delta: z.number().optional(),
    value: z.number().optional()
  }),
  "proposal.created": z.object({
    proposal_id: z.string().optional(),
    order_id: z.string().optional()
  }),
  "order.created": z.object({
    order_id: z.string().optional(),
    title: z.string().optional()
  }),
  "session.revoked": z.object({
    session_id: z.string().optional(),
    reason: z.string().optional()
  }),
  "proposal.ai_analysis_ready": z.object({
    order_id: z.string(),
    message: z.string().optional()
  })
} as const;

export const wsCommandPayloadSchemas = {
  "presence.subscribe": z.object({
    target_user_ids: z.array(z.string())
  }),
  "presence.unsubscribe": z.object({
    target_user_ids: z.array(z.string()).optional()
  }),
  "chat.typing.set": z.object({
    conversation_id: z.string(),
    is_typing: z.boolean(),
    target_user_id: z.string().optional()
  }),
  "chat.message.read.upsert": z.object({
    conversation_id: z.string(),
    message_id: z.string()
  }),
  "notification.mark_read": z.object({
    notification_id: z.string()
  }),
  "notification.mark_all_read": z.object({}),
  "ai.assistant.stop": z.object({
    session_id: z.string().optional()
  })
} as const;
