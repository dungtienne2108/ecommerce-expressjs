import { ShopStatus, ApprovalStatus, Shop, Prisma, DocumentType } from '@prisma/client';
import { PaginationParams } from './common';

export interface ShopFilters extends PaginationParams {
  status?: ShopStatus;
  approvalStatus?: ApprovalStatus;
  category?: string;
  isVerified?: boolean;
  city?: string;
  name?: string;
  location?: {
    city?: string;
    district?: string;
  };
}

export interface ShopIncludes {
  owner?: boolean;
  products?: boolean;
  currentKyc?: boolean;
  kycData?: boolean;
}

export type ShopWithRelations = Prisma.ShopGetPayload<{
  include: {
    owner: true;
    currentKyc: true;
    kycData: true;
  };
}>;

export interface CreateDraftShopInput {
  name: string;
  category?: string;
  email?: string;
  phoneNumber?: string;
  logoUrl?: string;
  street?: string;
  ward?: string;
  district?: string;
  city?: string;
}

export interface ShopResponse{
  id: string;
  name: string;
  category?: string;
  logoUrl?: string;
  rating?: number;
  reviewCount?: number;
  createdAt?: Date;
  address?: string;
  owner?: {
    id: string;
    name: string;
  };
}

export interface UpdateBankAccountInput {
  bankName: string;
  bankAccount: string;
  accountNumber: string;
  taxCode?: string;
}

export interface SubmitKycInput {
  fullName: string;
  birthday: Date;
  personalAddress: string;
  personalPhone: string;
  personalEmail: string;
  identityCard: string;

  // Shop info
  shopName: string;
  taxCode?: string;
  shopAddress: string;
  shopPhone: string;
  shopEmail: string;
  shopRegDate?: Date;

  // Documents
  documents: {
    type: DocumentType;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
  }[];
}

export interface KycResponse{
  
}