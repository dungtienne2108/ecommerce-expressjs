import { Conversation, Prisma } from '@prisma/client';
import {
  ConversationType,
  ConversationStatus,
} from "@prisma/client";

export type ConversationWithInclude = Prisma.ConversationGetPayload<{
  include: {
    participants?: true;
    messages?: true;
    shop?: true;
    _count?: true;
  }
}>;

export interface IConversationRepository {
  create(data: {
    type: ConversationType;
    shopId?: string;
    title?: string;
    subject?: string;
  }): Promise<Conversation>;

  findByUserId(userId: string): Promise<ConversationWithInclude[]>;

  findByUserIdAndShopId(userId: string, shopId: string): Promise<Conversation | null>;

  findById(id: string): Promise<ConversationWithInclude | null>;

  findByIdOrThrow(id: string): Promise<ConversationWithInclude>;

  findMany(
    where?: Prisma.ConversationWhereInput,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: any;
      include?: any;
    }
  ): Promise<Conversation[]>;

  findOne(where: any): Promise<ConversationWithInclude | null>;

  update(
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
  ): Promise<Conversation>;

  updateMany(where: any, data: any): Promise<{ count: number }>;

  delete(id: string): Promise<Conversation>;

  count(where?: any): Promise<number>;

  incrementMessageCount(conversationId: string): Promise<void>;

  decrementUnreadCount(conversationId: string, amount: number): Promise<void>;

  updateLastMessage(
    conversationId: string,
    lastMessageAt: Date,
    lastMessageText: string
  ): Promise<void>;
}