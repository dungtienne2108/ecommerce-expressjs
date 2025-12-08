import { logger } from '../../services/logger';
import { IVoucherRepository } from '../interfaces/voucher.interface';

import { Voucher, VoucherStatus, Prisma, PrismaClient } from '@prisma/client';
import { LogContext } from '../../services/logger';

 

export class VoucherRepository implements IVoucherRepository {

  constructor(private prisma: PrismaClient) {}

 

  async create(data: Prisma.VoucherCreateInput): Promise<Voucher> {

    return this.prisma.voucher.create({ data });

  }

 

  async findById(id: string): Promise<Voucher | null> {

    return this.prisma.voucher.findUnique({

      where: { id, deletedAt: null },

    });

  }

  async findByCode(code: string): Promise<Voucher | null> {

    return this.prisma.voucher.findUnique({

      where: { code, deletedAt: null },

    });

  }

 

  async findActiveByCode(code: string): Promise<Voucher | null> {

    const now = new Date();

    return this.prisma.voucher.findFirst({

      where: {

        code,

        status: VoucherStatus.ACTIVE,

        startDate: { lte: now },

        endDate: { gte: now },

        deletedAt: null,

      },

    });

  }

 

  async findByShopId(

    shopId: string,

    options?: {

      skip?: number;

      take?: number;

      status?: VoucherStatus;

      orderBy?: Prisma.VoucherOrderByWithRelationInput;

    }

  ): Promise<Voucher[]> {

    return this.prisma.voucher.findMany({

      where: {

        shopId,

        deletedAt: null,

        ...(options?.status && { status: options.status }),

      },

      skip: options?.skip ?? 0,

      take: options?.take ?? 10,

      orderBy: options?.orderBy || { createdAt: 'desc' },

    });

  }

 

  async findPublicVouchers(options?: {

    skip?: number;

    take?: number;

    shopId?: string;

    orderBy?: Prisma.VoucherOrderByWithRelationInput;

  }): Promise<Voucher[]> {

    const now = new Date();

    const vouchers = await this.prisma.voucher.findMany({

      where: {

        isPublic: true,

        status: VoucherStatus.ACTIVE,

        startDate: { lte: now },

        endDate: { gte: now },

        deletedAt: null,

        ...(options?.shopId && { shopId: options.shopId }),

      },

      skip: options?.skip ?? 0,

      take: options?.take ?? 20,

      orderBy: options?.orderBy || { createdAt: 'desc' },

    });
    logger.info('findPublicVouchers', { module: 'VoucherRepository' }, { vouchers });
    return vouchers;
  }

 

  async update(id: string, data: Prisma.VoucherUpdateInput): Promise<Voucher> {

    return this.prisma.voucher.update({

      where: { id },

      data,

    });

  }

 

  async incrementUsedCount(id: string): Promise<Voucher> {

    return this.prisma.voucher.update({

      where: { id },

      data: {

        usedCount: {

          increment: 1,

        },

      },

    });

  }

 

  async decrementUsedCount(id: string): Promise<Voucher> {

    return this.prisma.voucher.update({

      where: { id },

      data: {

        usedCount: {

          decrement: 1,

        },

      },

    });

  }

 

  async softDelete(id: string, deletedBy: string): Promise<Voucher> {

    return this.prisma.voucher.update({

      where: { id },

      data: {

        deletedAt: new Date(),

        deletedBy,

      },

    });

  }

 

  async findMany(args: Prisma.VoucherFindManyArgs): Promise<Voucher[]> {

    return this.prisma.voucher.findMany({
      ...args,
      where: {
        ...args.where,
        deletedAt: null,
      },
    });
  }

  async count(where?: Prisma.VoucherWhereInput): Promise<number> {

    return this.prisma.voucher.count({

      where: {

        ...where,

        deletedAt: null,

      },

    });

  }

}