import { VoucherType, VoucherStatus, Voucher } from '@prisma/client';
import { PaginationParams } from './common';

export interface CreateVoucherInput {
  code: string;
  name: string;
  description?: string;
  type: VoucherType;
  discountValue: number;
  maxDiscount?: number;
  minOrderValue?: number;
  shopId?: string;
  totalLimit?: number;
  limitPerUser?: number;
  startDate: Date;
  endDate: Date;
  isPublic?: boolean;
  createdBy?: string;
}

export interface UpdateVoucherInput {
  name?: string;
  description?: string;
  discountValue?: number;
  maxDiscount?: number;
  minOrderValue?: number;
  totalLimit?: number;
  limitPerUser?: number;
  startDate?: Date;
  endDate?: Date;
  status?: VoucherStatus;
  isPublic?: boolean;
  updatedBy?: string;
}

export interface VoucherFilters extends PaginationParams {
  status?: VoucherStatus;
  type?: VoucherType;
  shopId?: string;
  isPublic?: boolean;
  search?: string;
}

export interface VoucherResponse {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  type: VoucherType;
  discountValue: number;
  maxDiscount?: number | null;
  minOrderValue?: number | null;
  shopId?: string | null;
  totalLimit?: number | null;
  usedCount: number;
  limitPerUser?: number | null;
  startDate: Date;
  endDate: Date;
  status: VoucherStatus;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoucherValidationResult {
  isValid: boolean;
  voucherId?: string;
  discountAmount: number;
  error?: string;
  errorCode?: string;
}

export interface ApplyVoucherInput {
  code: string;
  userId: string;
  shopId: string;
  subtotal: number;
}

export interface VoucherUsageResponse {
  id: string;
  voucherId: string;
  userId: string;
  orderId?: string | null;
  discountAmount: number;
  usedAt: Date;
  voucher?: VoucherResponse;
}

export interface VoucherListResponse {
  vouchers: VoucherResponse[];
  total: number;
  skip: number;
  take: number;
}
