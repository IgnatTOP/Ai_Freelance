export type UUID = string;

export enum OrderStatus {
  Draft = "draft",
  Published = "published",
  InProgress = "in_progress",
  Completed = "completed",
  Cancelled = "cancelled"
}

export enum ProposalStatus {
  Pending = "pending",
  Shortlisted = "shortlisted",
  Accepted = "accepted",
  Rejected = "rejected"
}

export enum UserRole {
  Client = "client",
  Freelancer = "freelancer",
  Admin = "admin"
}

export enum ExperienceLevel {
  Junior = "junior",
  Middle = "middle",
  Senior = "senior"
}

export enum TransactionType {
  Deposit = "deposit",
  Withdrawal = "withdrawal",
  EscrowHold = "escrow_hold",
  EscrowRelease = "escrow_release",
  EscrowRefund = "escrow_refund"
}

export enum TransactionStatus {
  Pending = "pending",
  Completed = "completed",
  Failed = "failed",
  Cancelled = "cancelled"
}

export enum EscrowStatus {
  Held = "held",
  Released = "released",
  Refunded = "refunded",
  Disputed = "disputed"
}

export enum MessageAuthorType {
  Client = "client",
  Freelancer = "freelancer",
  System = "system",
  Assistant = "assistant"
}

export enum NotificationType {
  ChatMessage = "chat.message",
  ProposalCreated = "proposal.created",
  ProposalUpdated = "proposal.updated",
  OrderUpdated = "order.updated",
  BalanceUpdated = "balance.updated",
  System = "system"
}

export enum WsEventType {
  ConnectionState = "connection.state",
  NotificationCreated = "notification.created",
  NotificationRead = "notification.read",
  NotificationUnreadUpdated = "notification.unread_count.updated",
  BalanceUpdated = "balance.updated",
  TransactionCreated = "transaction.created",
  PresenceUpdated = "presence.user.updated",
  PresenceOnlineCountUpdated = "presence.online_count.updated",
  CounterUpdated = "counter.updated",
  OrderCreated = "order.created",
  OrderUpdated = "order.updated",
  OrderResponsesCountUpdated = "order.responses_count.updated",
  OrderApplicationClosed = "order.application_closed",
  ProposalCreated = "proposal.created",
  ProposalUpdated = "proposal.updated",
  ProposalAIReady = "proposal.ai_analysis_ready",
  ConversationUpdated = "conversation.updated",
  ChatMessageCreated = "chat.message.created",
  ChatMessageUpdated = "chat.message.updated",
  ChatMessageDeleted = "chat.message.deleted",
  ChatMessageRead = "chat.message.read",
  ChatTypingUpdated = "chat.typing.updated",
  AssistantChunk = "ai.assistant.chunk",
  AssistantCompleted = "ai.assistant.completed",
  AssistantStopped = "ai.assistant.stopped",
  SuggestionChunk = "ai.chat_suggestions.chunk",
  SuggestionCompleted = "ai.chat_suggestions.completed",
  Ack = "ack",
  Nack = "nack"
}

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type ApiPaginated<T> = ApiSuccess<T[]> & {
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
};

export type WsServerEnvelope<T = unknown> = {
  type: WsEventType | string;
  version: 1;
  event_id: string;
  ts: string;
  data: T;
};

export type WsClientCommand<T = unknown> = {
  cmd: string;
  version: 1;
  request_id: string;
  data: T;
};

export type WsAck = {
  type: "ack";
  request_id: string;
};

export type WsNack = {
  type: "nack";
  request_id: string;
  error: {
    code: string;
    message: string;
  };
};
