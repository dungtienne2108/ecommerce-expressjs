import { Message, MessageType, MessageStatus, Prisma } from "@prisma/client";

export type MessageWithInclude = Prisma.MessageGetPayload<{
  include: {
    conversation?: true;
    sender?: true;
    replyTo?: true;
    _count?: true;
  };
}>;

export interface IMessageRepository {
  create(data: {
    conversationId: string;
    senderId: string;
    type: MessageType;
    content: string;
    attachments?: any;
    orderId?: string;
    productId?: string;
    metadata?: any;
    replyToId?: string;
  }): Promise<Message>;

  findById(id: string, include?: any): Promise<MessageWithInclude | null>;

  findByIdOrThrow(id: string, include?: any): Promise<MessageWithInclude>;

  findMany(
    where?: any,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: any;
      include?: any;
    }
  ): Promise<Message[]>;

  findOne(where: any, include?: any): Promise<MessageWithInclude | null>;

  update(
    id: string,
    data: {
      status?: MessageStatus;
      content?: string;
      deliveredAt?: Date;
      readAt?: Date;
      editedAt?: Date;
      deletedAt?: Date;
      metadata?: any;
    }
  ): Promise<Message>;

  updateMany(where: any, data: any): Promise<{ count: number }>;

  delete(id: string): Promise<Message>;

  deleteHard(id: string): Promise<Message>;

  count(where?: any): Promise<number>;

  findByConversationId(
    conversationId: string,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: any;
      include?: any;
    }
  ): Promise<Message[]>;

  updateStatusBatch(ids: string[], status: MessageStatus): Promise<{ count: number }>;

  markAsRead(conversationId: string, userId: string): Promise<{ count: number }>;
}