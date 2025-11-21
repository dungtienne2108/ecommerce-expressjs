/**
 * Chat Service
 * Xử lý tất cả các operations liên quan đến chat
 */

import axios, { AxiosInstance } from 'axios';
import { socketService } from './socketService';
import {
  Conversation,
  Message,
  SendMessagePayload,
  CreateConversationPayload,
  GetMessagesPayload,
  MarkAsReadPayload,
  EditMessagePayload,
  DeleteMessagePayload,
  TypingPayload,
  TypingIndicator,
  UserStatus,
} from '../types/chat.types';

class ChatService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // ==================== REST API Methods ====================

  /**
   * Lấy danh sách conversations
   */
  async getConversations(limit = 20, offset = 0): Promise<Conversation[]> {
    const response = await this.api.get('/api/chat/conversations', {
      params: { limit, offset },
    });
    return response.data.data;
  }

  /**
   * Lấy chi tiết conversation
   */
  async getConversation(conversationId: string): Promise<Conversation> {
    const response = await this.api.get(`/api/chat/conversations/${conversationId}`);
    return response.data.data;
  }

  /**
   * Lấy messages trong conversation
   */
  async getMessages(
    conversationId: string,
    limit = 50,
    offset = 0,
    before?: string
  ): Promise<Message[]> {
    const response = await this.api.get(
      `/api/chat/conversations/${conversationId}/messages`,
      {
        params: { limit, offset, before },
      }
    );
    return response.data.data;
  }

  /**
   * Tạo conversation mới (REST)
   */
  async createConversationREST(payload: CreateConversationPayload): Promise<Conversation> {
    const response = await this.api.post('/api/chat/conversations', payload);
    return response.data.data;
  }

  /**
   * Gửi message qua REST
   */
  async sendMessageREST(
    conversationId: string,
    content: string,
    type?: string
  ): Promise<Message> {
    const response = await this.api.post(
      `/api/chat/conversations/${conversationId}/messages`,
      { content, type }
    );
    return response.data.data;
  }

  /**
   * Mark as read qua REST
   */
  async markAsReadREST(conversationId: string, messageId?: string): Promise<void> {
    await this.api.put(`/api/chat/conversations/${conversationId}/read`, {
      messageId,
    });
  }

  /**
   * Close conversation
   */
  async closeConversation(conversationId: string): Promise<Conversation> {
    const response = await this.api.put(
      `/api/chat/conversations/${conversationId}/close`
    );
    return response.data.data;
  }

  // ==================== Socket.IO Methods ====================

  /**
   * Tạo conversation mới (Socket)
   */
  async createConversation(payload: CreateConversationPayload): Promise<Conversation> {
    return socketService.emit('chat:create_conversation', payload);
  }

  /**
   * Join conversation room
   */
  async joinConversation(conversationId: string): Promise<void> {
    return socketService.emit('chat:join_conversation', { conversationId });
  }

  /**
   * Leave conversation room
   */
  leaveConversation(conversationId: string): void {
    socketService.emit('chat:leave_conversation', { conversationId });
  }

  /**
   * Gửi message (Socket)
   */
  async sendMessage(payload: SendMessagePayload): Promise<Message> {
    return socketService.emit('chat:send_message', payload);
  }

  /**
   * Lấy messages (Socket)
   */
  async getMessagesSocket(payload: GetMessagesPayload): Promise<Message[]> {
    return socketService.emit('chat:get_messages', payload);
  }

  /**
   * Mark as read (Socket)
   */
  async markAsRead(payload: MarkAsReadPayload): Promise<void> {
    return socketService.emit('chat:mark_as_read', payload);
  }

  /**
   * Edit message
   */
  async editMessage(payload: EditMessagePayload): Promise<Message> {
    return socketService.emit('chat:edit_message', payload);
  }

  /**
   * Delete message
   */
  async deleteMessage(payload: DeleteMessagePayload): Promise<void> {
    return socketService.emit('chat:delete_message', payload);
  }

  /**
   * Start typing indicator
   */
  startTyping(conversationId: string): void {
    socketService.emit('chat:typing_start', { conversationId });
  }

  /**
   * Stop typing indicator
   */
  stopTyping(conversationId: string): void {
    socketService.emit('chat:typing_stop', { conversationId });
  }

  // ==================== Event Listeners ====================

  /**
   * Listen for new messages
   */
  onNewMessage(callback: (message: Message) => void): void {
    socketService.on('chat:new_message', callback);
  }

  /**
   * Remove new message listener
   */
  offNewMessage(callback?: (message: Message) => void): void {
    socketService.off('chat:new_message', callback);
  }

  /**
   * Listen for message updates
   */
  onMessageUpdated(callback: (message: Message) => void): void {
    socketService.on('chat:message_updated', callback);
  }

  offMessageUpdated(callback?: (message: Message) => void): void {
    socketService.off('chat:message_updated', callback);
  }

  /**
   * Listen for message deletions
   */
  onMessageDeleted(
    callback: (data: { messageId: string; conversationId: string }) => void
  ): void {
    socketService.on('chat:message_deleted', callback);
  }

  offMessageDeleted(
    callback?: (data: { messageId: string; conversationId: string }) => void
  ): void {
    socketService.off('chat:message_deleted', callback);
  }

  /**
   * Listen for message read status
   */
  onMessageRead(
    callback: (data: { conversationId: string; userId: string; messageId?: string }) => void
  ): void {
    socketService.on('chat:message_read', callback);
  }

  offMessageRead(
    callback?: (data: {
      conversationId: string;
      userId: string;
      messageId?: string;
    }) => void
  ): void {
    socketService.off('chat:message_read', callback);
  }

  /**
   * Listen for typing indicators
   */
  onUserTyping(callback: (data: TypingIndicator) => void): void {
    socketService.on('chat:user_typing', callback);
  }

  offUserTyping(callback?: (data: TypingIndicator) => void): void {
    socketService.off('chat:user_typing', callback);
  }

  /**
   * Listen for stopped typing
   */
  onUserStoppedTyping(callback: (data: TypingIndicator) => void): void {
    socketService.on('chat:user_stopped_typing', callback);
  }

  offUserStoppedTyping(callback?: (data: TypingIndicator) => void): void {
    socketService.off('chat:user_stopped_typing', callback);
  }

  /**
   * Listen for user status changes
   */
  onUserStatusChanged(callback: (data: UserStatus) => void): void {
    socketService.on('chat:user_status_changed', callback);
  }

  offUserStatusChanged(callback?: (data: UserStatus) => void): void {
    socketService.off('chat:user_status_changed', callback);
  }

  /**
   * Listen for conversation created
   */
  onConversationCreated(callback: (conversation: Conversation) => void): void {
    socketService.on('chat:conversation_created', callback);
  }

  offConversationCreated(callback?: (conversation: Conversation) => void): void {
    socketService.off('chat:conversation_created', callback);
  }

  /**
   * Listen for conversation closed
   */
  onConversationClosed(callback: (conversation: Conversation) => void): void {
    socketService.on('chat:conversation_closed', callback);
  }

  offConversationClosed(callback?: (conversation: Conversation) => void): void {
    socketService.off('chat:conversation_closed', callback);
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    socketService.off('chat:new_message');
    socketService.off('chat:message_updated');
    socketService.off('chat:message_deleted');
    socketService.off('chat:message_read');
    socketService.off('chat:user_typing');
    socketService.off('chat:user_stopped_typing');
    socketService.off('chat:user_status_changed');
    socketService.off('chat:conversation_created');
    socketService.off('chat:conversation_closed');
  }
}

// Export singleton instance
export const chatService = new ChatService();
