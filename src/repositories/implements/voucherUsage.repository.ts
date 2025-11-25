import { IVoucherUsageRepository } from '../interfaces/voucherUsage.interface';
import { VoucherUsage, Prisma, PrismaClient } from '@prisma/client';

export class VoucherUsageRepository implements IVoucherUsageRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: Prisma.VoucherUsageCreateInput): Promise<VoucherUsage> {
    return this.prisma.voucherUsage.create({ data });
  }

  async findById(id: string): Promise<VoucherUsage | null> {
    return this.prisma.voucherUsage.findUnique({
      where: { id },
    });
  }

  async findByVoucherId(
    voucherId: string,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.VoucherUsageOrderByWithRelationInput;
    }
  ): Promise<VoucherUsage[]> {
    return this.prisma.voucherUsage.findMany({
      where: { voucherId },
      skip: options?.skip ?? 0,
      take: options?.take ?? 10,
      orderBy: options?.orderBy || { usedAt: 'desc' },
    });
  }

  async findByUserId(
    userId: string,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.VoucherUsageOrderByWithRelationInput;
    }
  ): Promise<VoucherUsage[]> {
    return this.prisma.voucherUsage.findMany({
      where: { userId },
      skip: options?.skip ?? 0,
      take: options?.take ?? 10,
      orderBy: options?.orderBy || { usedAt: 'desc' },
      include: {
        voucher: true,
        order: true,
      },
    });
  }

  async countUserUsage(voucherId: string, userId: string): Promise<number> {
    return this.prisma.voucherUsage.count({
      where: {
        voucherId,
        userId,
      },
    });
  }

  async findByOrderId(orderId: string): Promise<VoucherUsage | null> {
    return this.prisma.voucherUsage.findFirst({
      where: { orderId },
    });
  }

  async deleteByOrderId(orderId: string): Promise<VoucherUsage | null> {
    const usage = await this.findByOrderId(orderId);
    if (!usage) return null;

    return this.prisma.voucherUsage.delete({
      where: { id: usage.id },
    });
  }

  async count(where?: Prisma.VoucherUsageWhereInput): Promise<number> {
    return this.prisma.voucherUsage.count({
      ...(where && { where }),
    });
  }
}
