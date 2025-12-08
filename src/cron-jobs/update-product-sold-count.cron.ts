/**
 * Update Product Sold Count Cron Job
 * Runs every 1 minute to update the sold count of products based on completed orders
 */

import { BaseCronJob } from './base.cron';
import { prisma } from '../config/prisma';
import { logger } from '../services/logger';
import { OrderStatus } from '@prisma/client';

export class UpdateProductSoldCountCronJob extends BaseCronJob {
  constructor() {
    super({
      name: 'UpdateProductSoldCount',
      schedule: '* * * * *', // Chạy mỗi 1 phút
      enabled: true,
      runOnStart: false,
    });
  }

  /**
   * Execute the cron job - update soldCount for all products
   */
  async execute(): Promise<void> {
    try {
      // Lấy tất cả các OrderItem từ các Order có trạng thái COMPLETED
      const completedOrderItems = await prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            status: OrderStatus.COMPLETED,
          },
        },
        _sum: {
          quantity: true,
        },
      });

      logger.debug(`Found ${completedOrderItems.length} products with completed orders`, {
        module: 'UpdateProductSoldCountCronJob',
      });

      let updatedCount = 0;
      let errorCount = 0;

      // Cập nhật soldCount cho mỗi product
      for (const item of completedOrderItems) {
        try {
          const totalSold = item._sum.quantity || 0;

          // Cập nhật product với soldCount mới
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              soldCount: totalSold,
              updatedAt: new Date(),
            },
          });

          updatedCount++;
          logger.debug(`Updated product ${item.productId} with soldCount: ${totalSold}`, {
            module: 'UpdateProductSoldCountCronJob',
          });
        } catch (error) {
          errorCount++;
          logger.error(`Failed to update product ${item.productId}:`, error, {
            module: 'UpdateProductSoldCountCronJob',
          });
        }
      }

      // Log summary
      logger.info(
        `Sold count update completed. Updated: ${updatedCount}, Errors: ${errorCount}`,
        { module: 'UpdateProductSoldCountCronJob' },
      );

      // Optional: Clear product cache to ensure fresh data
      await this.clearProductCache();
    } catch (error) {
      logger.error('Error in UpdateProductSoldCountCronJob:', error, {
        module: 'UpdateProductSoldCountCronJob',
      });
      throw error;
    }
  }

  /**
   * Clear product cache to ensure consistency
   * Adjust based on your cache implementation
   */
  private async clearProductCache(): Promise<void> {
    try {
      // Nếu bạn sử dụng Redis cache
      const redis = require('../config/redis').default;

      // Xóa tất cả cache product keys
      const keys = await redis.keys('product:*');
      if (keys && keys.length > 0) {
        await redis.del(...keys);
        logger.debug(`Cleared ${keys.length} product cache keys`, {
          module: 'UpdateProductSoldCountCronJob',
        });
      }
    } catch (error) {
      logger.warn('Failed to clear product cache:', {  }, {
        module: 'UpdateProductSoldCountCronJob',
      });
      // Không throw error ở đây để job vẫn được coi là thành công
    }
  }

  /**
   * Override error handler to add custom logic
   */
  protected override async handleError(error: unknown): Promise<void> {
    // Có thể thêm notification hoặc retry logic ở đây
    // Ví dụ: gửi alert, log to external service, etc.
    logger.error('Critical error in UpdateProductSoldCountCronJob:', { error }, {
      module: 'UpdateProductSoldCountCronJob',
    });
  }
}

