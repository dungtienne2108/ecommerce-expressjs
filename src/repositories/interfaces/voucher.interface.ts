import { Voucher, VoucherStatus, VoucherScope } from '@prisma/client';
import { CreateVoucherInput, UpdateVoucherInput } from '../../types/voucher.types';

export interface IVoucherRepository {
  findById(id: string): Promise<Voucher | null>;
  findByCode(code: string): Promise<Voucher | null>;
  findActiveByCode(code: string): Promise<Voucher | null>;
  findByShopId(shopId: string, filters?: VoucherFilters): Promise<Voucher[]>;
  findPublicVouchers(filters?: VoucherFilters): Promise<Voucher[]>;
  create(data: CreateVoucherInput): Promise<Voucher>;
  update(id: string, data: UpdateVoucherInput): Promise<Voucher>;
  incrementUsedCount(id: string): Promise<void>;
  checkUserUsageLimit(voucherId: string, userId: string): Promise<number>;
  softDelete(id: string, deletedBy: string): Promise<void>;
}

export interface VoucherFilters {
  status?: VoucherStatus;
  scope?: VoucherScope;
  isPublic?: boolean;
  startDate?: Date;
  endDate?: Date;
}
