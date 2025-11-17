import { ConversationParticipant, Prisma } from "@prisma/client";

export interface IConversationParticipantRepository {
    // Basic CRUD Operations
    /**
     * Tạo mới conversation participant
     * @param data - Dữ liệu conversation participant mới
     */
    create(data: Prisma.ConversationParticipantCreateInput): Promise<ConversationParticipant>;
}