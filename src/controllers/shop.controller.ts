import { Request, Response } from 'express';
import { ValidationError } from '../errors/AppError';
import { shopService } from '../config/container';
import {
  createDraftShopSchema,
  submitKycSchema,
  updateBankAccountSchema,
} from '../validators/shop.validator';
import { ApiResponse } from '../types/common';
import { asyncHandler } from '../middleware/errorHandler';

export class ShopController {
  findById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      if (!id) {
        throw new ValidationError('Không tìm thấy cửa hàng');
      }
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('Không tìm thấy user');
      }
    const result = await shopService.findById(id);
    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'Tìm thấy cửa hàng',
    };
    res.json(response);
  });

  findByOwnerId = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('Không tìm thấy user');
      }

      const result = await shopService.findByOwnerId(userId);
      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Tìm thấy cửa hàng',
      };
      res.json(response);
    }
  );

  createDraftShop = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { error, value } = createDraftShopSchema.validate(req.body);
      if (error) {
        throw new ValidationError(
          error.details?.[0]?.message || 'Validation error'
        );
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('Không tìm thấy user');
      }

      const result = await shopService.createDraftShop(value, userId);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Tạo cửa hàng nháp thành công',
      };
      res.json(response);
    }
  );

  updateBankAccount = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { error, value } = updateBankAccountSchema.validate(req.body);
      if (error) {
        throw new ValidationError(
          error.details?.[0]?.message || 'Validation error'
        );
      }

      const { shopId } = req.params;
      if (!shopId) {
        throw new ValidationError('Không tìm thấy cửa hàng');
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('Không tìm thấy user');
      }

      const result = await shopService.updateBankAccount(shopId, value, userId);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Cập nhật thông tin tài khoản ngân hàng thành công',
      };
      res.json(response);
    }
  );

  submitKyc = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { error, value } = submitKycSchema.validate(req.body);
      if (error) {
        throw new ValidationError(
          error.details?.[0]?.message || 'Validation error'
        );
      }

      const { shopId } = req.params;
      if (!shopId) {
        throw new ValidationError('Không tìm thấy cửa hàng');
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('Không tìm thấy user');
      }

      const result = await shopService.submitKyc(shopId, value, userId);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Gửi thông tin KYC thành công',
      };
      res.json(response);
    }
  );

  submitForApproval = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { shopId } = req.params;
      if (!shopId) {
        throw new ValidationError('Không tìm thấy cửa hàng');
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('Không tìm thấy user');
      }

      const result = await shopService.submitForApproval(shopId, userId);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Gửi yêu cầu phê duyệt thành công',
      };
      res.json(response);
    }
  );

  approval = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { shopId } = req.params;
      if (!shopId) {
        throw new ValidationError('Không tìm thấy cửa hàng');
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('Không tìm thấy user');
      }

      const result = await shopService.approveShop(shopId, userId);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Đã xác nhận yêu cầu tạo shop',
      };
      res.json(response);
    }
  );

  reject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { shopId } = req.params;
    if (!shopId) {
      throw new ValidationError('Không tìm thấy cửa hàng');
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new ValidationError('Không tìm thấy user');
    }

    const rejectionReason = req.body?.rejectionReason;
    if (!rejectionReason) {
      throw new ValidationError('Vui lòng cung cấp lý do từ chối');
    }

    const result = await shopService.rejectShop(
      shopId,
      rejectionReason,
      userId
    );

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'Đã từ chối yêu cầu tạo shop',
    };
    res.json(response);
  });

  findTopRatedShops = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      
      const result = await shopService.findTopRatedShops(limit);
      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy danh sách shop có rating cao nhất thành công',
      };
      res.json(response);
    }
  );
}

export const shopController = new ShopController();
