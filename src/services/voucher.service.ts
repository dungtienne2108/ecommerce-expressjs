import { VoucherType, VoucherStatus, Decimal } from '@prisma/client';
import { IUnitOfWork } from '../repositories/interfaces/uow.interface';
import {
  CreateVoucherInput,
  UpdateVoucherInput,
  VoucherFilters,
  VoucherResponse,
  VoucherValidationResult,
  ApplyVoucherInput,
  VoucherListResponse,
} from '../types/voucher.types';
import { ValidationError, NotFoundError, ForbiddenError } from '../errors/AppError';

export class VoucherService {
  constructor(private uow: IUnitOfWork) {}

  /**
   * Tạo voucher mới
   */
  async createVoucher(input: CreateVoucherInput): Promise<VoucherResponse> {
    // Kiểm tra code đã tồn tại chưa
    const existingVoucher = await this.uow.vouchers.findByCode(input.code);
    if (existingVoucher) {
      throw new ValidationError('Mã voucher đã tồn tại');
    }

    // Validate dates
    if (new Date(input.startDate) >= new Date(input.endDate)) {
      throw new ValidationError('Ngày bắt đầu phải nhỏ hơn ngày kết thúc');
    }

    // Validate discount value
    if (input.type === VoucherType.PERCENTAGE) {
      if (input.discountValue <= 0 || input.discountValue > 100) {
        throw new ValidationError('Giá trị giảm phần trăm phải từ 0-100');
      }
    } else if (input.discountValue <= 0) {
      throw new ValidationError('Giá trị giảm phải lớn hơn 0');
    }

    const voucher = await this.uow.vouchers.create({
      code: input.code.toUpperCase(),
      name: input.name,
      description: input.description,
      type: input.type,
      discountValue: new Decimal(input.discountValue),
      maxDiscount: input.maxDiscount ? new Decimal(input.maxDiscount) : null,
      minOrderValue: input.minOrderValue ? new Decimal(input.minOrderValue) : null,
      shop: input.shopId ? { connect: { id: input.shopId } } : undefined,
      totalLimit: input.totalLimit,
      limitPerUser: input.limitPerUser,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      isPublic: input.isPublic ?? true,
      status: VoucherStatus.ACTIVE,
      createdBy: input.createdBy,
    });

    return this.mapToResponse(voucher);
  }

  /**
   * Cập nhật voucher
   */
  async updateVoucher(id: string, input: UpdateVoucherInput): Promise<VoucherResponse> {
    const voucher = await this.uow.vouchers.findById(id);
    if (!voucher) {
      throw new NotFoundError('Không tìm thấy voucher');
    }

    const updated = await this.uow.vouchers.update(id, {
      ...(input.name && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.discountValue && { discountValue: new Decimal(input.discountValue) }),
      ...(input.maxDiscount !== undefined && {
        maxDiscount: input.maxDiscount ? new Decimal(input.maxDiscount) : null,
      }),
      ...(input.minOrderValue !== undefined && {
        minOrderValue: input.minOrderValue ? new Decimal(input.minOrderValue) : null,
      }),
      ...(input.totalLimit !== undefined && { totalLimit: input.totalLimit }),
      ...(input.limitPerUser !== undefined && { limitPerUser: input.limitPerUser }),
      ...(input.startDate && { startDate: new Date(input.startDate) }),
      ...(input.endDate && { endDate: new Date(input.endDate) }),
      ...(input.status && { status: input.status }),
      ...(input.isPublic !== undefined && { isPublic: input.isPublic }),
      updatedBy: input.updatedBy,
    });

    return this.mapToResponse(updated);
  }

  /**
   * Validate và tính toán discount khi apply voucher
   */
  async validateAndApplyVoucher(input: ApplyVoucherInput): Promise<VoucherValidationResult> {
    const { code, userId, shopId, subtotal } = input;

    // 1. Tìm voucher
    const voucher = await this.uow.vouchers.findActiveByCode(code.toUpperCase());
    if (!voucher) {
      return {
        isValid: false,
        discountAmount: 0,
        error: 'Mã voucher không hợp lệ hoặc đã hết hạn',
        errorCode: 'INVALID_VOUCHER',
      };
    }

    // 2. Kiểm tra voucher thuộc shop không
    if (voucher.shopId && voucher.shopId !== shopId) {
      return {
        isValid: false,
        discountAmount: 0,
        error: 'Voucher này không áp dụng cho shop này',
        errorCode: 'INVALID_SHOP',
      };
    }

    // 3. Kiểm tra giá trị đơn hàng tối thiểu
    if (voucher.minOrderValue && subtotal < voucher.minOrderValue.toNumber()) {
      return {
        isValid: false,
        discountAmount: 0,
        error: `Đơn hàng tối thiểu ${voucher.minOrderValue.toNumber()} VNĐ để sử dụng voucher này`,
        errorCode: 'MIN_ORDER_VALUE',
      };
    }

    // 4. Kiểm tra tổng số lượt sử dụng
    if (voucher.totalLimit && voucher.usedCount >= voucher.totalLimit) {
      return {
        isValid: false,
        discountAmount: 0,
        error: 'Voucher đã hết lượt sử dụng',
        errorCode: 'DEPLETED',
      };
    }

    // 5. Kiểm tra giới hạn mỗi user
    if (voucher.limitPerUser) {
      const userUsageCount = await this.uow.voucherUsages.countUserUsage(voucher.id, userId);
      if (userUsageCount >= voucher.limitPerUser) {
        return {
          isValid: false,
          discountAmount: 0,
          error: 'Bạn đã hết lượt sử dụng voucher này',
          errorCode: 'USER_LIMIT',
        };
      }
    }

    // 6. Tính toán discount
    let discountAmount = 0;
    if (voucher.type === VoucherType.PERCENTAGE) {
      discountAmount = (subtotal * voucher.discountValue.toNumber()) / 100;
      if (voucher.maxDiscount && discountAmount > voucher.maxDiscount.toNumber()) {
        discountAmount = voucher.maxDiscount.toNumber();
      }
    } else if (voucher.type === VoucherType.FIXED_AMOUNT) {
      discountAmount = Math.min(voucher.discountValue.toNumber(), subtotal);
    } else if (voucher.type === VoucherType.FREE_SHIPPING) {
      // Free shipping sẽ được xử lý riêng trong order service
      discountAmount = 0;
    }

    return {
      isValid: true,
      voucherId: voucher.id,
      discountAmount: Math.round(discountAmount),
    };
  }

  /**
   * Lấy danh sách vouchers
   */
  async getVouchers(filters: VoucherFilters): Promise<VoucherListResponse> {
    const { skip = 0, take = 10, status, type, shopId, isPublic, search } = filters;

    const where: any = {
      deletedAt: null,
    };

    if (status) where.status = status;
    if (type) where.type = type;
    if (shopId) where.shopId = shopId;
    if (isPublic !== undefined) where.isPublic = isPublic;
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [vouchers, total] = await Promise.all([
      this.uow.vouchers.findPublicVouchers({ skip, take }),
      this.uow.vouchers.count(where),
    ]);

    return {
      vouchers: vouchers.map((v) => this.mapToResponse(v)),
      total,
      skip,
      take,
    };
  }

  /**
   * Lấy voucher theo ID
   */
  async getVoucherById(id: string): Promise<VoucherResponse> {
    const voucher = await this.uow.vouchers.findById(id);
    if (!voucher) {
      throw new NotFoundError('Không tìm thấy voucher');
    }
    return this.mapToResponse(voucher);
  }

  /**
   * Lấy voucher theo code
   */
  async getVoucherByCode(code: string): Promise<VoucherResponse> {
    const voucher = await this.uow.vouchers.findByCode(code.toUpperCase());
    if (!voucher) {
      throw new NotFoundError('Không tìm thấy voucher');
    }
    return this.mapToResponse(voucher);
  }

  /**
   * Xóa voucher (soft delete)
   */
  async deleteVoucher(id: string, deletedBy: string): Promise<void> {
    const voucher = await this.uow.vouchers.findById(id);
    if (!voucher) {
      throw new NotFoundError('Không tìm thấy voucher');
    }

    await this.uow.vouchers.softDelete(id, deletedBy);
  }

  /**
   * Map entity to response
   */
  private mapToResponse(voucher: any): VoucherResponse {
    return {
      id: voucher.id,
      code: voucher.code,
      name: voucher.name,
      description: voucher.description,
      type: voucher.type,
      discountValue: voucher.discountValue.toNumber(),
      maxDiscount: voucher.maxDiscount?.toNumber(),
      minOrderValue: voucher.minOrderValue?.toNumber(),
      shopId: voucher.shopId,
      totalLimit: voucher.totalLimit,
      usedCount: voucher.usedCount,
      limitPerUser: voucher.limitPerUser,
      startDate: voucher.startDate,
      endDate: voucher.endDate,
      status: voucher.status,
      isPublic: voucher.isPublic,
      createdAt: voucher.createdAt,
      updatedAt: voucher.updatedAt,
    };
  }
}
