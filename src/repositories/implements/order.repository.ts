import { IOrderRepository } from '../interfaces/order.interface';
import { Order, OrderItem, OrderStatus, PaymentStatus, Prisma, PrismaClient } from '@prisma/client';
import { OrderIncludes } from '../../types/order.types';
export class OrderRepository implements IOrderRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: Prisma.OrderCreateInput): Promise<Order> {
    return this.prisma.order.create({ data });
  }

  async findMany(filters: Prisma.OrderFindManyArgs): Promise<Order[]> {
    return this.prisma.order.findMany(filters);
  }

  async findById(id: string, include?: OrderIncludes): Promise<Order | null> {
    return this.prisma.order.findUnique({
      where: { id },
      include: { ...include },
    });
  }

  async findByOrderNumber(
    orderNumber: string,
    include?: OrderIncludes
  ): Promise<Order | null> {
    return this.prisma.order.findUnique({
      where: { orderNumber },
      include: { ...include },
    });
  }

  async findByIdWithItems(
    id: string
  ): Promise<(Order & { items: OrderItem[] }) | null> {
    return this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
  }

  async findByUserId(
    userId: string,
    options?: {
      skip?: number;
      take?: number;
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
      minTotalAmount?: number;
      maxTotalAmount?: number;
      shopId?: string;
      orderBy?: Prisma.OrderOrderByWithRelationInput;
    }
  ): Promise<Order[]> {
    const where: Prisma.OrderWhereInput = {
      userId,
      ...(options?.status !== undefined && { status: options.status }),
      ...(options?.paymentStatus !== undefined && { paymentStatus: options.paymentStatus }),
      ...(options?.minTotalAmount !== undefined && { subtotal: { gte: options.minTotalAmount } }),
      ...(options?.maxTotalAmount !== undefined && { subtotal: { lte: options.maxTotalAmount } }),
    };
    console.log('where', where);
    console.log('options', options);
    return this.prisma.order.findMany({
      where,
      skip: options?.skip ?? 0,
      take: options?.take ?? 10,
      orderBy: options?.orderBy || { createdAt: 'desc' },
    });
  }

  async findByShopId(
    shopId: string,
    options?: {
      skip?: number;
      take?: number;
      status?: OrderStatus;
      orderBy?: Prisma.OrderOrderByWithRelationInput;
    }
  ): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: {
        shopId,
        ...(options?.status && { status: options.status }),
      },
      skip: options?.skip ?? 0,
      take: options?.take ?? 10,
      orderBy: options?.orderBy || { createdAt: 'desc' },
    });
  }

  async update(id: string, data: Prisma.OrderUpdateInput): Promise<Order> {
    return this.prisma.order.update({
      where: { id },
      data,
    });
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    note?: string,
    changedBy?: string
  ): Promise<Order> {
    // Lấy status hiện tại
    const currentOrder = await this.prisma.order.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!currentOrder) {
      throw new Error('Order not found');
    }

    // Update order và tạo history trong transaction
    return this.prisma.$transaction(async (tx) => {
      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status,
          updatedBy: changedBy ?? null,
          // Cập nhật các timestamp tương ứng
          ...(status === 'CONFIRMED' && { confirmedAt: new Date() }),
          ...(status === 'SHIPPING' && { shippedAt: new Date() }),
          ...(status === 'DELIVERED' && { deliveredAt: new Date() }),
          ...(status === 'COMPLETED' && { completedAt: new Date() }),
          ...(status === 'CANCELLED' && { cancelledAt: new Date() }),
        },
      });

      // Tạo history record
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: currentOrder.status,
          toStatus: status,
          note: note ?? null,
          changedBy: changedBy ?? null,
        },
      });

      return updatedOrder;
    });
  }

  async count(where?: Prisma.OrderWhereInput): Promise<number> {
    return this.prisma.order.count({ ...(where && { where }), });
  }

  async sumRevenue(where?: Prisma.OrderWhereInput): Promise<number> {
    const result = await this.prisma.order.aggregate({
     ...(where && { where }),
      _sum: {
        totalAmount: true,
      },
    });

    return result._sum.totalAmount?.toNumber() || 0;
  }
}
