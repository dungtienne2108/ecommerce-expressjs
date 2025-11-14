import { Server, Socket } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/socket-auth.middleware';
import { ChatService } from '../services/chat.service';
import {
  CHAT_EVENTS,
  CHAT_EVENTS_EMIT,
  SOCKET_ROOMS,
  SendMessagePayload,
  CreateConversationPayload,
  JoinConversationPayload,
  MarkAsReadPayload,
  TypingPayload,
  EditMessagePayload,
  DeleteMessagePayload,
  GetMessagesPayload,
} from '../constants/socket-events';

/**
 * Chat Socket Handler
 * Xử lý tất cả các socket events liên quan đến chat
 */
export class ChatHandler {
  constructor(
    private io: Server,
    private chatService: ChatService
  ) {}

  /**
   * Khởi tạo handlers cho một socket connection
   */
  public handleConnection(socket: AuthenticatedSocket): void {
    if (!socket.user) {
      socket.disconnect();
      return;
    }

    const userId = socket.user.id;
    console.log(`💬 User ${socket.user.email} connected to chat`);

    // Join user's personal room
    socket.join(SOCKET_ROOMS.user(userId));

    // Emit user online status
    this.io.emit(CHAT_EVENTS_EMIT.USER_STATUS_CHANGED, {
      userId,
      status: 'online',
    });

    // Register event handlers
    this.registerHandlers(socket);

    // Handle disconnect
    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });
  }

  /**
   * Đăng ký tất cả event handlers
   */
  private registerHandlers(socket: AuthenticatedSocket): void {
    socket.on(CHAT_EVENTS.CREATE_CONVERSATION, (payload: CreateConversationPayload, callback) =>
      this.handleCreateConversation(socket, payload, callback)
    );

    socket.on(CHAT_EVENTS.JOIN_CONVERSATION, (payload: JoinConversationPayload, callback) =>
      this.handleJoinConversation(socket, payload, callback)
    );

    socket.on(CHAT_EVENTS.LEAVE_CONVERSATION, (payload: JoinConversationPayload) =>
      this.handleLeaveConversation(socket, payload)
    );

    socket.on(CHAT_EVENTS.SEND_MESSAGE, (payload: SendMessagePayload, callback) =>
      this.handleSendMessage(socket, payload, callback)
    );

    socket.on(CHAT_EVENTS.GET_MESSAGES, (payload: GetMessagesPayload, callback) =>
      this.handleGetMessages(socket, payload, callback)
    );

    socket.on(CHAT_EVENTS.MARK_AS_READ, (payload: MarkAsReadPayload, callback) =>
      this.handleMarkAsRead(socket, payload, callback)
    );

    socket.on(CHAT_EVENTS.TYPING_START, (payload: TypingPayload) =>
      this.handleTypingStart(socket, payload)
    );

    socket.on(CHAT_EVENTS.TYPING_STOP, (payload: TypingPayload) =>
      this.handleTypingStop(socket, payload)
    );

    socket.on(CHAT_EVENTS.EDIT_MESSAGE, (payload: EditMessagePayload, callback) =>
      this.handleEditMessage(socket, payload, callback)
    );

    socket.on(CHAT_EVENTS.DELETE_MESSAGE, (payload: DeleteMessagePayload, callback) =>
      this.handleDeleteMessage(socket, payload, callback)
    );

    socket.on(CHAT_EVENTS.CLOSE_CONVERSATION, (payload: { conversationId: string }, callback) =>
      this.handleCloseConversation(socket, payload, callback)
    );
  }

  /**
   * Tạo conversation mới
   */
  private async handleCreateConversation(
    socket: AuthenticatedSocket,
    payload: CreateConversationPayload,
    callback: Function
  ): Promise<void> {
    try {
      const userId = socket.user!.id;
      const conversation = await this.chatService.createOrGetConversation({
        userId,
        ...payload,
      });

      // Join conversation room
      socket.join(SOCKET_ROOMS.conversation(conversation.id));

      callback({ success: true, data: conversation });

      // Notify other participants
      socket.to(SOCKET_ROOMS.conversation(conversation.id)).emit(
        CHAT_EVENTS_EMIT.CONVERSATION_CREATED,
        conversation
      );
    } catch (error: any) {
      console.error('Create conversation error:', error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Join conversation room
   */
  private async handleJoinConversation(
    socket: AuthenticatedSocket,
    payload: JoinConversationPayload,
    callback: Function
  ): Promise<void> {
    try {
      const { conversationId } = payload;

      // Join room
      socket.join(SOCKET_ROOMS.conversation(conversationId));

      console.log(`User ${socket.user!.email} joined conversation ${conversationId}`);

      callback({ success: true });
    } catch (error: any) {
      console.error('Join conversation error:', error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Leave conversation room
   */
  private handleLeaveConversation(
    socket: AuthenticatedSocket,
    payload: JoinConversationPayload
  ): void {
    const { conversationId } = payload;
    socket.leave(SOCKET_ROOMS.conversation(conversationId));
    console.log(`User ${socket.user!.email} left conversation ${conversationId}`);
  }

  /**
   * Gửi tin nhắn
   */
  private async handleSendMessage(
    socket: AuthenticatedSocket,
    payload: SendMessagePayload,
    callback: Function
  ): Promise<void> {
    try {
      const userId = socket.user!.id;
      const message = await this.chatService.sendMessage({
        senderId: userId,
        ...payload,
      });

      // Emit to conversation room
      this.io.to(SOCKET_ROOMS.conversation(payload.conversationId)).emit(
        CHAT_EVENTS_EMIT.NEW_MESSAGE,
        message
      );

      callback({ success: true, data: message });
    } catch (error: any) {
      console.error('Send message error:', error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Lấy messages
   */
  private async handleGetMessages(
    socket: AuthenticatedSocket,
    payload: GetMessagesPayload,
    callback: Function
  ): Promise<void> {
    try {
      const userId = socket.user!.id;
      const messages = await this.chatService.getMessages({
        userId,
        ...payload,
      });

      callback({ success: true, data: messages });
    } catch (error: any) {
      console.error('Get messages error:', error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Đánh dấu đã đọc
   */
  private async handleMarkAsRead(
    socket: AuthenticatedSocket,
    payload: MarkAsReadPayload,
    callback: Function
  ): Promise<void> {
    try {
      const userId = socket.user!.id;
      await this.chatService.markAsRead(
        payload.conversationId,
        userId,
        payload.messageId
      );

      // Notify conversation
      socket.to(SOCKET_ROOMS.conversation(payload.conversationId)).emit(
        CHAT_EVENTS_EMIT.MESSAGE_READ,
        {
          conversationId: payload.conversationId,
          userId,
          messageId: payload.messageId,
        }
      );

      callback({ success: true });
    } catch (error: any) {
      console.error('Mark as read error:', error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * User đang typing
   */
  private handleTypingStart(socket: AuthenticatedSocket, payload: TypingPayload): void {
    const user = socket.user!;
    socket.to(SOCKET_ROOMS.conversation(payload.conversationId)).emit(
      CHAT_EVENTS_EMIT.USER_TYPING,
      {
        conversationId: payload.conversationId,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      }
    );
  }

  /**
   * User ngừng typing
   */
  private handleTypingStop(socket: AuthenticatedSocket, payload: TypingPayload): void {
    const user = socket.user!;
    socket.to(SOCKET_ROOMS.conversation(payload.conversationId)).emit(
      CHAT_EVENTS_EMIT.USER_STOPPED_TYPING,
      {
        conversationId: payload.conversationId,
        userId: user.id,
      }
    );
  }

  /**
   * Sửa tin nhắn
   */
  private async handleEditMessage(
    socket: AuthenticatedSocket,
    payload: EditMessagePayload,
    callback: Function
  ): Promise<void> {
    try {
      const userId = socket.user!.id;
      const message = await this.chatService.editMessage(
        payload.messageId,
        userId,
        payload.content
      );

      // Notify conversation
      this.io.to(SOCKET_ROOMS.conversation(message.conversationId)).emit(
        CHAT_EVENTS_EMIT.MESSAGE_UPDATED,
        message
      );

      callback({ success: true, data: message });
    } catch (error: any) {
      console.error('Edit message error:', error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Xóa tin nhắn
   */
  private async handleDeleteMessage(
    socket: AuthenticatedSocket,
    payload: DeleteMessagePayload,
    callback: Function
  ): Promise<void> {
    try {
      const userId = socket.user!.id;
      const message = await this.chatService.deleteMessage(payload.messageId, userId);

      // Notify conversation
      this.io.to(SOCKET_ROOMS.conversation(message.conversationId)).emit(
        CHAT_EVENTS_EMIT.MESSAGE_DELETED,
        { messageId: payload.messageId, conversationId: message.conversationId }
      );

      callback({ success: true });
    } catch (error: any) {
      console.error('Delete message error:', error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Đóng conversation
   */
  private async handleCloseConversation(
    socket: AuthenticatedSocket,
    payload: { conversationId: string },
    callback: Function
  ): Promise<void> {
    try {
      const userId = socket.user!.id;
      const conversation = await this.chatService.closeConversation(
        payload.conversationId,
        userId
      );

      // Notify conversation
      this.io.to(SOCKET_ROOMS.conversation(payload.conversationId)).emit(
        CHAT_EVENTS_EMIT.CONVERSATION_CLOSED,
        conversation
      );

      callback({ success: true, data: conversation });
    } catch (error: any) {
      console.error('Close conversation error:', error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Xử lý disconnect
   */
  private handleDisconnect(socket: AuthenticatedSocket): void {
    if (!socket.user) return;

    const userId = socket.user.id;
    console.log(`User ${socket.user.email} disconnected from chat`);

    // Emit user offline status
    this.io.emit(CHAT_EVENTS_EMIT.USER_STATUS_CHANGED, {
      userId,
      status: 'offline',
    });
  }
}
