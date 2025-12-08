import {
  CartItem,
  Voucher,
  VoucherScope,
  VoucherStatus,
  VoucherType,
  Prisma,
} from '@prisma/client';
import { IUnitOfWork } from '../repositories/interfaces/uow.interface';
import { CreateVoucherInput, VoucherApplicationResult, VoucherFilters, VoucherResponse } from '../types/voucher.types';
import { PaginatedResponse } from '../types/common';
import redis from '../config/redis';
import { CacheUtil } from '../utils/cache.util';
import { logger } from './logger';

export class VoucherService {
  constructor(private uow: IUnitOfWork) {}

  /**
   * Validate và áp dụng voucher cho đơn hàng
   */
  async validateAndApplyVoucher(
    code: string,
    userId: string,
    shopId: string,
    cartItems: CartItem[],
    subtotal: number
  ): Promise<VoucherApplicationResult> {
    // 1. Tìm voucher theo code
    const voucher = await this.uow.vouchers.findByCode(code);
    // 2. Kiểm tra voucher còn hiệu lực không
    if (
      !voucher ||
      voucher.status !== VoucherStatus.ACTIVE ||
      voucher.endDate < new Date()
    ) {
      return {
        isValid: false,
        discountAmount: 0,
        error: 'Voucher không tồn tại hoặc đã hết hạn',
      } as VoucherApplicationResult;
    }
    // 3. Kiểm tra điều kiện áp dụng (minOrderValue, scope, shop)
    if (
      voucher.minOrderValue &&
      Number(subtotal) < Number(voucher.minOrderValue)
    ) {
      return {
        isValid: false,
        discountAmount: 0,
        error: 'Đơn hàng không đủ điều kiện áp dụng voucher',
      } as VoucherApplicationResult;
    }
    if (voucher.scope === VoucherScope.SHOP && voucher.shopId !== shopId) {
      return {
        isValid: false,
        discountAmount: 0,
        error: 'Voucher chỉ áp dụng cho shop này',
      } as VoucherApplicationResult;
    }
    // 4. Kiểm tra số lượt sử dụng (total, per user)
    if (voucher.totalLimit && voucher.usedCount >= voucher.totalLimit) {
      return {
        isValid: false,
        discountAmount: 0,
        error: 'Voucher đã hết lượt sử dụng',
      } as VoucherApplicationResult;
    }
    if (voucher.limitPerUser && voucher.usedCount >= voucher.limitPerUser) {
      return {
        isValid: false,
        discountAmount: 0,
        error: 'Voucher đã hết lượt sử dụng cho user này',
      } as VoucherApplicationResult;
    }
    // 5. Tính toán discount amount
    let discountAmount = 0;
    if (voucher.type === VoucherType.PERCENTAGE) {
      discountAmount = (Number(subtotal) * Number(voucher.discountValue)) / 100;
    } else if (voucher.type === VoucherType.FIXED_AMOUNT) {
      discountAmount = Number(voucher.discountValue);
    } else if (voucher.type === VoucherType.FREE_SHIPPING) {
      discountAmount = 0;
    }
    // 6. Return kết quả
    return {
      voucherId: voucher.id,
      isValid: true,
      discountAmount,
      error: '',
      type: voucher.type,
    } as VoucherApplicationResult;
  }

  async getVoucherByShop(shopId: string): Promise<VoucherResponse[]> {
    return this.uow.vouchers.findByShopId(shopId, {
      status: VoucherStatus.ACTIVE,
    }).then(vouchers => vouchers.map(this.mapVoucherToResponse));
  }

  async getVoucherByCode(code: string): Promise<VoucherResponse | null> {
    return this.uow.vouchers.findByCode(code).then(voucher => voucher ? this.mapVoucherToResponse(voucher) : null);
  }

  async getVoucherById(voucherId: string): Promise<VoucherResponse | null> {
    return this.uow.vouchers.findById(voucherId).then(voucher => voucher ? this.mapVoucherToResponse(voucher) : null);
  }

  async createVoucher(data: CreateVoucherInput): Promise<VoucherResponse> {
    return this.uow.executeInTransaction(async (uow) => {
      return uow.vouchers.create(data).then(voucher => this.mapVoucherToResponse(voucher));
    });
  }

  async getUserAvailableVouchers(): Promise<VoucherResponse[]> {
    const vouchers = await this.uow.vouchers.findPublicVouchers();
    logger.info('getUserAvailableVouchers', { module: 'VoucherService' }, { vouchers });
    return vouchers.map(voucher => this.mapVoucherToResponse(voucher));
  }

  /**
   * Lấy danh sách vouchers với filters và pagination
   * @param filters VoucherFilters (page, limit, sortBy, sortOrder, status, scope, shopId, searchTerm)
   * @returns PaginatedResponse<VoucherResponse>
   */
  async getVouchers(
    filters: VoucherFilters
  ): Promise<PaginatedResponse<VoucherResponse>> {
    // Tạo cache key từ filters
    const cacheKey = CacheUtil.vouchersByFilters(filters);
    const cacheResult = await redis.get(cacheKey).catch(err => {
      console.error('Redis get error:', err);
      return null;
    });
    if (cacheResult) {
      return JSON.parse(cacheResult);
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    // Xây dựng điều kiện where
    const whereConditions: Prisma.VoucherWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.scope ? { scope: filters.scope } : {}),
      ...(filters.shopId ? { shopId: filters.shopId } : {}),
      ...(filters.searchTerm
        ? {
            OR: [
              { code: { contains: filters.searchTerm, mode: 'insensitive' } },
              { name: { contains: filters.searchTerm, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const voucherFindManyArgs: Prisma.VoucherFindManyArgs = {
      where: whereConditions,
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (page - 1) * limit,
      take: limit,
    };

    const [vouchers, total] = await Promise.all([
      this.uow.vouchers.findMany(voucherFindManyArgs),
      this.uow.vouchers.count(whereConditions),
    ]);

    const result = {
      data: vouchers.map((v) => this.mapVoucherToResponse(v)),
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };

    // Lưu vào cache 15 phút
    await redis.set(cacheKey, JSON.stringify(result), 900);

    return result;
  }

  private mapVoucherToResponse(voucher: Voucher): VoucherResponse {
    return {
      id: voucher.id,
      code: voucher.code,
      name: voucher.name,
      description: voucher.description ?? '',
      type: voucher.type,
      discountValue: Number(voucher.discountValue),
      maxDiscount: Number(voucher.maxDiscount ?? 0),
      minOrderValue: Number(voucher.minOrderValue ?? 0),
      scope: voucher.scope,
      shopId: voucher.shopId ?? null,
      totalLimit: Number(voucher.totalLimit ?? 0),
      usedCount: Number(voucher.usedCount ?? 0),
      limitPerUser: Number(voucher.limitPerUser ?? 0),
      startDate: voucher.startDate,
      endDate: voucher.endDate,
      status: voucher.status,
    };
  }
}
