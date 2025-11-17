import { Request, Response, NextFunction } from 'express';
import { ChatService } from '../services/chat.service';
import { ConversationRepository } from '../repositories/implements/conversation.repository';
import { MessageRepository } from '../repositories/implements/message.repository';
import { prisma } from '../config/prisma';
import { ApiResponse } from '../types/common';
import { chatService } from '../config/container';

// Initialize repositories và service
const conversationRepo = new ConversationRepository(prisma);
const messageRepo = new MessageRepository(prisma);

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
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const conversations = await chatService.getUserConversations(userId, limit, offset);

      const response: ApiResponse = {
        success: true,
        data: conversations,
        message: 'Lấy danh sách conversations thành công',
      }

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/chat/conversations/:id
   * Lấy chi tiết một conversation
   */
  static async getConversation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Conversation ID là bắt buộc',
        });
        return;
      }

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

      const response: ApiResponse = {
        success: true,
        data: conversation,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/chat/conversations/:id/messages
   * Lấy messages trong conversation
   */
  static async getMessages(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const before = req.query.before as string;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Conversation ID là bắt buộc',
        });
        return;
      }

      const messages = await chatService.getMessages({
        conversationId: id,
        userId,
        limit,
        offset,
        before,
      });

      const response: ApiResponse = {
        success: true,
        data: messages,
        message: 'Lấy danh sách messages thành công',
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/chat/conversations
   * Tạo conversation mới
   */
  static async createConversation(
    req: Request,
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

      const response: ApiResponse = {
        success: true,
        data: conversation,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/chat/conversations/:id/messages
   * Gửi message (qua REST API)
   */
  static async sendMessage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { content, type, attachments, replyToId, orderId, productId } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Conversation ID là bắt buộc',
        });
        return;
      }

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

      const response: ApiResponse = {
        success: true,
        data: message,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/chat/conversations/:id/read
   * Đánh dấu messages là đã đọc
   */
  static async markAsRead(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { messageId } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Conversation ID là bắt buộc',
        });
        return;
      }

      await chatService.markAsRead(id, userId, messageId);

      const response: ApiResponse = {
        success: true,
        message: 'Đã đánh dấu là đã đọc',
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/chat/conversations/:id/close
   * Đóng conversation
   */
  static async closeConversation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Conversation ID là bắt buộc',
        });
        return;
      }

      const conversation = await chatService.closeConversation(id, userId);

      const response: ApiResponse = {
        success: true,
        data: conversation,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/chat/conversations/:id/resolve
   * Resolve conversation
   */
  static async resolveConversation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Conversation ID là bắt buộc',
        });
        return;
      }

      const conversation = await chatService.resolveConversation(id, userId);

      const response: ApiResponse = {
        success: true,
        data: conversation,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/chat/messages/:id
   * Sửa message
   */
  static async editMessage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { content } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Message ID là bắt buộc',
        });
        return;
      }

      const message = await chatService.editMessage(id, userId, content);

      const response: ApiResponse = {
        success: true,
        data: message,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/chat/messages/:id
   * Xóa message
   */
  static async deleteMessage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Message ID là bắt buộc',
        });
        return;
      }

      await chatService.deleteMessage(id, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Message đã được xóa',
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/chat/shop/:shopId/conversations
   * Lấy conversations của shop (cho shop owner/admin)
   */
  static async getShopConversations(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { shopId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!shopId) {
        res.status(400).json({
          success: false,
          message: 'Shop ID là bắt buộc',
        });
        return;
      }

      // TODO: Kiểm tra quyền shop owner/admin

      const conversations = await chatService.getShopConversations(
        shopId,
        limit,
        offset
      );

      const response: ApiResponse = {
        success: true,
        data: conversations,
        message: 'Lấy danh sách conversations của shop thành công',
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}