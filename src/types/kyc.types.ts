import { KycStatus } from "@prisma/client";
import { PaginationParams } from "./common";

export interface KycDataFilters extends PaginationParams {
  status?: KycStatus;
  shopId?: string;
  userId?: string;
  submittedAtFrom?: Date;
  submittedAtTo?: Date;
}

export interface KycDataIncludes {
  shop?: boolean;
  user?: boolean;
  documents?: boolean;
  history?: boolean;
  reviewer?: boolean;
}

export interface KycDataResponse{

}

export interface KycDocumentResponse{
  
}

export interface KycDataWithRelations {
  id: string;
  shopId: string;
  userId: string;
  status: KycStatus;
  submittedAt: Date;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  documents?: KycDocumentResponse[];
  history?: any[];
}