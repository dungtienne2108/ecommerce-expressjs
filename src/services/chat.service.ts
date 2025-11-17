import {
  Conversation,
  Message,
  ConversationStatus,
  MessageType,
  ParticipantRole,
} from '@prisma/client';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from '../errors/AppError';
import { prisma } from '../config/prisma';
import { IUnitOfWork } from '../repositories/interfaces/uow.interface';

export interface CreateConversationInput {
  userId: string;
  shopId?: string;
  title?: string;
  subject?: string;
  type?: 'CUSTOMER_SUPPORT' | 'SHOP_TO_CUSTOMER' | 'ADMIN_SUPPORT';
}

export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  content: string;
  type?: MessageType;
  attachments?: any;
  replyToId?: string;
  orderId?: string;
  productId?: string;
}

export interface GetMessagesInput {
  conversationId: string;
  userId: string;
  limit?: number;
  offset?: number;
  before?: string;
}

export class ChatService {
  constructor(private uow: IUnitOfWork) {}

  /**
   * Tạo hoặc lấy conversation hiện có
   */
  async createOrGetConversation(
    input: CreateConversationInput
  ): Promise<Conversation> {
    const { userId, shopId, title, subject, type } = input;

    return this.uow.executeInTransaction(async (uow) => {
      // Nếu có shopId, kiểm tra xem đã có conversation chưa
      if (shopId) {
        const existing = await uow.conversations.findByUserAndShop(
          userId,
          shopId
        );
        if (existing) {
          return existing;
        }

        // Kiểm tra shop tồn tại
        const shop = await prisma.shop.findUnique({ where: { id: shopId } });
        if (!shop) {
          throw new NotFoundError('Shop không tồn tại');
        }
      }

      // Tạo conversation mới
      const conversation = await uow.conversations.create({
        type: type || 'CUSTOMER_SUPPORT',
        title: title || (shopId ? 'Hỗ trợ khách hàng' : 'Cuộc trò chuyện mới'),
        subject: subject ?? null,
        ...(shopId ? { shop: { connect: { id: shopId } } } : {}),
        participants: {
          create: [
            {
              userId,
              role: 'CUSTOMER',
            },
          ],
        },
      });

      // Nếu có shopId, thêm shop owner vào conversation
      if (shopId) {
        const shop = await uow.shops.findById(shopId);

        if (shop) {
          await uow.conversationParticipants.create({
              conversation: { connect: { id: conversation.id } },
              user: { connect: { id: shop.ownerId } },
              role: 'SHOP_OWNER',
          });
        }
      }

      return conversation;
    });
  }

  /**
   * Gửi tin nhắn
   */
  async sendMessage(input: SendMessageInput): Promise<Message> {
    const {
      conversationId,
      senderId,
      content,
      type = 'TEXT',
      attachments,
      replyToId,
      orderId,
      productId,
    } = input;

    return this.uow.executeInTransaction(async (uow) => {
      // Kiểm tra conversation tồn tại
      const conversation = await this.uow.conversations.findById(
        conversationId,
        {
          participants: true,
        }
      );

      if (!conversation) {
        throw new NotFoundError('Conversation không tồn tại');
      }

      // Kiểm tra user có phải là participant không
      const isParticipant = conversation.participants?.some(
        (p: any) => p.userId === senderId && p.isActive
      );

      if (!isParticipant) {
        throw new ForbiddenError(
          'Bạn không có quyền gửi tin nhắn trong conversation này'
        );
      }

      // Kiểm tra conversation đã đóng chưa
      if (conversation.status === 'CLOSED') {
        throw new ValidationError('Conversation đã được đóng');
      }

      // Tạo message
      const message = await this.uow.messages.create({
        conversation: { connect: { id: conversationId } },
        sender: { connect: { id: senderId } },
        content,
        type,
        ...(attachments ? { attachments } : {}),
        ...(replyToId ? { replyTo: { connect: { id: replyToId } } } : {}),
        orderId: orderId ?? null,
        productId: productId ?? null,
      });

      // Cập nhật conversation
      await this.uow.conversations.updateLastMessage(
        conversationId,
        message.sentAt,
        content.substring(0, 100)
      );
      await this.uow.conversations.incrementMessageCount(conversationId);

      // Cập nhật unread count cho các participants khác
      const participants = conversation.participants || [];
      for (const participant of participants) {
        if ((participant as any).userId !== senderId) {
          await prisma.conversationParticipant.update({
            where: { id: (participant as any).id },
            data: {
              unreadCount: {
                increment: 1,
              },
            },
          });
        }
      }

      return message;
    });
  }

  /**
   * Lấy danh sách messages
   */
  async getMessages(input: GetMessagesInput): Promise<Message[]> {
    const { conversationId, userId, limit = 50, offset = 0, before } = input;

    // Kiểm tra user có quyền xem conversation không
    const conversation = await this.uow.conversations.findById(conversationId, {
      participants: true,
    });

    if (!conversation) {
      throw new NotFoundError('Conversation không tồn tại');
    }

    const isParticipant = conversation.participants?.some(
      (p: any) => p.userId === userId && p.isActive
    );

    if (!isParticipant) {
      throw new ForbiddenError('Bạn không có quyền xem conversation này');
    }

    // Lấy messages
    return await this.uow.messages.findByConversationId(
      conversationId,
      limit,
      offset,
      before
    );
  }

  /**
   * Đánh dấu tin nhắn là đã đọc
   */
  async markAsRead(
    conversationId: string,
    userId: string,
    messageId?: string
  ): Promise<void> {
    // Kiểm tra conversation và quyền
    const conversation = await this.uow.conversations.findById(conversationId, {
      participants: true,
    });

    if (!conversation) {
      throw new NotFoundError('Conversation không tồn tại');
    }

    const participant = conversation.participants?.find(
      (p: any) => p.userId === userId && p.isActive
    );

    if (!participant) {
      throw new ForbiddenError('Bạn không có quyền truy cập conversation này');
    }

    if (messageId) {
      // Đánh dấu một message cụ thể
      await this.uow.messages.markAsRead(messageId);
    } else {
      // Đánh dấu tất cả messages
      await this.uow.messages.markAllAsReadInConversation(
        conversationId,
        userId
      );
    }

    // Reset unread count cho participant
    await prisma.conversationParticipant.update({
      where: { id: (participant as any).id },
      data: {
        unreadCount: 0,
        lastReadAt: new Date(),
      },
    });

    // Cập nhật conversation unread count
    const totalUnread = await this.uow.messages.countUnreadInConversation(
      conversationId,
      userId
    );
    await this.uow.conversations.updateUnreadCount(conversationId, totalUnread);
  }

  /**
   * Lấy danh sách conversations của user
   */
  async getUserConversations(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Conversation[]> {
    return await this.uow.conversations.findByUserId(userId, limit, offset);
  }

  /**
   * Lấy danh sách conversations của shop
   */
  async getShopConversations(
    shopId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Conversation[]> {
    return await this.uow.conversations.findByShopId(shopId, limit, offset);
  }

  /**
   * Đóng conversation
   */
  async closeConversation(
    conversationId: string,
    userId: string
  ): Promise<Conversation> {
    // Kiểm tra quyền
    const conversation = await this.uow.conversations.findById(conversationId, {
      participants: true,
    });

    if (!conversation) {
      throw new NotFoundError('Conversation không tồn tại');
    }

    const isParticipant = conversation.participants?.some(
      (p: any) => p.userId === userId && p.isActive
    );

    if (!isParticipant) {
      throw new ForbiddenError('Bạn không có quyền đóng conversation này');
    }

    return await this.uow.conversations.close(conversationId);
  }

  /**
   * Resolve conversation
   */
  async resolveConversation(
    conversationId: string,
    userId: string
  ): Promise<Conversation> {
    // Kiểm tra quyền
    const conversation = await this.uow.conversations.findById(conversationId, {
      participants: true,
    });

    if (!conversation) {
      throw new NotFoundError('Conversation không tồn tại');
    }

    const participant = conversation.participants?.find(
      (p: any) => p.userId === userId && p.isActive
    );

    if (!participant || (participant as any).role !== 'SHOP_OWNER') {
      throw new ForbiddenError(
        'Chỉ shop owner mới có thể resolve conversation'
      );
    }

    return await this.uow.conversations.resolve(conversationId);
  }

  /**
   * Xóa tin nhắn
   */
  async deleteMessage(messageId: string, userId: string): Promise<Message> {
    const message = await this.uow.messages.findById(messageId);

    if (!message) {
      throw new NotFoundError('Message không tồn tại');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenError('Bạn chỉ có thể xóa tin nhắn của mình');
    }

    return await this.uow.messages.softDelete(messageId);
  }

  /**
   * Sửa tin nhắn
   */
  async editMessage(
    messageId: string,
    userId: string,
    content: string
  ): Promise<Message> {
    const message = await this.uow.messages.findById(messageId);

    if (!message) {
      throw new NotFoundError('Message không tồn tại');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenError('Bạn chỉ có thể sửa tin nhắn của mình');
    }

    return await this.uow.messages.update(
      { id: messageId },
      {
        content,
        editedAt: new Date(),
      }
    );
  }
}
