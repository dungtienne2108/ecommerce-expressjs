import { Server as SocketIOServer } from 'socket.io';
import { AnalyticsService } from '../services/analytics.service';
import { RealTimeStats, TimePeriod } from '../types/analytics.types';
import { logger } from '../services/logger';

/**
 * Real-time Analytics Events Emitter
 * Integrates with Socket.IO to broadcast real-time analytics updates
 */
export class AnalyticsEventsEmitter {
  private io: SocketIOServer;
  private analyticsService: AnalyticsService;
  private realtimeUpdateInterval: NodeJS.Timeout | null = null;
  private readonly UPDATE_INTERVAL = 30000; // 30 seconds for real-time stats

  constructor(io: SocketIOServer, analyticsService: AnalyticsService) {
    this.io = io;
    this.analyticsService = analyticsService;
  }

  /**
   * Start emitting real-time analytics updates
   */
  start(): void {
    try {
      logger.info('Starting real-time analytics events emission');

      // Send real-time stats every 30 seconds
      this.realtimeUpdateInterval = setInterval(async () => {
        try {
          const stats = await this.analyticsService.getRealTimeStats();
          this.io.emit('analytics:realtime-update', stats.data);
        } catch (error) {
          logger.error('Error emitting real-time stats:', error);
        }
      }, this.UPDATE_INTERVAL);
    } catch (error) {
      logger.error('Error starting analytics events emission:', error);
    }
  }

  /**
   * Stop emitting real-time analytics updates
   */
  stop(): void {
    if (this.realtimeUpdateInterval) {
      clearInterval(this.realtimeUpdateInterval);
      this.realtimeUpdateInterval = null;
      logger.info('Stopped real-time analytics events emission');
    }
  }

  /**
   * Emit order created event to analytics dashboard subscribers
   * Used to update real-time stats when a new order is created
   */
  async emitOrderCreated(orderId: string, shopId: string, totalAmount: number): Promise<void> {
    try {
      this.io.emit('analytics:order-created', {
        orderId,
        shopId,
        totalAmount,
        timestamp: new Date(),
      });

      // Invalidate real-time cache
      await this.analyticsService.invalidateRealTimeCache();
    } catch (error) {
      logger.error('Error emitting order created event:', error);
    }
  }

  /**
   * Emit order status changed event
   */
  async emitOrderStatusChanged(orderId: string, shopId: string, status: string): Promise<void> {
    try {
      this.io.emit('analytics:order-status-changed', {
        orderId,
        shopId,
        status,
        timestamp: new Date(),
      });

      // Invalidate analytics cache for this shop
      await this.analyticsService.invalidateAnalyticsCache(shopId);
    } catch (error) {
      logger.error('Error emitting order status changed event:', error);
    }
  }

  /**
   * Emit payment status changed event
   */
  async emitPaymentStatusChanged(
    paymentId: string,
    orderId: string,
    shopId: string,
    status: string
  ): Promise<void> {
    try {
      this.io.emit('analytics:payment-status-changed', {
        paymentId,
        orderId,
        shopId,
        status,
        timestamp: new Date(),
      });

      await this.analyticsService.invalidateAnalyticsCache(shopId);
    } catch (error) {
      logger.error('Error emitting payment status changed event:', error);
    }
  }

  /**
   * Emit revenue update event to admin/shop dashboard
   */
  async emitRevenueUpdate(shopId?: string): Promise<void> {
    try {
      const stats = await this.analyticsService.getRevenueStats(shopId, {
        period: TimePeriod.THIS_MONTH,
      });

      const room = shopId ? `analytics:shop:${shopId}` : 'analytics:system';
      this.io.to(room).emit('analytics:revenue-updated', stats.data);
    } catch (error) {
      logger.error('Error emitting revenue update:', error);
    }
  }

  /**
   * Subscribe to shop analytics updates
   * Client joins a room to receive updates for a specific shop
   */
  subscribeToShopAnalytics(socketId: string, shopId: string): void {
    try {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.join(`analytics:shop:${shopId}`);
        logger.debug(`Socket ${socketId} subscribed to analytics for shop ${shopId}`);
      }
    } catch (error) {
      logger.error('Error subscribing to shop analytics:', error);
    }
  }

  /**
   * Unsubscribe from shop analytics updates
   */
  unsubscribeFromShopAnalytics(socketId: string, shopId: string): void {
    try {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.leave(`analytics:shop:${shopId}`);
        logger.debug(`Socket ${socketId} unsubscribed from analytics for shop ${shopId}`);
      }
    } catch (error) {
      logger.error('Error unsubscribing from shop analytics:', error);
    }
  }

  /**
   * Subscribe to system-wide analytics (admin only)
   */
  subscribeToSystemAnalytics(socketId: string): void {
    try {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.join('analytics:system');
        logger.debug(`Socket ${socketId} subscribed to system analytics`);
      }
    } catch (error) {
      logger.error('Error subscribing to system analytics:', error);
    }
  }

  /**
   * Broadcast analytics dashboard update to specific shop
   */
  async broadcastShopDashboard(shopId: string): Promise<void> {
    try {
      const analytics = await this.analyticsService.getComprehensiveAnalytics(shopId, {
        period: TimePeriod.THIS_MONTH,
      });

      this.io.to(`analytics:shop:${shopId}`).emit('analytics:dashboard-update', analytics.data);
    } catch (error) {
      logger.error(`Error broadcasting shop dashboard for ${shopId}:`, error);
    }
  }

  /**
   * Broadcast system dashboard update to admin
   */
  async broadcastSystemDashboard(): Promise<void> {
    try {
      const analytics = await this.analyticsService.getComprehensiveAnalytics(undefined, {
        period: TimePeriod.THIS_MONTH,
      });

      this.io.to('analytics:system').emit('analytics:system-dashboard-update', analytics.data);
    } catch (error) {
      logger.error('Error broadcasting system dashboard:', error);
    }
  }

  /**
   * Get IO instance
   */
  getIO(): SocketIOServer {
    return this.io;
  }
}

