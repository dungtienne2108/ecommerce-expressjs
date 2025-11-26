import { Server as SocketIOServer, Socket } from 'socket.io';
import {
  AuthenticatedSocket,
  socketAuthMiddleware,
} from '../middleware/socket-auth.middleware';
import { IUnitOfWork } from '../repositories/interfaces/uow.interface';
import { MessageStatus } from '@prisma/client';
import { getAllowedOrigins } from '../middleware/cors';

export class SocketGateway {
  private io: SocketIOServer;
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(
    httpServer: any,
    private uow: IUnitOfWork
  ) {
    // Sử dụng cùng danh sách origins với HTTP CORS
    const allowedOrigins = getAllowedOrigins();

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: (origin, callback) => {
          // Cho phép requests không có origin (mobile apps, Postman)
          if (!origin) {
            return callback(null, true);
          }
          
          if (allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('CORS not allowed for Socket.IO'));
          }
        },
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    this.io.use(socketAuthMiddleware as any);
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.user?.email} connected: ${socket.id}`);

      this.registerUserSocket(socket.user?.id || '', socket.id);

      socket.on('join-conversation', (conversationId: string) => {
        socket.join(`conversation:${conversationId}`);
        console.log(
          `User ${socket.user?.id} joined conversation ${conversationId}`
        );
      });

      socket.on('leave-conversation', (conversationId: string) => {
        socket.leave(`conversation:${conversationId}`);
        console.log(
          `User ${socket.user?.id} left conversation ${conversationId}`
        );
      });

      socket.on('send-message', async (data: any) => {
        try {
          const {
            conversationId,
            content,
            type,
            attachments,
            orderId,
            productId,
            metadata,
            replyToId,
          } = data;
          const userId = socket.user?.id;

          if (!userId || !conversationId) {
            socket.emit('error', { message: 'Invalid request' });
            return;
          }

          const message = await this.uow.messages.create({
            conversationId,
            senderId: userId,
            type: type || 'TEXT',
            content,
            attachments: attachments || [],
            orderId: orderId || '',
            productId: productId || '',
            metadata: metadata || {},
            replyToId: replyToId || '',
          });

          await this.uow.conversations.updateLastMessage(
            conversationId,
            new Date(),
            content.substring(0, 100)
          );

          const messageWithSender = await this.uow.messages.findById(
            message.id
          );

          // Gửi cho tất cả người trong room (bao gồm sender)
          this.io
            .to(`conversation:${conversationId}`)
            .emit('message-received', messageWithSender);

          await this.uow.conversationParticipants.incrementUnreadCount(
            conversationId,
            userId
          );
        } catch (error) {
          console.error('Error sending message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      socket.on('receive-message', async (data: any) => {
        try {
          const { conversationId, messageId } = data;
          const userId = socket.user?.id;

          if (!userId || !conversationId || !messageId) {
            socket.emit('error', { message: 'Invalid request' });
            return;
          }

          const message = await this.uow.messages.findById(messageId);
          if (!message) {
            socket.emit('error', { message: 'Message not found' });
            return;
          }

          // Kiểm tra user có phải participant không
          const isParticipant =
            await this.uow.conversationParticipants.isParticipant(
              conversationId,
              userId
            );
          if (!isParticipant) {
            socket.emit('error', { message: 'You are not a participant' });
            return;
          }

          // Chỉ update status nếu không phải người gửi
          if (message.senderId !== userId) {
            await this.uow.messages.update(messageId, {
              status: MessageStatus.DELIVERED,
            });
          }

          // Emit cho tất cả user trong conversation
          socket
            .to(`conversation:${conversationId}`)
            .emit('message-received-by-user', {
              messageId,
              userId,
              timestamp: new Date(),
            });
        } catch (error) {
          console.error('Error receiving message:', error);
          socket.emit('error', { message: 'Failed to receive message' });
        }
      });

      socket.on('typing', (conversationId: string) => {
        const userId = socket.user?.id;
        socket.to(`conversation:${conversationId}`).emit('user-typing', {
          userId,
          userName: `${socket.user?.firstName} ${socket.user?.lastName}`,
        });
      });

      socket.on('stop-typing', (conversationId: string) => {
        const userId = socket.user?.id;
        socket
          .to(`conversation:${conversationId}`)
          .emit('user-stop-typing', { userId });
      });

      socket.on('mark-as-read', async (data: any) => {
        try {
          const { conversationId, messageIds } = data;
          const userId = socket.user?.id;

          if (!userId) return;

          if (Array.isArray(messageIds) && messageIds.length > 0) {
            await this.uow.messages.updateStatusBatch(messageIds, 'READ');
          }

          await this.uow.conversationParticipants.resetUnreadCount(
            conversationId,
            userId
          );

          this.io
            .to(`conversation:${conversationId}`)
            .emit('messages-marked-read', {
              userId,
              messageIds,
            });
        } catch (error) {
          console.error('Error marking as read:', error);
        }
      });

      socket.on('disconnect', () => {
        const userId = socket.user?.id || '';
        this.unregisterUserSocket(userId, socket.id);
        console.log(`User ${userId} disconnected: ${socket.id}`);
      });
    });
  }

  private registerUserSocket(userId: string, socketId: string) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)?.add(socketId);
  }

  private unregisterUserSocket(userId: string, socketId: string) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  public getIO(): SocketIOServer {
    return this.io;
  }

  public getUserSockets(userId: string): Set<string> {
    return this.userSockets.get(userId) || new Set();
  }

  public isUserOnline(userId: string): boolean {
    return (
      this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0
    );
  }

  public emitToUser(userId: string, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach((socketId) => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  public emitToConversation(conversationId: string, event: string, data: any) {
    this.io.to(`conversation:${conversationId}`).emit(event, data);
  }
}
