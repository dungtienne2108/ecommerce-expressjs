import { ConversationType, ConversationStatus, MessageType, MessageStatus, ParticipantRole } from "@prisma/client";

// ===== CONVERSATION DTOs =====

export interface CreateConversationRequest {
  type: ConversationType;
  shopId?: string;
  title?: string;
  subject?: string;
  participants?: Array<{
    userId: string;
    role: ParticipantRole;
  }>;
}

export interface UpdateConversationRequest {
  status?: ConversationStatus;
  title?: string;
  subject?: string;
  priority?: number;
  tags?: string[];
  resolvedAt?: Date;
  closedAt?: Date;
}

export interface ConversationResponseDto {
  id: string;
  type: ConversationType;
  status: ConversationStatus;
  shopId?: string | null;
  title?: string | null;
  subject?: string | null;
  lastMessageAt?: Date | null;
  lastMessageText?: string | null;
  totalMessages: number;
  unreadCount: number;
  priority: number;
  tags: string[];
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationDetailResponseDto extends ConversationResponseDto {
  participants?: ConversationParticipantResponseDto[];
  messages?: MessageResponseDto[];
}

// ===== MESSAGE DTOs =====

export interface CreateMessageRequest {
  conversationId: string;
  type?: MessageType;
  content: string;
  attachments?: Array<{
    url: string;
    type: string;
    name: string;
    size: number;
  }>;
  orderId?: string;
  productId?: string;
  metadata?: Record<string, any>;
  replyToId?: string;
}

export interface UpdateMessageRequest {
  content?: string;
  status?: MessageStatus;
  metadata?: Record<string, any>;
}

export interface MessageResponseDto {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;
  status: MessageStatus;
  attachments?: any;
  orderId?: string | null;
  productId?: string | null;
  metadata?: any;
  replyToId?: string | null;
  sentAt: Date;
  deliveredAt?: Date | null;
  readAt?: Date | null;
  editedAt?: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  sender?: {
    id: string;
    name: string;
    avatar?: string;
  };
  replyTo?: MessageResponseDto;
}

export interface GetMessagesRequest {
  conversationId: string;
  skip?: number;
  take?: number;
  orderBy?: "asc" | "desc";
}

export interface MarkMessagesAsReadRequest {
  conversationId: string;
  messageIds?: string[];
}

// ===== CONVERSATION PARTICIPANT DTOs =====

export interface AddParticipantRequest {
  conversationId: string;
  userId: string;
  role: ParticipantRole;
}

export interface UpdateParticipantRequest {
  role?: ParticipantRole;
  isMuted?: boolean;
  isActive?: boolean;
}

export interface ConversationParticipantResponseDto {
  id: string;
  conversationId: string;
  userId: string;
  role: ParticipantRole;
  joinedAt: Date;
  leftAt?: Date | null;
  lastReadAt?: Date | null;
  unreadCount: number;
  isMuted: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
  };
}

export interface RemoveParticipantRequest {
  conversationId: string;
  userId: string;
}

// ===== CONVERSATION LIST DTOs =====

export interface GetConversationsRequest {
  type?: ConversationType;
  status?: ConversationStatus;
  shopId?: string;
  skip?: number;
  take?: number;
  orderBy?: "createdAt" | "lastMessageAt" | "priority";
  order?: "asc" | "desc";
  search?: string;
}

export interface ConversationListResponseDto {
  data: ConversationResponseDto[];
  pagination: {
    total: number;
    skip: number;
    take: number;
    hasMore: boolean;
  };
}

// ===== REALTIME EVENT DTOs =====

export interface NewMessageEventDto {
  message: MessageResponseDto;
  conversation: ConversationResponseDto;
}

export interface MessageReadEventDto {
  conversationId: string;
  userId: string;
  readAt: Date;
}

export interface TypingEventDto {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface ConversationStatusChangedEventDto {
  conversationId: string;
  status: ConversationStatus;
  changedAt: Date;
}

export interface ParticipantJoinedEventDto {
  conversationId: string;
  participant: ConversationParticipantResponseDto;
}

export interface ParticipantLeftEventDto {
  conversationId: string;
  userId: string;
  leftAt: Date;
}

// ===== PAGINATION & FILTER =====

export interface PaginationParams {
  skip: number;
  take: number;
}

export interface PaginationMeta {
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
  page: number;
  totalPages: number;
}

// ===== API RESPONSE =====

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: Record<string, any>;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
  error?: {
    code: string;
    message: string;
  };
}