import { ANALYTICS_CACHE_KEYS, TimePeriod } from '../types/analytics.types';
import redis from '../config/redis';
import { logger } from '../services/logger';

/**
 * Utility class for managing analytics cache
 */
export class AnalyticsCacheUtil {
  /**
   * Invalidate all analytics cache
   */
  static async invalidateAll(): Promise<void> {
    try {
      const pattern = 'analytics:*';
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await Promise.all(keys.map((key) => redis.del(key)));
        logger.info(`Invalidated ${keys.length} analytics cache keys`);
      }
    } catch (error) {
      logger.error('Error invalidating all analytics cache:', error);
    }
  }

  /**
   * Invalidate analytics cache for a specific shop
   */
  static async invalidateShop(shopId: string): Promise<void> {
    try {
      const keysToDelete: string[] = [];
      // Invalidate all time periods for this shop
      Object.values(TimePeriod).forEach((period) => {
        if (typeof period === 'string') {
          keysToDelete.push(ANALYTICS_CACHE_KEYS.REVENUE(period as TimePeriod, shopId));
          keysToDelete.push(ANALYTICS_CACHE_KEYS.ORDERS(period as TimePeriod, shopId));
          keysToDelete.push(ANALYTICS_CACHE_KEYS.PAYMENT(period as TimePeriod, shopId));
          keysToDelete.push(ANALYTICS_CACHE_KEYS.PRODUCTS(period as TimePeriod, shopId));
          keysToDelete.push(ANALYTICS_CACHE_KEYS.COMPREHENSIVE(period as TimePeriod, shopId));
        }
      });

      if (keysToDelete.length > 0) {
        await Promise.all(keysToDelete.map((key) => redis.del(key)));
        logger.info(`Invalidated analytics cache for shop ${shopId}`);
      }
    } catch (error) {
      logger.error(`Error invalidating analytics cache for shop ${shopId}:`, error);
    }
  }

  /**
   * Invalidate specific analytics type
   */
  static async invalidateType(type: 'REVENUE' | 'ORDERS' | 'PAYMENT' | 'PRODUCTS', shopId?: string): Promise<void> {
    try {
      const keysToDelete: string[] = [];

      Object.values(TimePeriod).forEach((period) => {
        if (typeof period === 'string') {
          const key = ANALYTICS_CACHE_KEYS[type](period as TimePeriod, shopId);
          keysToDelete.push(key);
        }
      });

      if (keysToDelete.length > 0) {
        await Promise.all(keysToDelete.map((key) => redis.del(key)));
        logger.info(`Invalidated ${type} analytics cache${shopId ? ` for shop ${shopId}` : ''}`);
      }
    } catch (error) {
      logger.error(`Error invalidating ${type} analytics cache:`, error);
    }
  }

  /**
   * Invalidate real-time stats
   */
  static async invalidateRealTime(): Promise<void> {
    try {
      await redis.del(ANALYTICS_CACHE_KEYS.REALTIME);
      logger.debug('Invalidated real-time analytics cache');
    } catch (error) {
      logger.error('Error invalidating real-time cache:', error);
    }
  }

  /**
   * Get cache key info (for debugging)
   */
  static async getCacheInfo(): Promise<{ totalKeys: number; keys: string[] }> {
    try {
      const keys = await redis.keys('analytics:*');
      return {
        totalKeys: keys.length,
        keys,
      };
    } catch (error) {
      logger.error('Error getting cache info:', error);
      return {
        totalKeys: 0,
        keys: [],
      };
    }
  }

  /**
   * Clear all cache (use with caution!)
   */
  static async clearAll(): Promise<void> {
    try {
      await redis.flushAll();
      logger.warn('Cleared all cache!');
    } catch (error) {
      logger.error('Error clearing all cache:', error);
    }
  }
}

