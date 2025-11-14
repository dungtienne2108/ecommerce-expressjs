import { PrismaClient, Prisma, Conversation } from '@prisma/client';
import { IConversationRepository } from '../interfaces/conversation.interface';
import { PrismaErrorHandler } from '../../errors/PrismaErrorHandler';
import { DatabaseError } from '../../errors/AppError';

export class ConversationRepository implements IConversationRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(
    id: string,
    include?: Prisma.ConversationInclude
  ): Promise<Conversation | null> {
    try {
      return await this.prisma.conversation.findUnique({
        where: { id },
        include: include ?? undefined,
      });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Conversation fetch failed');
    }
  }

  async findUnique(
    where: Prisma.ConversationWhereUniqueInput,
    include?: Prisma.ConversationInclude
  ): Promise<Conversation | null> {
    try {
      return await this.prisma.conversation.findUnique({
        where,
        include: include ?? undefined,
      });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Conversation fetch failed');
    }
  }

  async findFirst(
    where: Prisma.ConversationWhereInput,
    include?: Prisma.ConversationInclude
  ): Promise<Conversation | null> {
    try {
      return await this.prisma.conversation.findFirst({
        where,
        include: include ?? undefined,
      });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Conversation fetch failed');
    }
  }

  async findMany(args: Prisma.ConversationFindManyArgs): Promise<Conversation[]> {
    try {
      return await this.prisma.conversation.findMany(args);
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Conversations fetch failed');
    }
  }

  async create(data: Prisma.ConversationCreateInput): Promise<Conversation> {
    try {
      return await this.prisma.conversation.create({ data });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Conversation creation failed');
    }
  }

  async update(
    where: Prisma.ConversationWhereUniqueInput,
    data: Prisma.ConversationUpdateInput
  ): Promise<Conversation> {
    try {
      return await this.prisma.conversation.update({ where, data });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Conversation update failed');
    }
  }

  async updateMany(
    where: Prisma.ConversationWhereInput,
    data: Prisma.ConversationUpdateManyMutationInput
  ): Promise<Prisma.BatchPayload> {
    try {
      return await this.prisma.conversation.updateMany({ where, data });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Conversations update failed');
    }
  }

  async delete(where: Prisma.ConversationWhereUniqueInput): Promise<Conversation> {
    try {
      return await this.prisma.conversation.delete({ where });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Conversation deletion failed');
    }
  }

  async deleteMany(where: Prisma.ConversationWhereInput): Promise<Prisma.BatchPayload> {
    try {
      return await this.prisma.conversation.deleteMany({ where });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Conversations deletion failed');
    }
  }

  async count(where?: Prisma.ConversationWhereInput): Promise<number> {
    try {
      return await this.prisma.conversation.count({ where });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Conversations count failed');
    }
  }

  // Specialized Methods

  async findByUserId(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Conversation[]> {
    try {
      return await this.prisma.conversation.findMany({
        where: {
          participants: {
            some: {
              userId,
              isActive: true,
            },
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          shop: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: {
          lastMessageAt: 'desc',
        },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Conversations fetch by user failed');
    }
  }

  async findByShopId(
    shopId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Conversation[]> {
    try {
      return await this.prisma.conversation.findMany({
        where: {
          shopId,
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: {
          lastMessageAt: 'desc',
        },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Conversations fetch by shop failed');
    }
  }

  async findByUserAndShop(
    userId: string,
    shopId: string
  ): Promise<Conversation | null> {
    try {
      return await this.prisma.conversation.findFirst({
        where: {
          shopId,
          participants: {
            some: {
              userId,
              isActive: true,
            },
          },
          status: {
            not: 'CLOSED',
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          shop: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Conversation fetch by user and shop failed');
    }
  }

  async updateLastMessage(
    conversationId: string,
    lastMessageAt: Date,
    lastMessageText: string
  ): Promise<Conversation> {
    try {
      return await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt,
          lastMessageText,
        },
      });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Conversation last message update failed');
    }
  }

  async incrementMessageCount(
    conversationId: string,
    increment: number = 1
  ): Promise<Conversation> {
    try {
      return await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          totalMessages: {
            increment,
          },
        },
      });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Conversation message count increment failed');
    }
  }

  async updateUnreadCount(
    conversationId: string,
    count: number
  ): Promise<Conversation> {
    try {
      return await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          unreadCount: count,
        },
      });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Conversation unread count update failed');
    }
  }

  async close(conversationId: string): Promise<Conversation> {
    try {
      return await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
        },
      });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Conversation close failed');
    }
  }

  async resolve(conversationId: string): Promise<Conversation> {
    try {
      return await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
        },
      });
    } catch (error) {
      if ((error as any).code?.startsWith('P')) {
        throw PrismaErrorHandler.handle(error);
      }
      throw new DatabaseError('Conversation resolve failed');
    }
  }
}
