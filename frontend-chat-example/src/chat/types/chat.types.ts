/**
 * Chat Types
 * Định nghĩa tất cả các types cho hệ thống chat
 */

// Message Types
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM' | 'ORDER' | 'PRODUCT';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  attachments?: Attachment[];
  replyToId?: string;
  orderId?: string;
  productId?: string;
  sentAt: string;
  isRead: boolean;
  isDeleted: boolean;
  editedAt?: string;
  sender?: User;
  replyTo?: Message;
}

export interface Attachment {
  url: string;
  type: string;
  name: string;
  size: number;
}

// Conversation Types
export type ConversationType = 'CUSTOMER_SUPPORT' | 'SHOP_TO_CUSTOMER' | 'ADMIN_SUPPORT';
export type ConversationStatus = 'ACTIVE' | 'CLOSED' | 'RESOLVED';

export interface Conversation {
  id: string;
  type: ConversationType;
  status: ConversationStatus;
  title?: string;
  subject?: string;
  shopId?: string;
  lastMessageAt?: string;
  lastMessageText?: string;
  totalMessages: number;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  participants?: ConversationParticipant[];
  shop?: Shop;
}

export interface ConversationParticipant {
  id: string;
  userId: string;
  conversationId: string;
  role: 'CUSTOMER' | 'SHOP_OWNER' | 'ADMIN';
  isActive: boolean;
  unreadCount: number;
  lastReadAt?: string;
  user?: User;
}

// User Types
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

// Shop Types
export interface Shop {
  id: string;
  name: string;
  logoUrl?: string;
  ownerId: string;
}

// Socket Event Payloads
export interface SendMessagePayload {
  conversationId: string;
  content: string;
  type?: MessageType;
  attachments?: Attachment[];
  replyToId?: string;
  orderId?: string;
  productId?: string;
}

export interface CreateConversationPayload {
  shopId?: string;
  title?: string;
  subject?: string;
  type?: ConversationType;
}

export interface JoinConversationPayload {
  conversationId: string;
}

export interface MarkAsReadPayload {
  conversationId: string;
  messageId?: string;
}

export interface TypingPayload {
  conversationId: string;
}

export interface EditMessagePayload {
  messageId: string;
  content: string;
}

export interface DeleteMessagePayload {
  messageId: string;
}

export interface GetMessagesPayload {
  conversationId: string;
  limit?: number;
  offset?: number;
  before?: string;
}

// Socket Response Types
export interface SocketResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// User Status
export interface UserStatus {
  userId: string;
  status: 'online' | 'offline';
  lastSeen?: string;
}

// Typing Indicator
export interface TypingIndicator {
  conversationId: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
  userId?: string;
}
