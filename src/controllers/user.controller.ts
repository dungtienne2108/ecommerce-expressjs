import { userService } from '../config/container';
import { ValidationError } from '../errors/AppError';
import { asyncHandler } from '../middleware/errorHandler';
import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/common';
import { UserSearchFilters } from '../types/user.types';
import { Gender, UserStatus } from '@prisma/client';
import { updateUserSchema } from '../validators/user.validators';

export class UserController {
  getUserById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user?.id;
      const id = req.params.id;

      if (!userId) {
        throw new ValidationError('Không tìm thấy user');
      }

      if (id && id !== userId && req.user?.roles.every(role => role.type !== 'SYSTEM_ADMIN')) {
        throw new ValidationError('Bạn không có quyền truy cập user này');
      }

      const user = await userService.getUserById(id || userId);

      if (!user) {
        throw new ValidationError(`Không tìm thấy user với id : ${userId}`);
      }

      const response: ApiResponse = {
        success: true,
        data: user,
      };

      res.json(response);
    }
  );

  getUsers = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const filters: UserSearchFilters = {
        search: req.query.search as string,
        status: req.query.status as UserStatus,
        gender: req.query.gender as Gender,
        ageFrom: Number(req.query.ageFrom),
        ageTo: Number(req.query.ageTo),
        createdFrom: new Date(req.query.createdFrom as string),
        createdTo: new Date(req.query.createdTo as string),
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 10,
      };

      const users = await userService.getUsers(filters);
      const response: ApiResponse = {
        success: true,
        data: users,
      };
      res.json(response);
    }
  );

  activate = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user?.id;

      if (!userId) {
        throw new ValidationError('Không tìm thấy user');
      }

      const user = await userService.updateUser(userId, { status: UserStatus.ACTIVE });

      if (!user) {
        throw new ValidationError(`Không tìm thấy user với id : ${userId}`);
      }

      const response: ApiResponse = {
        success: true,
        data: user,
        message: "User đã được kích hoạt"
      };

      res.json(response);
    }
  );

  updateUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User chưa đăng nhập');
      }
      const { error, value } = updateUserSchema.validate(req.body);
      if (error) {
        throw new ValidationError(error.details?.[0]?.message || 'Validation error');
      }
      const user = await userService.updateUser(userId, value);

      const response: ApiResponse = {
        success: true,
        data: user,
        message: 'Cập nhật thông tin user thành công',
      };
      res.json(response);
    });
}

export const userController = new UserController();