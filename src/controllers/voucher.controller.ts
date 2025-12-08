import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ValidationError } from '../errors/AppError';
import { ApiResponse } from '../types/common';
import { voucherService } from '../config/container';
import { CreateVoucherInput, VoucherFilters } from '../types/voucher.types';
import { logger } from '../services/logger';
import { VoucherScope, VoucherStatus } from '@prisma/client';

export class VoucherController {
  createVoucher = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ValidationError('Không tìm thấy user');
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

  getVouchers = asyncHandler(async (req: Request, res: Response) => {
    const filters: VoucherFilters = {
      status: req.query.status as VoucherStatus,
      scope: req.query.scope as VoucherScope,
      shopId: req.query.shopId as string,
      searchTerm: req.query.searchTerm as string,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 10,
    };
    const vouchers = await voucherService.getVouchers(filters);
    const response: ApiResponse = {
      success: true,
      data: vouchers,
      message: 'Lấy danh sách voucher thành công',
    };
    res.status(200).json(response);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError('ID voucher không hợp lệ');
    }

    const voucher = await voucherService.getVoucherById(id);
    const response: ApiResponse = {
      success: true,
      data: voucher,
      message: 'Lấy voucher thành công',
    };

    res.status(200).json(response);
  });

  getByCode = asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.params;
    if (!code) {
      throw new ValidationError('Code voucher không hợp lệ');
    }
    const voucher = await voucherService.getVoucherByCode(code);
    const response: ApiResponse = {
      success: true,
      data: voucher,
      message: 'Lấy voucher thành công',
    };
    res.status(200).json(response);
  });

  getPublicVouchers = asyncHandler(async (req: Request, res: Response) => {
    logger.info('getPublicVouchers', { module: 'VoucherController' });
    const vouchers = await voucherService.getUserAvailableVouchers();
    logger.info('getPublicVouchers', { module: 'VoucherController' }, { vouchers });
    const response: ApiResponse = {
      success: true,
      data: vouchers,
      message: 'Lấy danh sách voucher công khai thành công',
    };
    res.status(200).json(response);
  });

  getShopVouchers = asyncHandler(async (req: Request, res: Response) => {
    const { shopId } = req.params;
    if (!shopId) {
      throw new ValidationError('Shop ID không hợp lệ');
    }
    const vouchers = await voucherService.getVoucherByShop(shopId);
    const response: ApiResponse = {
      success: true,
      data: vouchers,
      message: 'Lấy danh sách voucher của shop thành công',
    };
    res.status(200).json(response);
  });
}

export const voucherController = new VoucherController();