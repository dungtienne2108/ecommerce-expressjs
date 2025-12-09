import { IAnalyticsRepository } from '../repositories/interfaces/analytics.interface';
import redis from '../config/redis';
import {
  AnalyticsQuery,
  AnalyticsResponse,
  ANALYTICS_CACHE_DURATIONS,
  ANALYTICS_CACHE_KEYS,
  ComprehensiveAnalytics,
  OrderStats,
  OrderTrendData,
  PaymentStats,
  ProductAnalytics,
  RealTimeStats,
  RevenueStats,
  RevenueTrendData,
  ShopAnalyticsQuery,
  ShopRankingData,
  ShopRevenueStats,
  TimePeriod,
  TopSellingProduct,
} from '../types/analytics.types';
import { CacheUtil } from '../utils/cache.util';
import { logger } from './logger';

export class AnalyticsService {
  constructor(private analyticsRepository: IAnalyticsRepository) {}

  /**
   * ==================== REVENUE ANALYTICS ====================
   */

  async getRevenueStats(
    shopId?: string,
    query?: AnalyticsQuery
  ): Promise<AnalyticsResponse<RevenueStats>> {
    const period = query?.period || TimePeriod.THIS_MONTH;
    const cacheKey = ANALYTICS_CACHE_KEYS.REVENUE(period, shopId);
    let cacheStatus: 'hit' | 'miss' = 'miss';

    try {
      // Try to get from cache
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        cacheStatus = 'hit';
        logger.debug(`Cache hit for revenue stats: ${cacheKey}`);
        return this.formatAnalyticsResponse(parsed, period, query);
      }
    } catch (error) {
      logger.error('Error getting revenue stats from cache:', error);
    }

    // Fetch from database
    const data = await this.analyticsRepository.getRevenueStats(shopId, period, query?.from, query?.to);

    // Cache result
    await this.cacheAnalyticsData(cacheKey, data, ANALYTICS_CACHE_DURATIONS.LONG);

    return this.formatAnalyticsResponse(data, period, query, cacheStatus);
  }

  async getRevenueTrend(
    shopId?: string,
    query?: AnalyticsQuery
  ): Promise<AnalyticsResponse<RevenueTrendData>> {
    const period = query?.period || TimePeriod.THIS_MONTH;
    const cacheKey = ANALYTICS_CACHE_KEYS.REVENUE(period, shopId) + ':trend';
    let cacheStatus: 'hit' | 'miss' = 'miss';

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        cacheStatus = 'hit';
        logger.debug(`Cache hit for revenue trend: ${cacheKey}`);
        return this.formatAnalyticsResponse(parsed, period, query, cacheStatus);
      }
    } catch (error) {
      logger.error('Error getting revenue trend from cache:', error);
    }

    const data = await this.analyticsRepository.getRevenueTrend(shopId, period, query?.from, query?.to);
    await this.cacheAnalyticsData(cacheKey, data, ANALYTICS_CACHE_DURATIONS.LONG);

    return this.formatAnalyticsResponse(data, period, query, cacheStatus);
  }

  /**
   * ==================== ORDER ANALYTICS ====================
   */

  async getOrderStats(
    shopId?: string,
    query?: AnalyticsQuery
  ): Promise<AnalyticsResponse<OrderStats>> {
    const period = query?.period || TimePeriod.THIS_MONTH;
    const cacheKey = ANALYTICS_CACHE_KEYS.ORDERS(period, shopId);
    let cacheStatus: 'hit' | 'miss' = 'miss';

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        cacheStatus = 'hit';
        logger.debug(`Cache hit for order stats: ${cacheKey}`);
        return this.formatAnalyticsResponse(parsed, period, query, cacheStatus);
      }
    } catch (error) {
      logger.error('Error getting order stats from cache:', error);
    }

    const data = await this.analyticsRepository.getOrderStats(shopId, period, query?.from, query?.to);
    await this.cacheAnalyticsData(cacheKey, data, ANALYTICS_CACHE_DURATIONS.LONG);

    return this.formatAnalyticsResponse(data, period, query, cacheStatus);
  }

  async getOrderTrend(
    shopId?: string,
    query?: AnalyticsQuery
  ): Promise<AnalyticsResponse<OrderTrendData>> {
    const period = query?.period || TimePeriod.THIS_MONTH;
    const cacheKey = ANALYTICS_CACHE_KEYS.ORDERS(period, shopId) + ':trend';
    let cacheStatus: 'hit' | 'miss' = 'miss';

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        cacheStatus = 'hit';
        logger.debug(`Cache hit for order trend: ${cacheKey}`);
        return this.formatAnalyticsResponse(parsed, period, query, cacheStatus);
      }
    } catch (error) {
      logger.error('Error getting order trend from cache:', error);
    }

    const data = await this.analyticsRepository.getOrderTrend(shopId, period, query?.from, query?.to);
    await this.cacheAnalyticsData(cacheKey, data, ANALYTICS_CACHE_DURATIONS.LONG);

    return this.formatAnalyticsResponse(data, period, query, cacheStatus);
  }

  /**
   * ==================== PAYMENT ANALYTICS ====================
   */

  async getPaymentStats(
    shopId?: string,
    query?: AnalyticsQuery
  ): Promise<AnalyticsResponse<PaymentStats>> {
    const period = query?.period || TimePeriod.THIS_MONTH;
    const cacheKey = ANALYTICS_CACHE_KEYS.PAYMENT(period, shopId);
    let cacheStatus: 'hit' | 'miss' = 'miss';

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        cacheStatus = 'hit';
        logger.debug(`Cache hit for payment stats: ${cacheKey}`);
        return this.formatAnalyticsResponse(parsed, period, query, cacheStatus);
      }
    } catch (error) {
      logger.error('Error getting payment stats from cache:', error);
    }

    const data = await this.analyticsRepository.getPaymentStats(shopId, period, query?.from, query?.to);
    await this.cacheAnalyticsData(cacheKey, data, ANALYTICS_CACHE_DURATIONS.LONG);

    return this.formatAnalyticsResponse(data, period, query, cacheStatus);
  }

  /**
   * ==================== PRODUCT ANALYTICS ====================
   */

  async getProductAnalytics(
    shopId?: string,
    query?: AnalyticsQuery & { limit?: number }
  ): Promise<AnalyticsResponse<ProductAnalytics>> {
    const period = query?.period || TimePeriod.THIS_MONTH;
    const limit = query?.limit || 10;
    const cacheKey = ANALYTICS_CACHE_KEYS.PRODUCTS(period, shopId) + `:${limit}`;
    let cacheStatus: 'hit' | 'miss' = 'miss';

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        cacheStatus = 'hit';
        logger.debug(`Cache hit for product analytics: ${cacheKey}`);
        return this.formatAnalyticsResponse(parsed, period, query, cacheStatus);
      }
    } catch (error) {
      logger.error('Error getting product analytics from cache:', error);
    }

    const data = await this.analyticsRepository.getProductAnalytics(
      shopId,
      limit,
      period,
      query?.from,
      query?.to
    );
    await this.cacheAnalyticsData(cacheKey, data, ANALYTICS_CACHE_DURATIONS.LONG);

    return this.formatAnalyticsResponse(data, period, query, cacheStatus);
  }

  /**
   * ==================== SHOP RANKING ====================
   */

  async getShopRanking(
    query?: AnalyticsQuery & { limit?: number }
  ): Promise<AnalyticsResponse<ShopRankingData>> {
    const period = query?.period || TimePeriod.THIS_MONTH;
    const limit = query?.limit || 10;
    const cacheKey = ANALYTICS_CACHE_KEYS.SHOP_RANKING(period) + `:${limit}`;
    let cacheStatus: 'hit' | 'miss' = 'miss';

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        cacheStatus = 'hit';
        logger.debug(`Cache hit for shop ranking: ${cacheKey}`);
        return this.formatAnalyticsResponse(parsed, period, query, cacheStatus);
      }
    } catch (error) {
      logger.error('Error getting shop ranking from cache:', error);
    }

    const data = await this.analyticsRepository.getShopRanking(period, limit, query?.from, query?.to);
    await this.cacheAnalyticsData(cacheKey, data, ANALYTICS_CACHE_DURATIONS.LONG);

    return this.formatAnalyticsResponse(data, period, query, cacheStatus);
  }

  async getTopShopsByRevenue(
    query?: AnalyticsQuery & { limit?: number }
  ): Promise<AnalyticsResponse<ShopRevenueStats[]>> {
    const period = query?.period || TimePeriod.THIS_MONTH;
    const limit = query?.limit || 10;
    const cacheKey = ANALYTICS_CACHE_KEYS.SHOP_RANKING(period) + `:top:${limit}`;
    let cacheStatus: 'hit' | 'miss' = 'miss';

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        cacheStatus = 'hit';
        logger.debug(`Cache hit for top shops: ${cacheKey}`);
        return this.formatAnalyticsResponse(parsed, period, query, cacheStatus);
      }
    } catch (error) {
      logger.error('Error getting top shops from cache:', error);
    }

    const data = await this.analyticsRepository.getTopShopsByRevenue(period, limit, query?.from, query?.to);
    await this.cacheAnalyticsData(cacheKey, data, ANALYTICS_CACHE_DURATIONS.LONG);

    return this.formatAnalyticsResponse(data, period, query, cacheStatus);
  }

  /**
   * ==================== REAL-TIME ANALYTICS ====================
   */

  async getRealTimeStats(): Promise<AnalyticsResponse<RealTimeStats>> {
    const cacheKey = ANALYTICS_CACHE_KEYS.REALTIME;
    let cacheStatus: 'hit' | 'miss' = 'miss';

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        cacheStatus = 'hit';
        logger.debug('Cache hit for real-time stats');
        return {
          success: true,
          data: parsed,
          period: TimePeriod.TODAY,
          dateRange: {
            from: new Date(),
            to: new Date(),
          },
          generatedAt: new Date(),
          cacheStatus,
        };
      }
    } catch (error) {
      logger.error('Error getting real-time stats from cache:', error);
    }

    const data = await this.analyticsRepository.getRealTimeStats();
    await this.cacheAnalyticsData(cacheKey, data, ANALYTICS_CACHE_DURATIONS.SHORT);

    return {
      success: true,
      data,
      period: TimePeriod.TODAY,
      dateRange: {
        from: new Date(),
        to: new Date(),
      },
      generatedAt: new Date(),
      cacheStatus,
    };
  }

  /**
   * ==================== COMPREHENSIVE ANALYTICS ====================
   */

  async getComprehensiveAnalytics(
    shopId?: string,
    query?: AnalyticsQuery
  ): Promise<AnalyticsResponse<ComprehensiveAnalytics>> {
    const period = query?.period || TimePeriod.THIS_MONTH;
    const cacheKey = ANALYTICS_CACHE_KEYS.COMPREHENSIVE(period, shopId);
    let cacheStatus: 'hit' | 'miss' = 'miss';

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        cacheStatus = 'hit';
        logger.debug(`Cache hit for comprehensive analytics: ${cacheKey}`);
        return this.formatAnalyticsResponse(parsed, period, query, cacheStatus);
      }
    } catch (error) {
      logger.error('Error getting comprehensive analytics from cache:', error);
    }

    // Fetch all analytics in parallel
    const [revenueStats, orderStats, paymentStats, productAnalytics, ordersByStatus, ordersByPaymentStatus, realTimeStats] = await Promise.all([
      this.analyticsRepository.getRevenueStats(shopId, period, query?.from, query?.to),
      this.analyticsRepository.getOrderStats(shopId, period, query?.from, query?.to),
      this.analyticsRepository.getPaymentStats(shopId, period, query?.from, query?.to),
      this.analyticsRepository.getProductAnalytics(shopId, 5, period, query?.from, query?.to),
      this.analyticsRepository.getOrdersByStatus(shopId, period, query?.from, query?.to),
      this.analyticsRepository.getOrdersByPaymentStatus(shopId, period, query?.from, query?.to),
      this.analyticsRepository.getRealTimeStats(),
    ]);

    const data: ComprehensiveAnalytics = {
      revenueStats,
      orderStats,
      paymentStats,
      productAnalytics,
      realTimeStats,
      ordersByStatus,
      ordersByPaymentStatus,
      period,
      dateRange: {
        from: query?.from || new Date(),
        to: query?.to || new Date(),
      },
      generatedAt: new Date(),
    };

    // Cache comprehensive data for longer
    await this.cacheAnalyticsData(cacheKey, data, ANALYTICS_CACHE_DURATIONS.LONG);

    return this.formatAnalyticsResponse(data, period, query, cacheStatus);
  }

  /**
   * ==================== CACHE INVALIDATION ====================
   */

  async invalidateAnalyticsCache(shopId?: string): Promise<void> {
    try {
      const keysToDelete: string[] = [];

      // Invalidate all time periods for this shop
      Object.values(TimePeriod).forEach((period) => {
        keysToDelete.push(ANALYTICS_CACHE_KEYS.REVENUE(period as TimePeriod, shopId));
        keysToDelete.push(ANALYTICS_CACHE_KEYS.ORDERS(period as TimePeriod, shopId));
        keysToDelete.push(ANALYTICS_CACHE_KEYS.PAYMENT(period as TimePeriod, shopId));
        keysToDelete.push(ANALYTICS_CACHE_KEYS.PRODUCTS(period as TimePeriod, shopId));
        keysToDelete.push(ANALYTICS_CACHE_KEYS.COMPREHENSIVE(period as TimePeriod, shopId));
        keysToDelete.push(ANALYTICS_CACHE_KEYS.SHOP_RANKING(period as TimePeriod));
      });

      // Delete all keys in parallel
      await Promise.all(keysToDelete.map((key) => redis.del(key)));
      logger.info(`Invalidated analytics cache for shop: ${shopId}`);
    } catch (error) {
      logger.error('Error invalidating analytics cache:', error);
    }
  }

  async invalidateRealTimeCache(): Promise<void> {
    try {
      await redis.del(ANALYTICS_CACHE_KEYS.REALTIME);
      logger.debug('Invalidated real-time analytics cache');
    } catch (error) {
      logger.error('Error invalidating real-time cache:', error);
    }
  }

  /**
   * ==================== PRIVATE METHODS ====================
   */

  private async cacheAnalyticsData(
    key: string,
    data: any,
    duration: number
  ): Promise<void> {
    try {
      await redis.set(key, JSON.stringify(data), duration);
      logger.debug(`Cached analytics data: ${key} for ${duration} seconds`);
    } catch (error) {
      logger.error(`Error caching analytics data (${key}):`, error);
    }
  }

  private formatAnalyticsResponse<T>(
    data: T,
    period: TimePeriod,
    query?: AnalyticsQuery,
    cacheStatus?: 'hit' | 'miss'
  ): AnalyticsResponse<T> {
    const now = new Date();
    let from = query?.from || now;
    let to = query?.to || now;

    if (query?.period) {
      const dateRange = this.getDateRange(query.period);
      from = dateRange.from;
      to = dateRange.to;
    }

    return {
      success: true,
      data,
      period,
      dateRange: { from, to },
      generatedAt: now,
      cacheStatus: cacheStatus || 'miss',
    };
  }

  private getDateRange(period: TimePeriod): { from: Date; to: Date } {
    const now = new Date();

    switch (period) {
      case TimePeriod.TODAY:
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return { from: today, to: now };

      case TimePeriod.THIS_WEEK:
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return { from: weekStart, to: now };

      case TimePeriod.THIS_MONTH:
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: monthStart, to: now };

      case TimePeriod.THIS_YEAR:
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return { from: yearStart, to: now };

      default:
        return { from: new Date(now.getTime() - 24 * 60 * 60 * 1000), to: now };
    }
  }
}

