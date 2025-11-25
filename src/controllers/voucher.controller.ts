import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ValidationError } from '../errors/AppError';
import { ApiResponse } from '../types/common';
import { voucherService } from '../config/container';
import { CreateVoucherInput } from '../types/voucher.types';

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
}

export const voucherController = new VoucherController();