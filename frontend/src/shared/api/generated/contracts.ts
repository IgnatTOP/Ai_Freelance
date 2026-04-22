export type GeneratedApiSuccess<T = unknown> = {
  success: true;
  data: T;
};

export type GeneratedApiError = {
  success: false;
  error: {
    code:
      | "bad_request"
      | "unauthorized"
      | "forbidden"
      | "not_found"
      | "conflict"
      | "validation_error"
      | "rate_limited"
      | "internal_server_error"
      | "request_failed";
    message: string;
  };
};

export type GeneratedApiPaginated<T> = GeneratedApiSuccess<T[]> & {
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
};

export type GeneratedMarkConversationReadRequest = {
  message_id?: string;
  message_ids?: string[];
};

export type GeneratedMarkConversationReadResponse = GeneratedApiSuccess<{
  conversation_id: string;
  messages_count: number;
  marked_read: true;
}>;

export type GeneratedProposalListResponse = GeneratedApiSuccess<{
  proposals: unknown[];
  best_recommendation?: {
    proposal_id?: string;
    justification?: string;
  };
}> & {
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
};

export type GeneratedNotificationListResponse = GeneratedApiSuccess<{
  notifications: unknown[];
  unread_count: number;
}> & {
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
};

export type GeneratedEscrowResponse = GeneratedApiSuccess<{
  id: string;
  order_id: string;
  client_id: string;
  freelancer_id: string;
  amount: number;
  status: string;
  created_at: string;
  released_at?: string;
}>;

export type GeneratedWsPresenceSubscribe = {
  target_user_ids: string[];
};

export type GeneratedWsPresenceUnsubscribe = {
  target_user_ids?: string[];
};

export type GeneratedWsTypingCommand = {
  conversation_id: string;
  is_typing: boolean;
  target_user_id?: string;
};

export type GeneratedWsReadUpsertCommand = {
  conversation_id: string;
  message_id: string;
};

export type GeneratedWsNotificationMarkReadCommand = {
  notification_id: string;
};

export type GeneratedWsNotificationMarkAllReadCommand = Record<string, never>;

export type GeneratedWsAssistantStopCommand = {
  session_id?: string;
};
