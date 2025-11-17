import { ConversationParticipant, Prisma, PrismaClient } from "@prisma/client";
import { IConversationParticipantRepository } from "../interfaces/conversationParticipant.interface";

export class ConversationParticipantRepository implements IConversationParticipantRepository {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async create(data: Prisma.ConversationParticipantCreateInput): Promise<ConversationParticipant> {
        return await this.prisma.conversationParticipant.create({
            data,
        });
    }
}