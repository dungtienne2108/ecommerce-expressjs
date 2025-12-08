import {
  PrismaClient,
  Conversation,
  ConversationType,
  ConversationStatus,
  Prisma,
} from '@prisma/client';
import { ConversationWithInclude, IConversationRepository } from '../interfaces/conversation.interface';

export class ConversationRepository implements IConversationRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    type: ConversationType;
    shopId?: string;
    title?: string;
    subject?: string;
  }): Promise<Conversation> {
    return this.prisma.conversation.create({
      data: {
        type: data.type,
        shopId: data.shopId ?? '',
        title: data.title ?? '',
        subject: data.subject ?? '',
      },
    });
  }

  async findByUserId(
    userId: string,
  ): Promise<ConversationWithInclude[]> {
    return this.prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        shop: true,
        participants: true,
        messages: true,
        _count: true,
      }
    });
  }

  async findByUserIdAndShopId(userId: string, shopId: string): Promise<Conversation | null> {
    return this.prisma.conversation.findFirst({
      where: {
        participants: {
          some: {
            userId: userId,
          },
        },
        shopId: shopId,
      },
    });
  }

  async findById(
    id: string,
  ): Promise<ConversationWithInclude | null> {
    return this.prisma.conversation.findUnique({
      where: { id },
      include: {
        shop: true,
        participants: true,
        messages: true,
        _count: true,
      }
    });
  }

  async findByIdOrThrow(
    id: string,
  ): Promise<ConversationWithInclude>
 {
    const conversation = await this.findById(id);
    if (!conversation) {
      throw new Error(`Conversation not found with id: ${id}`);
    }
    return conversation;
  }

  async findMany(
    where?: any,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: any;
      include?: any;
    }
  ): Promise<Conversation[]> {
    return this.prisma.conversation.findMany({
      where,
      skip: options?.skip ?? 0,
      take: options?.take ?? 0,
      orderBy: options?.orderBy,
      include: options?.include,
    });
  }

  async findOne(
    where: any,
  ): Promise<ConversationWithInclude | null> {
    return this.prisma.conversation.findFirst({
      where,
      include: {
        shop: true,
        participants: true,
        messages: true,
        _count: true,
      }
    });
  }

  async update(
    id: string,
    data: {
      status?: ConversationStatus;
      title?: string;
      subject?: string;
      priority?: number;
      tags?: string[];
      lastMessageAt?: Date;
      lastMessageText?: string;
      totalMessages?: number;
      unreadCount?: number;
      resolvedAt?: Date;
      closedAt?: Date;
    }
  ): Promise<Conversation> {
    return this.prisma.conversation.update({
      where: { id },
      data,
    });
  }

  async updateMany(where: any, data: any): Promise<{ count: number }> {
    return this.prisma.conversation.updateMany({
      where,
      data,
    });
  }

  async delete(id: string): Promise<Conversation> {
    return this.prisma.conversation.delete({
      where: { id },
    });
  }

  async count(where?: any): Promise<number> {
    return this.prisma.conversation.count({
      where,
    });
  }

  async incrementMessageCount(conversationId: string): Promise<void> {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        totalMessages: {
          increment: 1,
        },
      },
    });
  }

  async decrementUnreadCount(
    conversationId: string,
    amount: number
  ): Promise<void> {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        unreadCount: {
          decrement: amount,
        },
      },
    });
  }

  async updateLastMessage(
    conversationId: string,
    lastMessageAt: Date,
    lastMessageText: string
  ): Promise<void> {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt,
        lastMessageText,
      },
    });
  }
}
