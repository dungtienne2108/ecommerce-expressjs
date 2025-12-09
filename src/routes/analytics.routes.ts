import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const analyticsRoutes = Router();

/**
 * Public analytics routes (with optional shop filtering)
 * GET /api/analytics/...
 */

// Revenue analytics
analyticsRoutes.get('/analytics/revenue', authenticateToken,
  analyticsController.getRevenueStats
);
analyticsRoutes.get('/analytics/revenue-trend', authenticateToken,
  analyticsController.getRevenueTrend
);

// Order analytics
analyticsRoutes.get('/analytics/orders', authenticateToken,
  analyticsController.getOrderStats
);
analyticsRoutes.get('/analytics/orders-trend', authenticateToken,
  analyticsController.getOrderTrend
);

// Payment analytics
analyticsRoutes.get('/analytics/payment', authenticateToken,
  analyticsController.getPaymentStats
);

// Product analytics
analyticsRoutes.get('/analytics/products', authenticateToken,
  analyticsController.getProductAnalytics
);

// Shop ranking
analyticsRoutes.get('/analytics/shops-ranking', authenticateToken,
  analyticsController.getShopRanking
);

analyticsRoutes.get('/analytics/top-shops', authenticateToken,
  analyticsController.getTopShopsByRevenue
);

// Real-time stats
analyticsRoutes.get('/analytics/real-time', authenticateToken,
  analyticsController.getRealTimeStats
);

// Comprehensive analytics (dashboard)
analyticsRoutes.get('/analytics/comprehensive', authenticateToken,
  analyticsController.getComprehensiveAnalytics
);

/**
 * Shop-specific analytics
 * GET /api/shops/:shopId/analytics
 */
analyticsRoutes.get('/shops/:shopId/analytics', authenticateToken,
  analyticsController.getShopDashboard
);

export default analyticsRoutes;

