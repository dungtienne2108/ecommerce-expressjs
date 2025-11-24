import {
  CartItem,
  Voucher,
  VoucherScope,
  VoucherStatus,
  VoucherType,
} from '@prisma/client';
import { IUnitOfWork } from '../repositories/interfaces/uow.interface';
import { VoucherApplicationResult } from '../types/voucher.types';

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
      isValid: true,
      discountAmount,
      error: '',
    } as VoucherApplicationResult;
  }

  async getVoucherByShop(shopId: string): Promise<Voucher[]> {
    return this.uow.vouchers.findByShopId(shopId, {
      status: VoucherStatus.ACTIVE,
    });
  }
}
