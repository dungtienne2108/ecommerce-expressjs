import { PrismaClient, ConversationParticipant, ParticipantRole } from "@prisma/client";
import { IConversationParticipantRepository } from "../interfaces/conversationParticipant.interface";

export class ConversationParticipantRepository implements IConversationParticipantRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    conversationId: string;
    userId: string;
    role: ParticipantRole;
    isMuted?: boolean;
  }): Promise<ConversationParticipant> {
    return this.prisma.conversationParticipant.create({
      data: {
        conversationId: data.conversationId,
        userId: data.userId,
        role: data.role,
        isMuted: data.isMuted ?? false,
      },
    });
  }

  async findById(id: string, include?: any): Promise<ConversationParticipant | null> {
    return this.prisma.conversationParticipant.findUnique({
      where: { id },
      include,
    });
  }

  async findByIdOrThrow(id: string, include?: any): Promise<ConversationParticipant> {
    const participant = await this.findById(id, include);
    if (!participant) {
      throw new Error(`Conversation participant not found with id: ${id}`);
    }
    return participant;
  }

  async findMany(
    where?: any,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: any;
      include?: any;
    }
  ): Promise<ConversationParticipant[]> {
    return this.prisma.conversationParticipant.findMany({
      where,
      skip: options?.skip ?? 0,
      take: options?.take ?? 10,
      orderBy: options?.orderBy,
      include: options?.include,
    });
  }

  async findOne(where: any, include?: any): Promise<ConversationParticipant | null> {
    return this.prisma.conversationParticipant.findFirst({
      where,
      include,
    });
  }

  async update(
    id: string,
    data: {
      role?: ParticipantRole;
      lastReadAt?: Date;
      unreadCount?: number;
      isMuted?: boolean;
      isActive?: boolean;
      leftAt?: Date;
    }
  ): Promise<ConversationParticipant> {
    return this.prisma.conversationParticipant.update({
      where: { id },
      data,
    });
  }

  async updateMany(where: any, data: any): Promise<{ count: number }> {
    return this.prisma.conversationParticipant.updateMany({
      where,
      data,
    });
  }

  async delete(id: string): Promise<ConversationParticipant> {
    return this.prisma.conversationParticipant.delete({
      where: { id },
    });
  }

  async count(where?: any): Promise<number> {
    return this.prisma.conversationParticipant.count({
      where,
    });
  }

  async findByConversationAndUser(
    conversationId: string,
    userId: string,
    include?: any
  ): Promise<ConversationParticipant | null> {
    return this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      include,
    });
  }

  async findByConversationId(
    conversationId: string,
    options?: {
      skip?: number;
      take?: number;
      include?: any;
    }
  ): Promise<ConversationParticipant[]> {
    return this.prisma.conversationParticipant.findMany({
      where: { conversationId },
      skip: options?.skip ?? 0,
      take: options?.take ?? 10,
      include: options?.include,
    });
  }

  async incrementUnreadCount(
    conversationId: string,
    excludeUserId?: string
  ): Promise<{ count: number }> {
    return this.prisma.conversationParticipant.updateMany({
      where: {
        conversationId,
        ...(excludeUserId && { userId: { not: excludeUserId } }),
      },
      data: {
        unreadCount: {
          increment: 1,
        },
      },
    });
  }

  async resetUnreadCount(conversationId: string, userId: string): Promise<void> {
    await this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        unreadCount: 0,
        lastReadAt: new Date(),
      },
    });
  }

  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const participant = await this.findByConversationAndUser(conversationId, userId);
    return participant !== null && participant.isActive;
  }

  async removeParticipant(conversationId: string, userId: string): Promise<ConversationParticipant> {
    return this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    });
  }
}