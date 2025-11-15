/**
 * Socket.IO Event Constants
 * Định nghĩa tất cả các socket events được sử dụng trong ứng dụng
 */

// Connection events
export const SOCKET_CONNECTION = 'connection';
export const SOCKET_DISCONNECT = 'disconnect';
export const SOCKET_ERROR = 'error';

// Chat events - Client to Server
export const CHAT_EVENTS = {
  // Conversation events
  JOIN_CONVERSATION: 'chat:join_conversation',
  LEAVE_CONVERSATION: 'chat:leave_conversation',
  CREATE_CONVERSATION: 'chat:create_conversation',
  GET_CONVERSATIONS: 'chat:get_conversations',
  GET_CONVERSATION: 'chat:get_conversation',
  UPDATE_CONVERSATION: 'chat:update_conversation',
  CLOSE_CONVERSATION: 'chat:close_conversation',

  // Message events
  SEND_MESSAGE: 'chat:send_message',
  EDIT_MESSAGE: 'chat:edit_message',
  DELETE_MESSAGE: 'chat:delete_message',
  GET_MESSAGES: 'chat:get_messages',
  MARK_AS_READ: 'chat:mark_as_read',

  // Typing indicator
  TYPING_START: 'chat:typing_start',
  TYPING_STOP: 'chat:typing_stop',

  // User status
  USER_ONLINE: 'chat:user_online',
  USER_OFFLINE: 'chat:user_offline',
} as const;

// Chat events - Server to Client
export const CHAT_EVENTS_EMIT = {
  // Message events
  NEW_MESSAGE: 'chat:new_message',
  MESSAGE_UPDATED: 'chat:message_updated',
  MESSAGE_DELETED: 'chat:message_deleted',
  MESSAGE_READ: 'chat:message_read',

  // Conversation events
  CONVERSATION_CREATED: 'chat:conversation_created',
  CONVERSATION_UPDATED: 'chat:conversation_updated',
  CONVERSATION_CLOSED: 'chat:conversation_closed',

  // Typing indicator
  USER_TYPING: 'chat:user_typing',
  USER_STOPPED_TYPING: 'chat:user_stopped_typing',

  // User status
  USER_STATUS_CHANGED: 'chat:user_status_changed',

  // Error events
  ERROR: 'chat:error',
} as const;

// Room naming conventions
export const SOCKET_ROOMS = {
  conversation: (conversationId: string) => `conversation:${conversationId}`,
  user: (userId: string) => `user:${userId}`,
  shop: (shopId: string) => `shop:${shopId}`,
} as const;

// Event payload types
export interface SendMessagePayload {
  conversationId: string;
  content: string;
  type?: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM' | 'ORDER' | 'PRODUCT';
  attachments?: Array<{
    url: string;
    type: string;
    name: string;
    size: number;
  }>;
  replyToId?: string;
  orderId?: string;
  productId?: string;
}

export interface CreateConversationPayload {
  shopId?: string;
  title?: string;
  subject?: string;
  type?: 'CUSTOMER_SUPPORT' | 'SHOP_TO_CUSTOMER' | 'ADMIN_SUPPORT';
}

export interface JoinConversationPayload {
  conversationId: string;
}

export interface MarkAsReadPayload {
  conversationId: string;
  messageId?: string; // Nếu không có, mark all messages as read
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
  before?: string; // messageId
}