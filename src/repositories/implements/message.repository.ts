import { PrismaClient, Message, MessageType, MessageStatus } from "@prisma/client";
import { IMessageRepository, MessageWithInclude } from "../interfaces/message.interface";

export class MessageRepository implements IMessageRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    conversationId: string;
    senderId: string;
    type: MessageType;
    content: string;
    attachments?: any;
    orderId?: string;
    productId?: string;
    metadata?: any;
    replyToId?: string;
  }): Promise<Message> {
    return this.prisma.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: data.senderId,
        type: data.type,
        content: data.content,
        attachments: data.attachments,
        orderId: data.orderId || null,
        productId: data.productId || null,
        metadata: data.metadata,
        replyToId: data.replyToId || null,
      },
    });
  }

  async findById(id: string, include?: any): Promise<MessageWithInclude | null> {
    return this.prisma.message.findUnique({
      where: { id },
      include:{
        sender: true,
        conversation: true,
        replyTo: true,
        _count: true,
      },
    });
  }

  async findByIdOrThrow(id: string, include?: any): Promise<MessageWithInclude> {
    const message = await this.findById(id, include);
    if (!message) {
      throw new Error(`Message not found with id: ${id}`);
    }
    return message;
  }

  async findMany(
    where?: any,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: any;
      include?: any;
    }
  ): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { ...where, deletedAt: null },
      skip: options?.skip ?? 0,
      take: options?.take ?? 10,
      orderBy: options?.orderBy,
      include: options?.include,
    });
  }

  async findOne(where: any, include?: any): Promise<MessageWithInclude | null> {
    return this.prisma.message.findFirst({
      where: { ...where, deletedAt: null },
      include:{
        sender: true,
        conversation: true,
        replyTo: true,
        _count: true,
      },
    });
  }

  async update(
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
  ): Promise<Message> {
    return this.prisma.message.update({
      where: { id },
      data,
    });
  }

  async updateMany(where: any, data: any): Promise<{ count: number }> {
    return this.prisma.message.updateMany({
      where,
      data,
    });
  }

  async delete(id: string): Promise<Message> {
    return this.prisma.message.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async deleteHard(id: string): Promise<Message> {
    return this.prisma.message.delete({
      where: { id },
    });
  }

  async count(where?: any): Promise<number> {
    return this.prisma.message.count({
      where: { ...where, deletedAt: null },
    });
  }

  async findByConversationId(
    conversationId: string,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: any;
      include?: any;
    }
  ): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
      },
      skip: options?.skip ?? 0,
      take: options?.take ?? 0,
      orderBy: options?.orderBy || { createdAt: "desc" },
      include: options?.include,
    });
  }

  async updateStatusBatch(ids: string[], status: MessageStatus): Promise<{ count: number }> {
    return this.prisma.message.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        status,
      },
    });
  }

  async markAsRead(conversationId: string, userId: string): Promise<{ count: number }> {
    return this.prisma.message.updateMany({
      where: {
        conversationId,
        status: { not: "READ" },
      },
      data: {
        status: "READ",
        readAt: new Date(),
      },
    });
  }
}