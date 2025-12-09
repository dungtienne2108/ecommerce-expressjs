import { PrismaClient, OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import { IAnalyticsRepository } from '../interfaces/analytics.interface';
import {
  DailyOrderStats,
  DailyRevenue,
  OrderByPaymentStatusCount,
  OrderByStatusCount,
  OrderStats,
  OrderTrendData,
  PaymentMethodStats,
  PaymentStats,
  ProductAnalytics,
  RealTimeStats,
  RevenueStats,
  RevenueTrendData,
  ShopRankingData,
  ShopRevenueStats,
  TimePeriod,
  TopSellingProduct,
} from '../../types/analytics.types';

export class AnalyticsRepository implements IAnalyticsRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * ==================== HELPER METHODS ====================
   */

  private getDateRange(period: TimePeriod, from?: Date, to?: Date): { from: Date; to: Date } {
    const now = new Date();

    if (period === TimePeriod.CUSTOM && from && to) {
      return { from, to };
    }

    let from_date: Date;
    let to_date = now;

    switch (period) {
      case TimePeriod.TODAY:
        from_date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;

      case TimePeriod.YESTERDAY:
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        from_date = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
        to_date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;

      case TimePeriod.THIS_WEEK:
        from_date = new Date(now);
        from_date.setDate(now.getDate() - now.getDay());
        from_date = new Date(from_date.getFullYear(), from_date.getMonth(), from_date.getDate());
        break;

      case TimePeriod.LAST_WEEK:
        from_date = new Date(now);
        from_date.setDate(now.getDate() - now.getDay() - 7);
        from_date = new Date(from_date.getFullYear(), from_date.getMonth(), from_date.getDate());
        to_date = new Date(now);
        to_date.setDate(now.getDate() - now.getDay());
        break;

      case TimePeriod.THIS_MONTH:
        from_date = new Date(now.getFullYear(), now.getMonth(), 1);
        break;

      case TimePeriod.LAST_MONTH:
        from_date = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to_date = new Date(now.getFullYear(), now.getMonth(), 1);
        break;

      case TimePeriod.THIS_QUARTER:
        const quarter = Math.floor(now.getMonth() / 3);
        from_date = new Date(now.getFullYear(), quarter * 3, 1);
        break;

      case TimePeriod.LAST_QUARTER:
        const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
        from_date = new Date(now.getFullYear(), lastQuarter * 3, 1);
        to_date = new Date(now.getFullYear(), lastQuarter * 3 + 3, 0);
        break;

      case TimePeriod.THIS_YEAR:
        from_date = new Date(now.getFullYear(), 0, 1);
        break;

      case TimePeriod.LAST_YEAR:
        from_date = new Date(now.getFullYear() - 1, 0, 1);
        to_date = new Date(now.getFullYear(), 0, 1);
        break;

      default:
        from_date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    return { from: from_date, to: to_date };
  }

  /**
   * ==================== REVENUE ANALYTICS ====================
   */

  async getRevenueStats(
    shopId?: string,
    period: TimePeriod = TimePeriod.THIS_MONTH,
    from?: Date,
    to?: Date
  ): Promise<RevenueStats> {
    const { from: from_date, to: to_date } = this.getDateRange(period, from, to);
    const { from: from_date_prev, to: to_date_prev } = this.getPreviousPeriodDateRange(period, from, to);

    const whereClause = {
      createdAt: {
        gte: from_date,
        lte: to_date,
      },
      ...(shopId && { shopId }),
    };

    const [currentStats, previousStats] = await Promise.all([
      this.prisma.order.aggregate({
        where: whereClause,
        _sum: {
          totalAmount: true,
        },
        _avg: {
          totalAmount: true,
        },
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: {
          ...whereClause,
          createdAt: {
            gte: from_date_prev,
            lte: to_date_prev,
          },
        },
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    // Get paid revenue
    const [paidRevenue, refundedAmount] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.PAID,
          createdAt: {
            gte: from_date,
            lte: to_date,
          },
          ...(shopId && { order: { shopId } }),
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.REFUNDED,
          createdAt: {
            gte: from_date,
            lte: to_date,
          },
          ...(shopId && { order: { shopId } }),
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const totalRevenue = currentStats._sum.totalAmount?.toNumber() || 0;
    const previousRevenue = previousStats._sum.totalAmount?.toNumber() || 0;
    const revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    return {
      totalRevenue,
      paidRevenue: paidRevenue._sum.amount?.toNumber() || 0,
      pendingRevenue: totalRevenue - (paidRevenue._sum.amount?.toNumber() || 0),
      refundedAmount: refundedAmount._sum.amount?.toNumber() || 0,
      averageOrderValue: currentStats._avg.totalAmount?.toNumber() || 0,
      revenueChange,
      currency: 'VND',
    };
  }

  async getRevenueTrend(
    shopId?: string,
    period: TimePeriod = TimePeriod.THIS_MONTH,
    from?: Date,
    to?: Date
  ): Promise<RevenueTrendData> {
    const { from: from_date, to: to_date } = this.getDateRange(period, from, to);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: from_date,
          lte: to_date,
        },
        ...(shopId && { shopId }),
      },
      select: {
        id: true,
        totalAmount: true,
        paymentMethod: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const dailyMap = new Map<string, any>();

    orders.forEach((order) => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (!dateKey) {
        return;
      }
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: new Date(dateKey),
          totalRevenue: 0,
          orderCount: 0,
          paymentMethods: new Map<string, any>(),
        });
      }

      const daily = dailyMap.get(dateKey);
      daily.totalRevenue += Number(order.totalAmount);
      daily.orderCount += 1;

      const method = order.paymentMethod;
      if (!daily.paymentMethods.has(method)) {
        daily.paymentMethods.set(method, {
          method,
          count: 0,
          amount: 0,
        });
      }
      const pm = daily.paymentMethods.get(method);
      pm.count += 1;
      pm.amount += Number(order.totalAmount);
    });

    const data: DailyRevenue[] = Array.from(dailyMap.values()).map((daily) => ({
      date: daily.date,
      totalRevenue: daily.totalRevenue,
      orderCount: daily.orderCount,
      averageOrderValue: daily.orderCount > 0 ? daily.totalRevenue / daily.orderCount : 0,
      paymentMethods: Array.from(daily.paymentMethods.values()),
    }));

    const summary = await this.getRevenueStats(shopId, period, from_date, to_date);

    return {
      period,
      data,
      summary,
    };
  }

  async getDailyRevenue(shopId?: string, date?: Date): Promise<DailyRevenue | null> {
    const targetDate = date || new Date();
    const dateStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const dateEnd = new Date(dateStart);
    dateEnd.setDate(dateEnd.getDate() + 1);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: dateStart,
          lt: dateEnd,
        },
        ...(shopId && { shopId }),
      },
      select: {
        id: true,
        totalAmount: true,
        paymentMethod: true,
      },
    });

    if (orders.length === 0) return null;

    const paymentMethodsMap = new Map<string, any>();
    let totalRevenue = 0;

    orders.forEach((order) => {
      totalRevenue += Number(order.totalAmount);
      const method = order.paymentMethod;
      if (!paymentMethodsMap.has(method)) {
        paymentMethodsMap.set(method, {
          method,
          count: 0,
          amount: 0,
        });
      }
      const pm = paymentMethodsMap.get(method);
      pm.count += 1;
      pm.amount += Number(order.totalAmount);
    });

    return {
      date: dateStart,
      totalRevenue,
      orderCount: orders.length,
      averageOrderValue: totalRevenue / orders.length,
      paymentMethods: Array.from(paymentMethodsMap.values()),
    };
  }

  /**
   * ==================== ORDER ANALYTICS ====================
   */

  async getOrderStats(
    shopId?: string,
    period: TimePeriod = TimePeriod.THIS_MONTH,
    from?: Date,
    to?: Date
  ): Promise<OrderStats> {
    const { from: from_date, to: to_date } = this.getDateRange(period, from, to);
    const { from: from_date_prev, to: to_date_prev } = this.getPreviousPeriodDateRange(period, from, to);

    const whereClause = {
      createdAt: {
        gte: from_date,
        lte: to_date,
      },
      ...(shopId && { shopId }),
    };

    const [
      totalOrders,
      completedOrders,
      cancelledOrders,
      pendingOrders,
      shippingOrders,
      refundedOrders,
      avgOrderValue,
      previousTotal,
    ] = await Promise.all([
      this.prisma.order.count({ where: whereClause }),
      this.prisma.order.count({
        where: { ...whereClause, status: OrderStatus.COMPLETED },
      }),
      this.prisma.order.count({
        where: { ...whereClause, status: OrderStatus.CANCELLED },
      }),
      this.prisma.order.count({
        where: { ...whereClause, status: OrderStatus.PENDING },
      }),
      this.prisma.order.count({
        where: { ...whereClause, status: OrderStatus.SHIPPING },
      }),
      this.prisma.order.count({
        where: { ...whereClause, status: OrderStatus.REFUNDED },
      }),
      this.prisma.order.aggregate({
        where: whereClause,
        _avg: { totalAmount: true },
      }),
      this.prisma.order.count({
        where: {
          ...whereClause,
          createdAt: {
            gte: from_date_prev,
            lte: to_date_prev,
          },
        },
      }),
    ]);

    const orderChange = previousTotal > 0 ? ((totalOrders - previousTotal) / previousTotal) * 100 : 0;
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
    const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

    return {
      totalOrders,
      completedOrders,
      cancelledOrders,
      pendingOrders,
      shippingOrders,
      refundedOrders,
      completionRate,
      cancellationRate,
      averageOrderValue: avgOrderValue._avg.totalAmount?.toNumber() || 0,
      orderChange,
    };
  }

  async getOrderTrend(
    shopId?: string,
    period: TimePeriod = TimePeriod.THIS_MONTH,
    from?: Date,
    to?: Date
  ): Promise<OrderTrendData> {
    const { from: from_date, to: to_date } = this.getDateRange(period, from, to);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: from_date,
          lte: to_date,
        },
        ...(shopId && { shopId }),
      },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const dailyMap = new Map<string, any>();

    orders.forEach((order) => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (!dateKey) {
        return;
      }
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: new Date(dateKey),
          totalOrders: 0,
          completedOrders: 0,
          cancelledOrders: 0,
          refundedOrders: 0,
          totalRevenue: 0,
        });
      }

      const daily = dailyMap.get(dateKey);
      daily.totalOrders += 1;
      daily.totalRevenue += Number(order.totalAmount);

      if (order.status === OrderStatus.COMPLETED) daily.completedOrders += 1;
      if (order.status === OrderStatus.CANCELLED) daily.cancelledOrders += 1;
      if (order.status === OrderStatus.REFUNDED) daily.refundedOrders += 1;
    });

    const data: DailyOrderStats[] = Array.from(dailyMap.values()).map((daily) => ({
      date: daily.date,
      totalOrders: daily.totalOrders,
      completedOrders: daily.completedOrders,
      cancelledOrders: daily.cancelledOrders,
      refundedOrders: daily.refundedOrders,
      totalRevenue: daily.totalRevenue,
      averageOrderValue: daily.totalOrders > 0 ? daily.totalRevenue / daily.totalOrders : 0,
    }));

    const summary = await this.getOrderStats(shopId, period, from_date, to_date);

    return {
      period,
      data,
      summary,
    };
  }

  async getOrdersByStatus(
    shopId?: string,
    period: TimePeriod = TimePeriod.THIS_MONTH,
    from?: Date,
    to?: Date
  ): Promise<OrderByStatusCount[]> {
    const { from: from_date, to: to_date } = this.getDateRange(period, from, to);

    const whereClause = {
      createdAt: {
        gte: from_date,
        lte: to_date,
      },
      ...(shopId && { shopId }),
    };

    const result = await this.prisma.order.groupBy({
      by: ['status'],
      where: whereClause,
      _count: true,
    });

    const total = result.reduce((sum, r) => sum + r._count, 0);

    return result.map((r) => ({
      status: r.status,
      count: r._count,
      percentage: total > 0 ? (r._count / total) * 100 : 0,
    }));
  }

  async getOrdersByPaymentStatus(
    shopId?: string,
    period: TimePeriod = TimePeriod.THIS_MONTH,
    from?: Date,
    to?: Date
  ): Promise<OrderByPaymentStatusCount[]> {
    const { from: from_date, to: to_date } = this.getDateRange(period, from, to);

    const whereClause = {
      createdAt: {
        gte: from_date,
        lte: to_date,
      },
      ...(shopId && { shopId }),
    };

    const result = await this.prisma.order.groupBy({
      by: ['paymentStatus'],
      where: whereClause,
      _count: true,
    });

    const total = result.reduce((sum, r) => sum + r._count, 0);

    return result.map((r) => ({
      status: r.paymentStatus,
      count: r._count,
      percentage: total > 0 ? (r._count / total) * 100 : 0,
    }));
  }

  async getDailyOrderStats(shopId?: string, date?: Date): Promise<DailyOrderStats | null> {
    const targetDate = date || new Date();
    const dateStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const dateEnd = new Date(dateStart);
    dateEnd.setDate(dateEnd.getDate() + 1);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: dateStart,
          lt: dateEnd,
        },
        ...(shopId && { shopId }),
      },
      select: {
        status: true,
        totalAmount: true,
      },
    });

    if (orders.length === 0) return null;

    let completedOrders = 0;
    let cancelledOrders = 0;
    let refundedOrders = 0;
    let totalRevenue = 0;

    orders.forEach((order) => {
      totalRevenue += Number(order.totalAmount);
      if (order.status === OrderStatus.COMPLETED) completedOrders += 1;
      if (order.status === OrderStatus.CANCELLED) cancelledOrders += 1;
      if (order.status === OrderStatus.REFUNDED) refundedOrders += 1;
    });

    return {
      date: dateStart,
      totalOrders: orders.length,
      completedOrders,
      cancelledOrders,
      refundedOrders,
      totalRevenue,
      averageOrderValue: totalRevenue / orders.length,
    };
  }

  /**
   * ==================== PAYMENT ANALYTICS ====================
   */

  async getPaymentStats(
    shopId?: string,
    period: TimePeriod = TimePeriod.THIS_MONTH,
    from?: Date,
    to?: Date
  ): Promise<PaymentStats> {
    const { from: from_date, to: to_date } = this.getDateRange(period, from, to);

    const whereClause = {
      createdAt: {
        gte: from_date,
        lte: to_date,
      },
      ...(shopId && { order: { shopId } }),
    };

    const [totalPayments, successfulPayments, failedPayments, pendingPayments, payments] = await Promise.all([
      this.prisma.payment.count({ where: whereClause }),
      this.prisma.payment.count({
        where: { ...whereClause, status: PaymentStatus.PAID },
      }),
      this.prisma.payment.count({
        where: { ...whereClause, status: PaymentStatus.FAILED },
      }),
      this.prisma.payment.count({
        where: { ...whereClause, status: PaymentStatus.PENDING },
      }),
      this.prisma.payment.findMany({
        where: whereClause,
        select: {
          method: true,
          status: true,
          amount: true,
        },
      }),
    ]);

    const totalPaidAmount = payments
      .filter((p) => p.status === PaymentStatus.PAID)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;

    const paymentMethodsMap = new Map<string, PaymentMethodStats>();

    payments.forEach((payment) => {
      const method = payment.method;
      if (!paymentMethodsMap.has(method)) {
        paymentMethodsMap.set(method, {
          method,
          count: 0,
          totalAmount: 0,
          percentage: 0,
          successRate: 0,
        });
      }

      const stats = paymentMethodsMap.get(method)!;
      stats.count += 1;
      stats.totalAmount += Number(payment.amount);

      if (payment.status === PaymentStatus.PAID) {
        stats.successRate = (stats.successRate * (stats.count - 1) + 100) / stats.count;
      } else {
        stats.successRate = (stats.successRate * (stats.count - 1)) / stats.count;
      }
    });

    const paymentMethods: PaymentMethodStats[] = Array.from(paymentMethodsMap.values()).map((stats) => ({
      ...stats,
      percentage: totalPaidAmount > 0 ? (stats.totalAmount / totalPaidAmount) * 100 : 0,
    }));

    return {
      totalPayments,
      successfulPayments,
      failedPayments,
      pendingPayments,
      successRate,
      totalPaidAmount,
      paymentMethods,
    };
  }

  /**
   * ==================== PRODUCT ANALYTICS ====================
   */

  async getProductAnalytics(
    shopId?: string,
    limit: number = 10,
    period: TimePeriod = TimePeriod.THIS_MONTH,
    from?: Date,
    to?: Date
  ): Promise<ProductAnalytics> {
    const topProducts = await this.getTopSellingProducts(shopId, limit, period, from, to);

    const whereClause = {
      createdAt: {
        gte: this.getDateRange(period, from, to).from,
        lte: this.getDateRange(period, from, to).to,
      },
      ...(shopId && { shopId }),
    };

    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: whereClause,
      },
      select: {
        quantity: true,
        totalPrice: true,
      },
    });

    const totalProductsSold = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalProductRevenue = orderItems.reduce((sum, item) => sum + Number(item.totalPrice), 0);

    return {
      topSellingProducts: topProducts,
      totalProductsSold,
      totalProductRevenue,
    };
  }

  async getTopSellingProducts(
    shopId?: string,
    limit: number = 10,
    period: TimePeriod = TimePeriod.THIS_MONTH,
    from?: Date,
    to?: Date
  ): Promise<TopSellingProduct[]> {
    const { from: from_date, to: to_date } = this.getDateRange(period, from, to);

    const topProducts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          createdAt: {
            gte: from_date,
            lte: to_date,
          },
          ...(shopId && { shopId }),
        },
      },
      _sum: {
        quantity: true,
        totalPrice: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limit,
    });

    const productIds = topProducts.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        shopId: true,
        averageRating: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return topProducts
      .map((tp) => {
        const product = productMap.get(tp.productId);
        return {
          productId: tp.productId,
          productName: product?.name || 'Unknown',
          shopId: product?.shopId || '',
          soldCount: tp._sum.quantity || 0,
          totalRevenue: Number(tp._sum.totalPrice) || 0,
          averageRating: product?.averageRating || 0,
        };
      })
      .filter((p) => p.shopId);
  }

  /**
   * ==================== SHOP RANKING ====================
   */

  async getShopRanking(
    period: TimePeriod = TimePeriod.THIS_MONTH,
    limit: number = 10,
    from?: Date,
    to?: Date
  ): Promise<ShopRankingData> {
    const topShops = await this.getTopShopsByRevenue(period, limit, from, to);

    return {
      ranking: topShops,
      period,
      totalShops: await this.prisma.shop.count(),
    };
  }

  async getTopShopsByRevenue(
    period: TimePeriod = TimePeriod.THIS_MONTH,
    limit: number = 10,
    from?: Date,
    to?: Date
  ): Promise<ShopRevenueStats[]> {
    const { from: from_date, to: to_date } = this.getDateRange(period, from, to);

    const shopOrders = await this.prisma.order.groupBy({
      by: ['shopId'],
      where: {
        createdAt: {
          gte: from_date,
          lte: to_date,
        },
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          totalAmount: 'desc',
        },
      },
      take: limit,
    });

    const shopIds = shopOrders.map((so) => so.shopId);
    const shops = await this.prisma.shop.findMany({
      where: { id: { in: shopIds } },
      select: {
        id: true,
        name: true,
        rating: true,
        reviewCount: true,
        totalRevenue: true,
        _count: true,
      },
    });

    const shopMap = new Map(shops.map((s) => [s.id, s]));

    const completedOrders = await this.prisma.order.groupBy({
      by: ['shopId'],
      where: {
        createdAt: {
          gte: from_date,
          lte: to_date,
        },
        status: OrderStatus.COMPLETED,
      },
      _count: true,
    });

    const completedOrdersMap = new Map(completedOrders.map((co) => [co.shopId, co._count]));

    return shopOrders
      .map((so) => {
        const shop = shopMap.get(so.shopId);
        return {
          shopId: so.shopId,
          shopName: shop?.name || 'Unknown',
          totalRevenue: Number(so._sum.totalAmount) || 0,
          totalOrders: so._count,
          completedOrders: completedOrdersMap.get(so.shopId) || 0,
          averageOrderValue: so._count > 0 ? (Number(so._sum.totalAmount) || 0) / so._count : 0,
          rating: shop?.rating?.toNumber() || 0,
          reviewCount: shop?.reviewCount || 0,
          soldCount: shop?._count?.orders || 0,
        };
      })
      .filter((s) => s.shopId);
  }

  /**
   * ==================== REAL-TIME ANALYTICS ====================
   */

  async getRealTimeStats(): Promise<RealTimeStats> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [activeOrders, onlineShops, onlineCustomers, ordersInLastHour, revenueInLastHour] = await Promise.all([
      this.prisma.order.count({
        where: {
          status: {
            in: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPING],
          },
        },
      }),
      this.prisma.shop.count({
        where: {
          status: 'ACTIVE',
        },
      }),
      this.prisma.user.count({
        where: {
          lastLoginAt: {
            gte: oneHourAgo,
          },
        },
      }),
      this.prisma.order.count({
        where: {
          createdAt: {
            gte: oneHourAgo,
          },
        },
      }),
      this.prisma.order.aggregate({
        where: {
          createdAt: {
            gte: oneHourAgo,
          },
        },
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    return {
      activeOrders,
      totalOnlineShops: onlineShops,
      totalOnlineCustomers: onlineCustomers,
      ordersInLastHour,
      revenueInLastHour: revenueInLastHour._sum.totalAmount?.toNumber() || 0,
      lastUpdated: now,
    };
  }

  /**
   * ==================== HELPER ====================
   */

  private getPreviousPeriodDateRange(period: TimePeriod, from?: Date, to?: Date) {
    const { from: current_from, to: current_to } = this.getDateRange(period, from, to);
    const duration = current_to.getTime() - current_from.getTime();

    const prev_to = new Date(current_from.getTime() - 1000);
    const prev_from = new Date(prev_to.getTime() - duration);

    return { from: prev_from, to: prev_to };
  }
}

