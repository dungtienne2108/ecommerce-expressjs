import { Server } from 'socket.io';
import { socketAuthMiddleware } from '../middleware/socket-auth.middleware';
import { ChatHandler } from './chat.handler';
import { ChatService } from '../services/chat.service';
import { ConversationRepository } from '../repositories/implements/conversation.repository';
import { MessageRepository } from '../repositories/implements/message.repository';
import { prisma } from '../config/prisma';
import { SOCKET_CONNECTION } from '../constants/socket-events';

/**
 * Khởi tạo Socket.IO handlers và middleware
 * @param io Socket.IO server instance
 */
export function initializeSocketHandlers(io: Server): void {
  // Apply authentication middleware
  io.use(socketAuthMiddleware);

  // Initialize repositories
  const conversationRepo = new ConversationRepository(prisma);
  const messageRepo = new MessageRepository(prisma);

  // Initialize services
  const chatService = new ChatService(conversationRepo, messageRepo);

  // Initialize handlers
  const chatHandler = new ChatHandler(io, chatService);

  // Handle connections
  io.on(SOCKET_CONNECTION, (socket) => {
    chatHandler.handleConnection(socket as any);
  });

  console.log('✅ Socket.IO handlers initialized');
}
