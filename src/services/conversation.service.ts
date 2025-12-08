import { ParticipantRole } from '@prisma/client';
import { IUnitOfWork } from '../repositories/interfaces/uow.interface';
import { CreateConversationRequest } from '../types/chat.types';
import { ValidationError } from '../errors/AppError';

export class ConversationService {
  constructor(private uow: IUnitOfWork) {}

  async getConversationById(conversationId: string) {
    return this.uow.conversations.findById(conversationId);
  }

  async getConversationsByUserId(userId: string) {
    return this.uow.conversations.findByUserId(userId);
  }

  async createConversation(request: CreateConversationRequest, userId: string) {

    // kiểm tra có conversation nào giữa user và shop chưa
    const conversation = await this.uow.conversations.findByUserIdAndShopId(userId, request.shopId ?? '');
    if (conversation) { // nếu có conversation thì return luôn
      return conversation;
    }

    return this.uow.executeInTransaction(async (uow) => {
      const conversation = await uow.conversations.create({
        type: request.type,
        shopId: request.shopId ?? '',
        title: request.title ?? '',
        subject: request.subject ?? '',
      });

      // tạo participant cho user
      await uow.conversationParticipants.create({
        conversationId: conversation.id,
        userId: userId,
        role: ParticipantRole.CUSTOMER,
      });

      // tạo participant cho shop owner
      if (!request.shopId) {
        throw new ValidationError('Shop ID is required');
      }

      const shop = await uow.shops.findById(request.shopId);
      if (!shop) {
        throw new ValidationError('Shop not found');
      }

      await uow.conversationParticipants.create({
        conversationId: conversation.id,
        userId: shop.ownerId,
        role: ParticipantRole.SHOP_OWNER,
      });

      return conversation;
    });
  }
}
