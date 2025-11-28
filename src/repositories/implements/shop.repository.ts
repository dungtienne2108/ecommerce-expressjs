import {
  ApprovalStatus,
  Prisma,
  PrismaClient,
  Shop,
  ShopStatus,
} from '@prisma/client';
import { IShopRepository } from '../interfaces/shop.interface';
import {
  ShopFilters,
  ShopIncludes,
  ShopWithRelations,
} from '../../types/shop.types';
import { DateUtils } from '../../utils/date.util';

export class ShopRepository implements IShopRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: Prisma.ShopCreateInput): Promise<Shop> {
    const shop = await this.prisma.shop.create({
      data,
    });
    return shop;
  }

  async findById(
    id: string,
    include?: ShopIncludes
  ): Promise<ShopWithRelations | null> {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: {
        owner: include?.owner ?? false,
        products: include?.products ?? false,
        currentKyc: include?.currentKyc ?? false,
        kycData: include?.kycData ?? false,
      },
    });
    return shop;
  }

  async findByOwnerId(ownerId: string): Promise<ShopWithRelations | null> {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId, deletedAt: null },
      include: {
        owner: true,
        currentKyc: true,
        kycData: true,
      },
    });
    return shop;
  }

  async update(id: string, data: Prisma.ShopUpdateInput): Promise<Shop> {
    const shop = await this.prisma.shop.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
    return shop;
  }

  async softDelete(id: string, deletedBy: string): Promise<void> {
    await this.prisma.shop.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
        updatedAt: new Date(),
      },
    });
  }

  async findMany(filters: ShopFilters): Promise<Shop[]> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      ...whereFilters
    } = filters;

    const where: Prisma.ShopWhereInput = {
      deletedAt: null,
      ...(whereFilters.status && { status: whereFilters.status }),
      ...(whereFilters.city && {
        city: {
          contains: whereFilters.city,
          mode: 'insensitive',
        },
      }),
      ...(whereFilters.name && {
        name: {
          contains: whereFilters.name,
          mode: 'insensitive',
        },
      }),
      ...(whereFilters.approvalStatus && {
        approvalStatus: whereFilters.approvalStatus,
      }),
      ...(whereFilters.category && { category: whereFilters.category }),
      ...(whereFilters.isVerified !== undefined && {
        isVerified: whereFilters.isVerified,
      }),
      ...(whereFilters.location && { location: whereFilters.location }),
    };

    const orderBy: Prisma.ShopOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const skip = (page - 1) * limit;

    const shops = await this.prisma.shop.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    });

    return shops;
  }

  async count(filters?: ShopFilters): Promise<number> {
    const where: Prisma.ShopWhereInput = {
      deletedAt: null,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.city && {
        city: {
          contains: filters.city,
          mode: 'insensitive',
        },
      }),
      ...(filters?.name && {
        name: {
          contains: filters.name,
          mode: 'insensitive',
        },
      }),
    };

    return this.prisma.shop.count({
      where,
    });
  }

  async countByStatus(status: ShopStatus): Promise<number> {
    return this.prisma.shop.count({
      where: {
        status,
        deletedAt: null,
      },
    });
  }

  async updateApprovalStatus(
    shopId: string,
    status: ApprovalStatus,
    approvedBy?: string,
    reason?: string
  ): Promise<Shop> {
    const shop = await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        approvalStatus: status,
        approvedBy: approvedBy ?? null,
        rejectionReason: reason ?? null,
        updatedAt: new Date(),
      },
    });
    return shop;
  }

  async approve(shopId: string, approvedBy: string): Promise<Shop> {
    return this.updateApprovalStatus(
      shopId,
      ApprovalStatus.APPROVED,
      approvedBy
    );
  }

  async reject(
    shopId: string,
    rejectedBy: string,
    reason: string
  ): Promise<Shop> {
    return this.updateApprovalStatus(
      shopId,
      ApprovalStatus.REJECTED,
      rejectedBy,
      reason
    );
  }

  async updateCurrentKyc(shopId: string, kycId: string): Promise<Shop> {
    const shop = await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        currentKycId: kycId,
        updatedAt: new Date(),
      },
    });
    return shop;
  }

  async activate(shopId: string): Promise<Shop> {
    const shop = await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        status: ShopStatus.ACTIVE,
        updatedAt: new Date(),
      },
    });
    return shop;
  }

  async suspend(shopId: string): Promise<Shop> {
    const shop = await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        status: ShopStatus.SUSPENDED,
        updatedAt: new Date(),
      },
    });
    return shop;
  }

  async close(shopId: string): Promise<Shop> {
    const shop = await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        status: ShopStatus.CLOSED,
        updatedAt: new Date(),
      },
    });
    return shop;
  }

  async verify(shopId: string, verifiedBy: string): Promise<Shop> {
    const shop = await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return shop;
  }

  async unverify(shopId: string): Promise<Shop> {
    const shop = await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        isVerified: false,
        verifiedAt: null,
        updatedAt: new Date(),
      },
    });
    return shop;
  }

  async updateRevenue(shopId: string, amount: number): Promise<Shop> {
    const shop = await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        totalRevenue: {
          increment: amount,
        },
        updatedAt: new Date(),
      },
    });
    return shop;
  }

  async incrementOrderCount(id: string): Promise<void> {
    await this.prisma.shop.update({
      where: { id },
      data: {
        totalOrders: {
          increment: 1,
        },
        updatedAt: new Date(),
      },
    });
  }

  async updateRating(
    id: string,
    newRating: number,
    reviewCount: number
  ): Promise<void> {
    await this.prisma.shop.update({
      where: { id },
      data: {
        rating: newRating,
        reviewCount,
        updatedAt: new Date(),
      },
    });
  }

  async updateStatistics(
    id: string,
    stats: {
      totalRevenue?: number;
      totalOrders?: number;
      rating?: number;
      reviewCount?: number;
    }
  ): Promise<Shop> {
    const shop = await this.prisma.shop.update({
      where: { id },
      data: {
        totalRevenue: stats.totalRevenue ?? 0,
        totalOrders: stats.totalOrders ?? 0,
        rating: stats.rating ?? null,
        reviewCount: stats.reviewCount ?? 0,
        updatedAt: DateUtils.now(),
      },
    });
    return shop;
  }
}
