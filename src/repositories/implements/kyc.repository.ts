import {
  DocumentStatus,
  KycData,
  KycDocument,
  KycHistory,
  KycStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { IKycDataRepository } from '../interfaces/kyc.interface';
import { KycDataFilters, KycDataIncludes, KycDataWithRelations } from '../../types/kyc.types';
import { PaginationParams } from '../../types/common';

export class KycDataRepository implements IKycDataRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: Prisma.KycDataCreateInput): Promise<KycData> {
    return this.prisma.kycData.create({ data });
  }

  async findById(id: string, includes?: KycDataIncludes): Promise<KycData | null> {
    return this.prisma.kycData.findUnique({ where: { id }, include: includes ?? null });
  }

  async findByShopId(shopId: string): Promise<KycData | null> {
    return this.prisma.kycData.findFirst({ where: { shopId } });
  }

  async update(id: string, data: Prisma.KycDataUpdateInput): Promise<KycData> {
    return this.prisma.kycData.update({ where: { id }, data });
  }

  async findMany(filters: KycDataFilters): Promise<KycData[]> {
    const where: Prisma.KycDataWhereInput = {};

    if (filters.shopId) {
      where.shopId = filters.shopId;
    }
    if (filters.status) {
      where.status = filters.status;
    }

    return this.prisma.kycData.findMany({ where });
  }

  async findPendingReview(pagination?: PaginationParams): Promise<KycData[]> {
    const where: Prisma.KycDataWhereInput = {
      status: 'PENDING',
    };

    return this.prisma.kycData.findMany({
      where,
      skip: pagination?.page
        ? (pagination.page - 1) * (pagination.limit ?? 10)
        : 0,
      take: pagination?.limit ?? 10,
    });
  }

  async findByStatus(status: KycStatus): Promise<KycData[]> {
    return this.prisma.kycData.findMany({ where: { status } });
  }

  async findExpiredKyc(): Promise<KycData[]> {
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() - 6); // Example: 6 months ago

    return this.prisma.kycData.findMany({
      where: {
        createdAt: { lt: expirationDate },
        status: 'APPROVED',
      },
    });
  }

  async updateStatus(
    id: string,
    status: KycStatus,
    reviewerUserId?: string,
    reviewerNote?: string
  ): Promise<KycData> {
    const data: Prisma.KycDataUpdateInput = { status };

    if (reviewerUserId) {
      data.reviewer = { connect: { id: reviewerUserId } };
    }
    if (reviewerNote) {
      data.reviewerNote = reviewerNote;
    }

    return this.prisma.kycData.update({ where: { id }, data });
  }

  async addDocument(
    kycId: string,
    documentData: Prisma.KycDocumentCreateInput
  ): Promise<KycDocument> {
    return this.prisma.kycDocument.create({
      data: {
        ...documentData,
        kycData: { connect: { id: kycId } },
      },
    });
  }

  async updateDocument(
    documentId: string,
    status: DocumentStatus,
    verifierNote?: string
  ): Promise<KycDocument> {
    const data: Prisma.KycDocumentUpdateInput = { status };

    if (verifierNote) {
      data.verifierNote = verifierNote;
    }

    return this.prisma.kycDocument.update({ where: { id: documentId }, data });
  }

  async addHistoryEntry(
    kycId: string,
    action: string,
    metadata?: any
  ): Promise<KycHistory> {
    return this.prisma.kycHistory.create({
      data: {
        kycData: { connect: { id: kycId } },
        action,
        metadata,
      },
    });
  }

  async count(filters?: KycDataFilters): Promise<number> {
    const where: Prisma.KycDataWhereInput = {};

    if (filters?.shopId) {
      where.shopId = filters.shopId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.kycData.count({ where });
  }

  async countByStatus(status: KycStatus): Promise<number> {
    return this.prisma.kycData.count({ where: { status } });
  }
}
