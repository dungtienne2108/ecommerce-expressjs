import { OrderStatus, PaymentStatus } from '@prisma/client';

// ==================== TIME PERIOD ENUMS ====================
export enum TimePeriod {
  TODAY = 'TODAY',
  YESTERDAY = 'YESTERDAY',
  THIS_WEEK = 'THIS_WEEK',
  LAST_WEEK = 'LAST_WEEK',
  THIS_MONTH = 'THIS_MONTH',
  LAST_MONTH = 'LAST_MONTH',
  THIS_QUARTER = 'THIS_QUARTER',
  LAST_QUARTER = 'LAST_QUARTER',
  THIS_YEAR = 'THIS_YEAR',
  LAST_YEAR = 'LAST_YEAR',
  CUSTOM = 'CUSTOM',
}

// ==================== REVENUE ANALYTICS ====================
export interface RevenueStats {
  totalRevenue: number;
  paidRevenue: number; // Chỉ tính doanh thu từ đơn hàng đã thanh toán
  pendingRevenue: number; // Doanh thu từ đơn hàng chờ xử lý
  refundedAmount: number;
  averageOrderValue: number;
  revenueChange: number; // % so với kỳ trước
  currency: string;
}

export interface DailyRevenue {
  date: Date;
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  paymentMethods: {
    method: string;
    count: number;
    amount: number;
  }[];
}

export interface RevenueTrendData {
  period: TimePeriod;
  data: DailyRevenue[];
  summary: RevenueStats;
}

// ==================== ORDER ANALYTICS ====================
export interface OrderStats {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  shippingOrders: number;
  refundedOrders: number;
  completionRate: number; // %
  cancellationRate: number; // %
  averageOrderValue: number;
  orderChange: number; // % so với kỳ trước
}

export interface OrderByStatusCount {
  status: OrderStatus;
  count: number;
  percentage: number;
}

export interface OrderByPaymentStatusCount {
  status: PaymentStatus;
  count: number;
  percentage: number;
}

export interface DailyOrderStats {
  date: Date;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

export interface OrderTrendData {
  period: TimePeriod;
  data: DailyOrderStats[];
  summary: OrderStats;
}

// ==================== SHOP ANALYTICS ====================
export interface ShopRevenueStats {
  shopId: string;
  shopName: string;
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  averageOrderValue: number;
  rating?: number;
  reviewCount: number;
  soldCount: number;
}

export interface ShopRankingData {
  ranking: ShopRevenueStats[];
  period: TimePeriod;
  totalShops: number;
}

// ==================== PAYMENT ANALYTICS ====================
export interface PaymentMethodStats {
  method: string;
  count: number;
  totalAmount: number;
  percentage: number;
  successRate: number; // %
}

export interface PaymentStats {
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  successRate: number;
  totalPaidAmount: number;
  paymentMethods: PaymentMethodStats[];
}

// ==================== PRODUCT ANALYTICS ====================
export interface TopSellingProduct {
  productId: string;
  productName: string;
  shopId: string;
  soldCount: number;
  totalRevenue: number;
  averageRating: number;
}

export interface ProductAnalytics {
  topSellingProducts: TopSellingProduct[];
  totalProductsSold: number;
  totalProductRevenue: number;
}

// ==================== REAL-TIME STATS ====================
export interface RealTimeStats {
  activeOrders: number; // Đơn hàng đang xử lý
  totalOnlineShops: number;
  totalOnlineCustomers: number;
  ordersInLastHour: number;
  revenueInLastHour: number;
  lastUpdated: Date;
}

// ==================== COMPREHENSIVE ANALYTICS ====================
export interface ComprehensiveAnalytics {
  revenueStats: RevenueStats;
  orderStats: OrderStats;
  paymentStats: PaymentStats;
  productAnalytics: ProductAnalytics;
  realTimeStats: RealTimeStats;
  ordersByStatus: OrderByStatusCount[];
  ordersByPaymentStatus: OrderByPaymentStatusCount[];
  period: TimePeriod;
  dateRange: {
    from: Date;
    to: Date;
  };
  generatedAt: Date;
}

// ==================== API REQUEST/RESPONSE ====================
export interface AnalyticsQuery {
  period?: TimePeriod | undefined;
  from?: Date | undefined;
  to?: Date | undefined;
  shopId?: string | undefined;
  granularity?: 'daily' | 'weekly' | 'monthly' | undefined; // Mức độ chi tiết
}

export interface ShopAnalyticsQuery extends AnalyticsQuery {
  shopId: string;
}

export interface AnalyticsResponse<T> {
  success: boolean;
  data: T;
  period: TimePeriod;
  dateRange: {
    from: Date;
    to: Date;
  };
  generatedAt: Date;
  cacheStatus?: 'hit' | 'miss';
}

// ==================== CACHE KEYS ====================
export const ANALYTICS_CACHE_KEYS = {
  REVENUE: (period: TimePeriod, shopId?: string) =>
    `analytics:revenue:${period}${shopId ? `:${shopId}` : ''}`,
  ORDERS: (period: TimePeriod, shopId?: string) =>
    `analytics:orders:${period}${shopId ? `:${shopId}` : ''}`,
  PAYMENT: (period: TimePeriod, shopId?: string) =>
    `analytics:payment:${period}${shopId ? `:${shopId}` : ''}`,
  PRODUCTS: (period: TimePeriod, shopId?: string) =>
    `analytics:products:${period}${shopId ? `:${shopId}` : ''}`,
  REALTIME: `analytics:realtime`,
  COMPREHENSIVE: (period: TimePeriod, shopId?: string) =>
    `analytics:comprehensive:${period}${shopId ? `:${shopId}` : ''}`,
  SHOP_RANKING: (period: TimePeriod) =>
    `analytics:shop_ranking:${period}`,
} as const;

// ==================== CACHE DURATIONS ====================
export const ANALYTICS_CACHE_DURATIONS = {
  SHORT: 300, // 5 phút - cho real-time stats
  MEDIUM: 900, // 15 phút - cho daily stats
  LONG: 3600, // 1 giờ - cho aggregated stats
} as const;

