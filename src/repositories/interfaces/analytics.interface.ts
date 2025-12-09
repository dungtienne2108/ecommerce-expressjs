import {
  DailyOrderStats,
  DailyRevenue,
  OrderByPaymentStatusCount,
  OrderByStatusCount,
  OrderStats,
  OrderTrendData,
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

export interface IAnalyticsRepository {
  // ==================== REVENUE ====================
  getRevenueStats(
    shopId?: string,
    period?: TimePeriod,
    from?: Date,
    to?: Date
  ): Promise<RevenueStats>;

  getRevenueTrend(
    shopId?: string,
    period?: TimePeriod,
    from?: Date,
    to?: Date
  ): Promise<RevenueTrendData>;

  getDailyRevenue(
    shopId?: string,
    date?: Date
  ): Promise<DailyRevenue | null>;

  // ==================== ORDERS ====================
  getOrderStats(
    shopId?: string,
    period?: TimePeriod,
    from?: Date,
    to?: Date
  ): Promise<OrderStats>;

  getOrderTrend(
    shopId?: string,
    period?: TimePeriod,
    from?: Date,
    to?: Date
  ): Promise<OrderTrendData>;

  getOrdersByStatus(
    shopId?: string,
    period?: TimePeriod,
    from?: Date,
    to?: Date
  ): Promise<OrderByStatusCount[]>;

  getOrdersByPaymentStatus(
    shopId?: string,
    period?: TimePeriod,
    from?: Date,
    to?: Date
  ): Promise<OrderByPaymentStatusCount[]>;

  getDailyOrderStats(
    shopId?: string,
    date?: Date
  ): Promise<DailyOrderStats | null>;

  // ==================== PAYMENT ====================
  getPaymentStats(
    shopId?: string,
    period?: TimePeriod,
    from?: Date,
    to?: Date
  ): Promise<PaymentStats>;

  // ==================== PRODUCTS ====================
  getProductAnalytics(
    shopId?: string,
    limit?: number,
    period?: TimePeriod,
    from?: Date,
    to?: Date
  ): Promise<ProductAnalytics>;

  getTopSellingProducts(
    shopId?: string,
    limit?: number,
    period?: TimePeriod,
    from?: Date,
    to?: Date
  ): Promise<TopSellingProduct[]>;

  // ==================== SHOP RANKING ====================
  getShopRanking(
    period?: TimePeriod,
    limit?: number,
    from?: Date,
    to?: Date
  ): Promise<ShopRankingData>;

  getTopShopsByRevenue(
    period?: TimePeriod,
    limit?: number,
    from?: Date,
    to?: Date
  ): Promise<ShopRevenueStats[]>;

  // ==================== REAL-TIME ====================
  getRealTimeStats(): Promise<RealTimeStats>;
}

