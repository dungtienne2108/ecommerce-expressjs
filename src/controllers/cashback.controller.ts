import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import {
  createCashbackSchema,
  getCashbacksQuerySchema,
  processCashbackSchema,
} from '../validators/cashback.validators';
import { ValidationError, ForbiddenError } from '../errors/AppError';
import { cashbackService } from '../config/container';
import { ApiResponse } from '../types/common';

export class CashbackController {
  /**
   * @desc Tạo cashback cho payment
   * @route POST /api/cashbacks
   */
  createCashback = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { error, value } = createCashbackSchema.validate(req.body);
      if (error) {
        throw new ValidationError(
          error.details?.[0]?.message || 'Dữ liệu không hợp lệ'
        );
      }

      const result = await cashbackService.createCashback(value.paymentId, {
        userId: value.userId,
        percentage: value.percentage,
        amount: value.amount,
        walletAddress: value.walletAddress,
        blockchainNetwork: value.blockchainNetwork,
        eligibleAt: value.eligibleAt,
        expiresAt: value.expiresAt,
        metadata: value.metadata,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Tạo cashback thành công',
        data: result,
      };
      res.status(201).json(response);
    }
  );

  /**
   * @desc Lấy thông tin cashback theo ID
   * @route GET /api/cashbacks/:cashbackId
   */
  getCashbackById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { cashbackId } = req.params;
      if (!cashbackId) {
        throw new ValidationError('Cashback ID là bắt buộc');
      }

      const userId = req.user?.id;
      const result = await cashbackService.getCashbackById(cashbackId, userId);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy thông tin cashback thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Lấy danh sách cashback của user hiện tại
   * @route GET /api/my-cashbacks
   */
  getMyCashbacks = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { error, value } = getCashbacksQuerySchema.validate(req.query);
      if (error) {
        throw new ValidationError(
          error.details?.[0]?.message || 'Dữ liệu không hợp lệ'
        );
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User chưa đăng nhập');
      }

      const result = await cashbackService.getUserCashbacks(userId, {
        page: value.page,
        limit: value.limit,
        status: value.status,
      });

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy danh sách cashback thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Lấy danh sách cashback của user khác (Admin only)
   * @route GET /api/users/:userId/cashbacks
   */
  getUserCashbacks = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { userId } = req.params;
      if (!userId) {
        throw new ValidationError('User ID là bắt buộc');
      }

      const { error, value } = getCashbacksQuerySchema.validate(req.query);
      if (error) {
        throw new ValidationError(
          error.details?.[0]?.message || 'Dữ liệu không hợp lệ'
        );
      }

      const result = await cashbackService.getUserCashbacks(userId, {
        page: value.page,
        limit: value.limit,
        status: value.status,
      });

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy danh sách cashback thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Xử lý gửi cashback lên blockchain (Admin only)
   * @route POST /api/cashbacks/:cashbackId/process
   */
  processCashback = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { cashbackId } = req.params;
      if (!cashbackId) {
        throw new ValidationError('Cashback ID là bắt buộc');
      }

      const result = await cashbackService.processCashback(cashbackId);

      const response: ApiResponse = {
        success: result.success,
        message: result.message,
        data: result,
      };
      res.json(response);
    }
  );

  /**
   * @desc Xử lý hàng loạt pending cashbacks (Admin only)
   * @route POST /api/cashbacks/process-pending
   */
  processPendingCashbacks = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { limit } = req.body;

      const results = await cashbackService.processPendingCashbacks(
        limit || 50
      );

      const successCount = results.filter((r: { success: any; }) => r.success).length;
      const failCount = results.filter((r: { success: any; }) => !r.success).length;

      const response: ApiResponse = {
        success: true,
        message: `Xử lý ${successCount} cashback thành công, ${failCount} thất bại`,
        data: {
          total: results.length,
          success: successCount,
          failed: failCount,
          results,
        },
      };
      res.json(response);
    }
  );

  /**
   * @desc Retry các cashback failed (Admin only)
   * @route POST /api/cashbacks/retry-failed
   */
  retryFailedCashbacks = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { maxRetries } = req.body;

      const results = await cashbackService.retryFailedCashbacks(
        maxRetries || 3
      );

      const successCount = results.filter((r: { success: any; }) => r.success).length;

      const response: ApiResponse = {
        success: true,
        message: `Retry thành công ${successCount} cashback`,
        data: {
          total: results.length,
          success: successCount,
          results,
        },
      };
      res.json(response);
    }
  );

  /**
   * @desc Hủy các cashback đã hết hạn (Admin only)
   * @route POST /api/cashbacks/cancel-expired
   */
  cancelExpiredCashbacks = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const count = await cashbackService.cancelExpiredCashbacks();

      const response: ApiResponse = {
        success: true,
        message: `Đã hủy ${count} cashback hết hạn`,
        data: { cancelledCount: count },
      };
      res.json(response);
    }
  );

  /**
   * @desc Verify blockchain transaction
   * @route GET /api/cashbacks/:cashbackId/verify
   */
  verifyCashback = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { cashbackId } = req.params;
      if (!cashbackId) {
        throw new ValidationError('Cashback ID là bắt buộc');
      }

      const isValid = await cashbackService.verifyCashbackTransaction(
        cashbackId
      );

      const response: ApiResponse = {
        success: true,
        data: { isValid },
        message: isValid
          ? 'Transaction hợp lệ'
          : 'Transaction không hợp lệ hoặc chưa được confirm',
      };
      res.json(response);
    }
  );

  /**
   * @desc Thống kê cashback
   * @route GET /api/cashbacks/statistics
   */
  getStatistics = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { userId, startDate, endDate, status } = req.query;

      const result = await cashbackService.getCashbackStatistics({
        userId: userId as string,
        startDate: startDate ? new Date(startDate as string) : new Date(0),
        endDate: endDate ? new Date(endDate as string) : new Date(),
        status: status as any,
      });

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy thống kê cashback thành công',
      };
      res.json(response);
    }
  );
}

export const cashbackController = new CashbackController();