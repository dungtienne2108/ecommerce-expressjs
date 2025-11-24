import { asyncHandler } from '../middleware/errorHandler';
import { Request, Response } from 'express';
import { ApiResponse } from '../types/common';
import { ValidationError } from '../errors/AppError';
import { CreateMessageRequest, GetMessagesRequest } from '../types/chat.types';
import { messageService } from '../config/container';
import { MessageType } from '@prisma/client';

export class MessageController {
  sendMessage = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('Không tìm thấy user');
      }

      const { conversationId } = req.params;
      if (!conversationId) {
        throw new ValidationError('Không tìm thấy conversation ID');
      }

      const request: CreateMessageRequest = {
        conversationId: conversationId,
        content: req.body.content,
        type: req.body.type as MessageType,
        attachments: req.body.attachments,
        orderId: req.body.orderId,
        productId: req.body.productId,
        metadata: req.body.metadata,
        replyToId: req.body.replyToId,
      };

      const result = await messageService.sendMessage(request, userId);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Gửi tin nhắn thành công',
      };
      res.json(response);
    }
  );

  getMessage = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { messageId } = req.params;
      if (!messageId) {
        throw new ValidationError('Không tìm thấy message ID');
      }

      const result = await messageService.getMesssageById(messageId);
      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy tin nhắn thành công',
      };
      res.json(response);
    }
  );

  getMessages = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { conversationId } = req.params;
      if (!conversationId) {
        throw new ValidationError('Không tìm thấy conversation ID');
      }

      const request: GetMessagesRequest = {
        conversationId: conversationId,
        skip: parseInt(req.query.skip as string) || 0,
        take: parseInt(req.query.take as string) || 20,
        orderBy: (req.query.orderBy as 'asc' | 'desc') || 'asc',
      };

      const result = await messageService.getMessages(request);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy danh sách tin nhắn thành công',
      };
      res.json(response);
    }
  );

  markAsRead = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('Không tìm thấy user');
      }

      const { conversationId } = req.params;
      if (!conversationId) {
        throw new ValidationError('Không tìm thấy conversation ID');
      }

      const result = await messageService.markAsRead(conversationId, userId);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Đánh dấu tin nhắn đã đọc thành công',
      };
      res.json(response);
    }
  );

  markMessagesAsRead = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { messageIds } = req.body;

      if (!Array.isArray(messageIds) || messageIds.length === 0) {
        throw new ValidationError('Danh sách message IDs không hợp lệ');
      }
      const result = await messageService.markMessagesAsRead(messageIds);
      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Đánh dấu các tin nhắn đã đọc thành công',
      };
      res.json(response);
    }
  );

  getUnreadCount = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('Không tìm thấy user');
      }

      const { conversationId } = req.params;

      if (!conversationId) {
        throw new ValidationError('Không tìm thấy conversation ID');
      }

      const result = await messageService.getUnreadCount(
        conversationId,
        userId
      );

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy số lượng tin nhắn chưa đọc thành công',
      };
      res.json(response);
    }
  );
}

export const messageController = new MessageController();
