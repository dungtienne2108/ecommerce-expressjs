import { VoucherScope, VoucherStatus, VoucherType } from "@prisma/client";

export interface CreateVoucherInput {
    code: string;
    name: string;
    description?: string;
    type: VoucherType;
    discountValue: number;
    maxDiscount?: number;
    minOrderValue?: number;
    scope: VoucherScope;
    shopId?: string;
    totalLimit?: number;
    limitPerUser?: number;
    startDate: Date;
    endDate: Date;
    categoryIds?: string[];
    productIds?: string[];
  }

  export interface UpdateVoucherInput {
    name?: string;
    description?: string;
    type?: VoucherType;
    discountValue?: number;
    maxDiscount?: number;
    minOrderValue?: number;
    scope?: VoucherScope;
  }

  export interface VoucherFilters {
    status?: VoucherStatus;
    scope?: VoucherScope;
    isPublic?: boolean;
  }
  
  export interface VoucherApplicationResult {
    isValid: boolean;
    voucherId?: string;
    discountAmount: number;
    error?: string;
    type?: VoucherType;
  }

  export interface VoucherResponse {
    id: string;
    code: string;
    name: string;
    description?: string;
    type: VoucherType;
    discountValue: number;
    maxDiscount?: number;
    minOrderValue?: number;
    scope: VoucherScope;
    shopId?: string | null;
    totalLimit?: number | null;
    usedCount?: number | null;
    limitPerUser?: number | null;
    startDate: Date;
    endDate: Date;
    status: VoucherStatus;
  }
  