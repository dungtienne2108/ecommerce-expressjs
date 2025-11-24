import { Socket } from 'socket.io';

export interface UserPayload {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: string;
  roles?: string[];
}

export interface AuthenticatedSocketServer extends Socket {
  user?: UserPayload;
}

export interface SendMessageData {
  conversationId: string;
  content: string;
  type?: string;
  attachments?: any[];
  orderId?: string;
  productId?: string;
  metadata?: Record<string, any>;
  replyToId?: string;
}

export interface MarkAsReadData {
  conversationId: string;
  messageIds?: string[];
}

export interface TypingData {
  conversationId: string;
}

export interface MessageReceivedData {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  attachments?: any[];
  orderId?: string;
  productId?: string;
  metadata?: Record<string, any>;
  replyToId?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  sender?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface UserTypingData {
  userId: string;
  userName: string;
}

export interface MessagesMarkedReadData {
  userId: string;
  messageIds: string[];
}

