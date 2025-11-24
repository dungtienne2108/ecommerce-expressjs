import {
  CreateVoucherInput,
  UpdateVoucherInput,
} from '../../types/voucher.types';
import {
  IVoucherRepository,
  VoucherFilters,
} from '../interfaces/voucher.interface';
import { PrismaClient, Voucher } from '@prisma/client';

export class VoucherRepository implements IVoucherRepository {
  constructor(private prisma: PrismaClient) {}
  findById(id: string): Promise<Voucher | null> {
    return this.prisma.voucher.findUnique({ where: { id } });
  }
  findByCode(code: string): Promise<Voucher | null> {
    return this.prisma.voucher.findUnique({
      where: {
        code,
        startDate: { lte: new Date().toISOString() },
        endDate: { gte: new Date().toISOString() },
      },
    });
  }
  findActiveByCode(code: string): Promise<Voucher | null> {
    return this.prisma.voucher.findFirst({
      where: {
        code,
        status: 'ACTIVE',
        startDate: { lte: new Date().toISOString() },
        endDate: { gte: new Date().toISOString() },
      },
    });
  }
  findByShopId(shopId: string, filters?: VoucherFilters): Promise<Voucher[]> {
    return this.prisma.voucher.findMany({
      where: {
        shopId,
        startDate: { lte: new Date().toISOString() },
        endDate: { gte: new Date().toISOString() },
        ...filters,
      },
    });
  }
  findPublicVouchers(filters?: VoucherFilters): Promise<Voucher[]> {
    return this.prisma.voucher.findMany({
      where: {
        isPublic: true,
        startDate: { lte: new Date().toISOString() },
        endDate: { gte: new Date().toISOString() },
        ...filters,
      },
    });
  }
  create(data: CreateVoucherInput): Promise<Voucher> {
    return this.prisma.voucher.create({ data });
  }
  update(id: string, data: UpdateVoucherInput): Promise<Voucher> {
    return this.prisma.voucher.update({ where: { id }, data });
  }
  incrementUsedCount(id: string): Promise<void> {
    return this.prisma.voucher
      .update({ where: { id }, data: { usedCount: { increment: 1 } } })
      .then(() => {});
  }
  checkUserUsageLimit(voucherId: string, userId: string): Promise<number> {
    return this.prisma.voucher
      .findUnique({ where: { id: voucherId } })
      .then((voucher) => {
        if (!voucher) return 0;
        return voucher.limitPerUser
          ? voucher.limitPerUser - voucher.usedCount
          : 0;
      });
  }
  softDelete(id: string, deletedBy: string): Promise<void> {
    return this.prisma.voucher
      .update({ where: { id }, data: { deletedBy, deletedAt: new Date() } })
      .then(() => {});
  }
}
