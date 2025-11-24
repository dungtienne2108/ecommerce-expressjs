import { SocketService } from '../services/socket.service';

export class SocketUtil {
  static notifyNewMessage(conversationId: string, message: any) {
    SocketService.emitToConversation(conversationId, 'new-message', {
      message,
      timestamp: new Date(),
    });
  }

  static notifyMessageRead(conversationId: string, userId: string, messageIds: string[]) {
    SocketService.emitToConversation(conversationId, 'message-read', {
      userId,
      messageIds,
      timestamp: new Date(),
    });
  }

  static notifyConversationUpdated(conversationId: string, data: any) {
    SocketService.emitToConversation(conversationId, 'conversation-updated', {
      data,
      timestamp: new Date(),
    });
  }

  static notifyUserOnline(userId: string, isOnline: boolean) {
    SocketService.emitToUser(userId, 'user-online-status', {
      userId,
      isOnline,
      timestamp: new Date(),
    });
  }

  static notifyUnreadCountChange(userId: string, conversationId: string, unreadCount: number) {
    SocketService.emitToUser(userId, 'unread-count-changed', {
      conversationId,
      unreadCount,
      timestamp: new Date(),
    });
  }
}

