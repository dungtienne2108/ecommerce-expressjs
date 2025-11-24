import { ConversationParticipant, ParticipantRole } from "@prisma/client";

export interface IConversationParticipantRepository {
  create(data: {
    conversationId: string;
    userId: string;
    role: ParticipantRole;
    isMuted?: boolean;
  }): Promise<ConversationParticipant>;

  findById(id: string, include?: any): Promise<ConversationParticipant | null>;

  findByIdOrThrow(id: string, include?: any): Promise<ConversationParticipant>;

  findMany(
    where?: any,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: any;
      include?: any;
    }
  ): Promise<ConversationParticipant[]>;

  findOne(where: any, include?: any): Promise<ConversationParticipant | null>;

  update(
    id: string,
    data: {
      role?: ParticipantRole;
      lastReadAt?: Date;
      unreadCount?: number;
      isMuted?: boolean;
      isActive?: boolean;
      leftAt?: Date;
    }
  ): Promise<ConversationParticipant>;

  updateMany(where: any, data: any): Promise<{ count: number }>;

  delete(id: string): Promise<ConversationParticipant>;

  count(where?: any): Promise<number>;

  findByConversationAndUser(
    conversationId: string,
    userId: string,
    include?: any
  ): Promise<ConversationParticipant | null>;

  findByConversationId(
    conversationId: string,
    options?: {
      skip?: number;
      take?: number;
      include?: any;
    }
  ): Promise<ConversationParticipant[]>;

  incrementUnreadCount(
    conversationId: string,
    excludeUserId?: string
  ): Promise<{ count: number }>;

  resetUnreadCount(conversationId: string, userId: string): Promise<void>;

  isParticipant(conversationId: string, userId: string): Promise<boolean>;

  removeParticipant(conversationId: string, userId: string): Promise<ConversationParticipant>;
}