import { MessageStatus, MessageType } from '@prisma/client';
import { IUnitOfWork } from '../repositories/interfaces/uow.interface';
import { CreateMessageRequest, GetMessagesRequest } from '../types/chat.types';
import { NotFoundError } from '../errors/AppError';

export class MessageService {
  constructor(private uow: IUnitOfWork) {}

  async sendMessage(request: CreateMessageRequest, senderId: string) {
    return this.uow.executeInTransaction(async (uow) => {
      const isParticipant = await uow.conversationParticipants.isParticipant(
        request.conversationId,
        senderId
      );
      if (!isParticipant) {
        throw new Error(
          'Người dùng không phải là thành viên của cuộc trò chuyện này.'
        );
      }

      const message = await uow.messages.create({
        conversationId: request.conversationId,
        senderId: senderId,
        type: request.type || MessageType.TEXT,
        content: request.content,
        attachments: request.attachments,
        orderId: request.orderId ?? '',
        productId: request.productId ?? '',
        metadata: request.metadata,
        replyToId: request.replyToId ?? '',
      });

      await uow.conversations.updateLastMessage(
        request.conversationId,
        new Date(),
        request.content.substring(0, 100)
      );

      await uow.conversationParticipants.incrementUnreadCount(
        request.conversationId,
        senderId
      );

      return message;
    });
  }

  async getMesssageById(messageId: string) {
    const message = await this.uow.messages.findById(messageId);

    if (!message) {
      throw new NotFoundError('Message not found');
    }
    return message;
  }

  async getMessages(request: GetMessagesRequest) {
    const skip = request.skip || 0;
    const take = request.take || 20;

    const [messages, total] = await Promise.all([
      this.uow.messages.findByConversationId(request.conversationId, {
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: true,
          conversation: true,
          replyTo: true,
          _count: true,
        },
      }),
      this.uow.messages.count({ conversationId: request.conversationId }),
    ]);

    return {
      messages,
      total,
    };
  }

  async markAsRead(conversationId: string, userId: string) {
    return this.uow.executeInTransaction(async (uow) => {
      const isParticipant = await uow.conversationParticipants.isParticipant(
        conversationId,
        userId
      );
      if (!isParticipant) {
        throw new Error(
          'Người dùng không phải là thành viên của cuộc trò chuyện này.'
        );
      }
      await uow.messages.markAsRead(conversationId, userId);
      await uow.conversationParticipants.resetUnreadCount(
        conversationId,
        userId
      );
    });
  }

  async markMessagesAsRead(messageIds: string[]){
    return this.uow.executeInTransaction(async (uow) => {
        await uow.messages.updateStatusBatch(messageIds, MessageStatus.READ);
    });
  }

  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    const participant = await this.uow.conversationParticipants.findByConversationAndUser(
      conversationId,
      userId
    );

    if (!participant) {
      throw new NotFoundError(
        'Người dùng không phải là thành viên của cuộc trò chuyện này.'
      );
    }
    return participant.unreadCount;
  }
}
