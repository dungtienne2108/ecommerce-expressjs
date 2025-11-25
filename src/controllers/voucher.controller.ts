import { Request, Response } from 'express';
import { VoucherService } from '../services/voucher.service';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse } from '../types/common';
import { CreateVoucherInput, UpdateVoucherInput, VoucherFilters } from '../types/voucher.types';
import { ValidationError } from '../errors/AppError';
import { UnitOfWork } from '../repositories/implements/uow.repository';
import prisma from '../config/database';

const uow = new UnitOfWork(prisma);
const voucherService = new VoucherService(uow);

export class VoucherController {
  /**
   * Tạo voucher mới (SELLER, ADMIN)
   */
  createVoucher = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ValidationError('Không xác định được người dùng');
    }

    const input: CreateVoucherInput = {
      ...req.body,
      createdBy: userId,
    };

    const voucher = await voucherService.createVoucher(input);

    const response: ApiResponse = {
      success: true,
      data: voucher,
      message: 'Tạo voucher thành công',
    };

    res.status(201).json(response);
  });

  /**
   * Cập nhật voucher
   */
  updateVoucher = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.id;

    const input: UpdateVoucherInput = {
      ...req.body,
      updatedBy: userId,
    };

    const voucher = await voucherService.updateVoucher(id, input);

    const response: ApiResponse = {
      success: true,
      data: voucher,
      message: 'Cập nhật voucher thành công',
    };

    res.status(200).json(response);
  });

  /**
   * Lấy danh sách vouchers
   */
  getVouchers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters: VoucherFilters = {
      skip: parseInt(req.query.skip as string) || 0,
      take: parseInt(req.query.take as string) || 10,
      status: req.query.status as any,
      type: req.query.type as any,
      shopId: req.query.shopId as string,
      isPublic: req.query.isPublic === 'true' ? true : req.query.isPublic === 'false' ? false : undefined,
      search: req.query.search as string,
    };

    const result = await voucherService.getVouchers(filters);

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'Lấy danh sách voucher thành công',
    };

    res.status(200).json(response);
  });

  /**
   * Lấy voucher theo ID
   */
  getVoucherById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const voucher = await voucherService.getVoucherById(id);

    const response: ApiResponse = {
      success: true,
      data: voucher,
      message: 'Lấy thông tin voucher thành công',
    };

    res.status(200).json(response);
  });

  /**
   * Lấy voucher theo code
   */
  getVoucherByCode = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { code } = req.params;

    const voucher = await voucherService.getVoucherByCode(code);

    const response: ApiResponse = {
      success: true,
      data: voucher,
      message: 'Lấy thông tin voucher thành công',
    };

    res.status(200).json(response);
  });

  /**
   * Validate voucher
   */
  validateVoucher = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ValidationError('Không xác định được người dùng');
    }

    const { code, shopId, subtotal } = req.body;

    if (!code || !shopId || subtotal === undefined) {
      throw new ValidationError('Thiếu thông tin validate voucher');
    }

    const result = await voucherService.validateAndApplyVoucher({
      code,
      userId,
      shopId,
      subtotal: parseFloat(subtotal),
    });

    const response: ApiResponse = {
      success: result.isValid,
      data: result,
      message: result.isValid ? 'Voucher hợp lệ' : result.error || 'Voucher không hợp lệ',
    };

    res.status(200).json(response);
  });

  /**
   * Xóa voucher (soft delete)
   */
  deleteVoucher = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('Không xác định được người dùng');
    }

    await voucherService.deleteVoucher(id, userId);

    const response: ApiResponse = {
      success: true,
      data: null,
      message: 'Xóa voucher thành công',
    };

    res.status(200).json(response);
  });
}

export const voucherController = new VoucherController();
