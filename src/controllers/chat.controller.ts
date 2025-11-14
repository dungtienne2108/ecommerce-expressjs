import { Request, Response, NextFunction } from 'express';
import { ChatService } from '../services/chat.service';
import { ConversationRepository } from '../repositories/implements/conversation.repository';
import { MessageRepository } from '../repositories/implements/message.repository';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types/express';

// Initialize repositories và service
const conversationRepo = new ConversationRepository(prisma);
const messageRepo = new MessageRepository(prisma);
const chatService = new ChatService(conversationRepo, messageRepo);

/**
 * Chat Controller
 * Xử lý các REST API endpoints cho chat
 */
export class ChatController {
  /**
   * GET /api/chat/conversations
   * Lấy danh sách conversations của user
   */
  static async getConversations(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const conversations = await chatService.getUserConversations(userId, limit, offset);

      res.json({
        success: true,
        data: conversations,
        pagination: {
          limit,
          offset,
          total: conversations.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/chat/conversations/:id
   * Lấy chi tiết một conversation
   */
  static async getConversation(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const conversation = await conversationRepo.findById(id, {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
        shop: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      });

      if (!conversation) {
        res.status(404).json({
          success: false,
          message: 'Conversation không tồn tại',
        });
        return;
      }

      // Kiểm tra quyền truy cập
      const isParticipant = conversation.participants?.some(
        (p: any) => p.userId === userId && p.isActive
      );

      if (!isParticipant) {
        res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập conversation này',
        });
        return;
      }

      res.json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/chat/conversations/:id/messages
   * Lấy messages trong conversation
   */
  static async getMessages(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const before = req.query.before as string;

      const messages = await chatService.getMessages({
        conversationId: id,
        userId,
        limit,
        offset,
        before,
      });

      res.json({
        success: true,
        data: messages,
        pagination: {
          limit,
          offset,
          total: messages.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/chat/conversations
   * Tạo conversation mới
   */
  static async createConversation(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { shopId, title, subject, type } = req.body;

      const conversation = await chatService.createOrGetConversation({
        userId,
        shopId,
        title,
        subject,
        type,
      });

      res.status(201).json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/chat/conversations/:id/messages
   * Gửi message (qua REST API)
   */
  static async sendMessage(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { content, type, attachments, replyToId, orderId, productId } = req.body;

      const message = await chatService.sendMessage({
        conversationId: id,
        senderId: userId,
        content,
        type,
        attachments,
        replyToId,
        orderId,
        productId,
      });

      res.status(201).json({
        success: true,
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/chat/conversations/:id/read
   * Đánh dấu messages là đã đọc
   */
  static async markAsRead(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { messageId } = req.body;

      await chatService.markAsRead(id, userId, messageId);

      res.json({
        success: true,
        message: 'Đã đánh dấu là đã đọc',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/chat/conversations/:id/close
   * Đóng conversation
   */
  static async closeConversation(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const conversation = await chatService.closeConversation(id, userId);

      res.json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/chat/conversations/:id/resolve
   * Resolve conversation
   */
  static async resolveConversation(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const conversation = await chatService.resolveConversation(id, userId);

      res.json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/chat/messages/:id
   * Sửa message
   */
  static async editMessage(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { content } = req.body;

      const message = await chatService.editMessage(id, userId, content);

      res.json({
        success: true,
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/chat/messages/:id
   * Xóa message
   */
  static async deleteMessage(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      await chatService.deleteMessage(id, userId);

      res.json({
        success: true,
        message: 'Message đã được xóa',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/chat/shop/:shopId/conversations
   * Lấy conversations của shop (cho shop owner/admin)
   */
  static async getShopConversations(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { shopId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      // TODO: Kiểm tra quyền shop owner/admin

      const conversations = await chatService.getShopConversations(
        shopId,
        limit,
        offset
      );

      res.json({
        success: true,
        data: conversations,
        pagination: {
          limit,
          offset,
          total: conversations.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
