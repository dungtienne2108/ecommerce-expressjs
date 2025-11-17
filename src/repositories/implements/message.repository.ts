import { PrismaClient, Prisma, Message } from '@prisma/client';
import { IMessageRepository } from '../interfaces/message.interface';
import { PrismaErrorHandler } from '../../errors/PrismaErrorHandler';
import { DatabaseError } from '../../errors/AppError';

export class MessageRepository implements IMessageRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(
    id: string,
    include?: Prisma.MessageInclude
  ): Promise<Message | null> {
    try {
      return await this.prisma.message.findUnique({
        where: { id },
        include: include ?? null,
      });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Message fetch failed');
    }
  }

  async findUnique(
    where: Prisma.MessageWhereUniqueInput,
    include?: Prisma.MessageInclude
  ): Promise<Message | null> {
    try {
      return await this.prisma.message.findUnique({
        where,
        include: include ?? null,
      });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Message fetch failed');
    }
  }

  async findFirst(
    where: Prisma.MessageWhereInput,
    include?: Prisma.MessageInclude
  ): Promise<Message | null> {
    try {
      return await this.prisma.message.findFirst({
        where,
        include: include ?? null,
      });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Message fetch failed');
    }
  }

  async findMany(args: Prisma.MessageFindManyArgs): Promise<Message[]> {
    try {
      return await this.prisma.message.findMany(args);
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Messages fetch failed');
    }
  }

  async create(data: Prisma.MessageCreateInput): Promise<Message> {
    try {
      return await this.prisma.message.create({ data });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Message creation failed');
    }
  }

  async update(
    where: Prisma.MessageWhereUniqueInput,
    data: Prisma.MessageUpdateInput
  ): Promise<Message> {
    try {
      return await this.prisma.message.update({ where, data });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Message update failed');
    }
  }

  async updateMany(
    where: Prisma.MessageWhereInput,
    data: Prisma.MessageUpdateManyMutationInput
  ): Promise<Prisma.BatchPayload> {
    try {
      return await this.prisma.message.updateMany({ where, data });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Messages update failed');
    }
  }

  async delete(where: Prisma.MessageWhereUniqueInput): Promise<Message> {
    try {
      return await this.prisma.message.update({
        where,
        data: {
          deletedAt: new Date(),
        },
      });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Message deletion failed');
    }
  }

  async deleteMany(where: Prisma.MessageWhereInput): Promise<Prisma.BatchPayload> {
    try {
      return await this.prisma.message.updateMany({
        where,
        data: {
          deletedAt: new Date(),
        },
      });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Messages deletion failed');
    }
  }

  async count(where?: Prisma.MessageWhereInput): Promise<number> {
    try {
      return await this.prisma.message.count({ ...(where ? { where } : {}) });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Messages count failed');
    }
  }

  // Specialized Methods

  async findByConversationId(
    conversationId: string,
    limit: number = 50,
    offset: number = 0,
    before?: string
  ): Promise<Message[]> {
    try {
      const whereClause: Prisma.MessageWhereInput = {
        conversationId,
        deletedAt: null,
      };

      if (before) {
        // Lấy messages trước messageId này (pagination)
        const beforeMessage = await this.prisma.message.findUnique({
          where: { id: before },
          select: { sentAt: true },
        });

        if (beforeMessage) {
          whereClause.sentAt = {
            lt: beforeMessage.sentAt,
          };
        }
      }

      return await this.prisma.message.findMany({
        where: whereClause,
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          replyTo: {
            select: {
              id: true,
              content: true,
              type: true,
              sender: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: {
          sentAt: 'asc',
        },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Messages fetch by conversation failed');
    }
  }

  async findByUserId(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    try {
      return await this.prisma.message.findMany({
        where: {
          senderId: userId,
          deletedAt: null,
        },
        include: {
          conversation: {
            select: {
              id: true,
              title: true,
              type: true,
            },
          },
        },
        orderBy: {
          sentAt: 'desc',
        },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Messages fetch by user failed');
    }
  }

  async markAsRead(messageId: string): Promise<Message> {
    try {
      return await this.prisma.message.update({
        where: { id: messageId },
        data: {
          status: 'READ',
          readAt: new Date(),
        },
      });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Message mark as read failed');
    }
  }

  async markManyAsRead(messageIds: string[]): Promise<Prisma.BatchPayload> {
    try {
      return await this.prisma.message.updateMany({
        where: {
          id: {
            in: messageIds,
          },
        },
        data: {
          status: 'READ',
          readAt: new Date(),
        },
      });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Messages mark as read failed');
    }
  }

  async markAllAsReadInConversation(
    conversationId: string,
    userId: string
  ): Promise<Prisma.BatchPayload> {
    try {
      return await this.prisma.message.updateMany({
        where: {
          conversationId,
          senderId: {
            not: userId, // Không đánh dấu tin nhắn của chính mình
          },
          status: {
            not: 'READ',
          },
          deletedAt: null,
        },
        data: {
          status: 'READ',
          readAt: new Date(),
        },
      });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Messages mark all as read failed');
    }
  }

  async markAsDelivered(messageId: string): Promise<Message> {
    try {
      return await this.prisma.message.update({
        where: { id: messageId },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
        },
      });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Message mark as delivered failed');
    }
  }

  async softDelete(messageId: string): Promise<Message> {
    try {
      return await this.prisma.message.update({
        where: { id: messageId },
        data: {
          deletedAt: new Date(),
        },
      });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Message soft delete failed');
    }
  }

  async countUnreadInConversation(
    conversationId: string,
    userId: string
  ): Promise<number> {
    try {
      return await this.prisma.message.count({
        where: {
          conversationId,
          senderId: {
            not: userId,
          },
          status: {
            not: 'READ',
          },
          deletedAt: null,
        },
      });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Unread messages count failed');
    }
  }

  async getLastMessage(conversationId: string): Promise<Message | null> {
    try {
      return await this.prisma.message.findFirst({
        where: {
          conversationId,
          deletedAt: null,
        },
        orderBy: {
          sentAt: 'desc',
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Last message fetch failed');
    }
  }
}