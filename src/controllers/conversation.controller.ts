import { asyncHandler } from '../middleware/errorHandler';
import { Request, Response } from 'express';
import { ApiResponse } from '../types/common';
import { ValidationError } from '../errors/AppError';
import { CreateConversationRequest } from '../types/chat.types';
import { conversationService } from '../config/container';

export class ConversationController {
  createConversation = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('Không tìm thấy user');
      }

      const request: CreateConversationRequest = req.body;

      const result = await conversationService.createConversation(
        request,
        userId
      );

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Tạo cuộc trò chuyện thành công',
      };
      res.json(response);
    }
  );

  getConversationById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { conversationId } = req.params;
      if (!conversationId) {
        throw new ValidationError('Không tìm thấy conversation ID');
      }
      const result =
        await conversationService.getConversationById(conversationId);
      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy cuộc trò chuyện thành công',
      };
      res.json(response);
    }
  );

  getConversationsByUserId = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('Không tìm thấy user');
      }
      const result = await conversationService.getConversationsByUserId(userId);
      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy danh sách cuộc trò chuyện thành công',
      };
      res.json(response);
    }
  );
}

export const conversationController = new ConversationController();