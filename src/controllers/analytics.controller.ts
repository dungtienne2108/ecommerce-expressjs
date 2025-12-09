import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsQuery, ShopAnalyticsQuery, TimePeriod } from '../types/analytics.types';
import { ValidationError } from '../errors/AppError';
import { ApiResponse } from '../types/common';
import { analyticsService } from '../config/container';

export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  /**
   * @desc Lấy thống kê doanh thu theo thời gian thực
   * @route GET /api/analytics/revenue
   * @access Public (Admin, Shop owner có thể lọc theo shop của họ)
   */
  getRevenueStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const shopId = req.query.shopId as string;
      const query: AnalyticsQuery = {
        period: (req.query.period as TimePeriod) || TimePeriod.THIS_MONTH,
        from: req.query.from ? new Date(req.query.from as string) : undefined,
        to: req.query.to ? new Date(req.query.to as string) : undefined,
      };

      const result = await this.analyticsService.getRevenueStats(shopId, query);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy thống kê doanh thu thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Lấy xu hướng doanh thu theo thời gian
   * @route GET /api/analytics/revenue-trend
   */
  getRevenueTrend = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const shopId = req.query.shopId as string;
      const query: AnalyticsQuery = {
        period: (req.query.period as TimePeriod) || TimePeriod.THIS_MONTH,
        from: req.query.from ? new Date(req.query.from as string) : undefined,
        to: req.query.to ? new Date(req.query.to as string) : undefined,
      };

      const result = await this.analyticsService.getRevenueTrend(shopId, query);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy xu hướng doanh thu thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Lấy thống kê đơn hàng theo thời gian thực
   * @route GET /api/analytics/orders
   */
  getOrderStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const shopId = req.query.shopId as string;
      const query: AnalyticsQuery = {
        period: (req.query.period as TimePeriod) || TimePeriod.THIS_MONTH,
        from: req.query.from ? new Date(req.query.from as string) : undefined,
        to: req.query.to ? new Date(req.query.to as string) : undefined,
      };

      const result = await this.analyticsService.getOrderStats(shopId, query);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy thống kê đơn hàng thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Lấy xu hướng đơn hàng theo thời gian
   * @route GET /api/analytics/orders-trend
   */
  getOrderTrend = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const shopId = req.query.shopId as string;
      const query: AnalyticsQuery = {
        period: (req.query.period as TimePeriod) || TimePeriod.THIS_MONTH,
        from: req.query.from ? new Date(req.query.from as string) : undefined,
        to: req.query.to ? new Date(req.query.to as string) : undefined,
      };

      const result = await this.analyticsService.getOrderTrend(shopId, query);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy xu hướng đơn hàng thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Lấy thống kê thanh toán
   * @route GET /api/analytics/payment
   */
  getPaymentStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const shopId = req.query.shopId as string;
      const query: AnalyticsQuery = {
        period: (req.query.period as TimePeriod) || TimePeriod.THIS_MONTH,
        from: req.query.from ? new Date(req.query.from as string) : undefined,
        to: req.query.to ? new Date(req.query.to as string) : undefined,
      };

      const result = await this.analyticsService.getPaymentStats(shopId, query);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy thống kê thanh toán thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Lấy thống kê sản phẩm (top selling products)
   * @route GET /api/analytics/products
   */
  getProductAnalytics = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const shopId = req.query.shopId as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const query: AnalyticsQuery & { limit?: number } = {
        period: (req.query.period as TimePeriod) || TimePeriod.THIS_MONTH,
        from: req.query.from ? new Date(req.query.from as string) : undefined,
        to: req.query.to ? new Date(req.query.to as string) : undefined,
        limit,
      };

      const result = await this.analyticsService.getProductAnalytics(shopId, query);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy thống kê sản phẩm thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Lấy xếp hạng top shops
   * @route GET /api/analytics/shops-ranking
   */
  getShopRanking = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const query: AnalyticsQuery & { limit?: number } = {
        period: (req.query.period as TimePeriod) || TimePeriod.THIS_MONTH,
        from: req.query.from ? new Date(req.query.from as string) : undefined,
        to: req.query.to ? new Date(req.query.to as string) : undefined,
        limit,
      };

      const result = await this.analyticsService.getShopRanking(query);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy xếp hạng cửa hàng thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Lấy danh sách top shops theo doanh thu
   * @route GET /api/analytics/top-shops
   */
  getTopShopsByRevenue = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const query: AnalyticsQuery & { limit?: number } = {
        period: (req.query.period as TimePeriod) || TimePeriod.THIS_MONTH,
        from: req.query.from ? new Date(req.query.from as string) : undefined,
        to: req.query.to ? new Date(req.query.to as string) : undefined,
        limit,
      };

      const result = await this.analyticsService.getTopShopsByRevenue(query);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy danh sách top shops thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Lấy thống kê real-time
   * @route GET /api/analytics/real-time
   */
  getRealTimeStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const result = await this.analyticsService.getRealTimeStats();

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy thống kê real-time thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Lấy thống kê toàn diện (dashboard)
   * @route GET /api/analytics/comprehensive
   */
  getComprehensiveAnalytics = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const shopId = req.query.shopId as string;
      const query: AnalyticsQuery = {
        period: (req.query.period as TimePeriod) || TimePeriod.THIS_MONTH,
        from: req.query.from ? new Date(req.query.from as string) : undefined,
        to: req.query.to ? new Date(req.query.to as string) : undefined,
      };

      const result = await this.analyticsService.getComprehensiveAnalytics(shopId, query);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy thống kê toàn diện thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Dashboard của shop (chủ shop xem doanh thu và đơn hàng của shop mình)
   * @route GET /api/shops/:shopId/analytics
   */
  getShopDashboard = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { shopId } = req.params;
      if (!shopId) {
        throw new ValidationError('Shop ID là bắt buộc');
      }

      const query: AnalyticsQuery = {
        period: (req.query.period as TimePeriod) || TimePeriod.THIS_MONTH,
        from: req.query.from ? new Date(req.query.from as string) : undefined,
        to: req.query.to ? new Date(req.query.to as string) : undefined,
      };

      const result = await this.analyticsService.getComprehensiveAnalytics(shopId, query);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy dashboard cửa hàng thành công',
      };
      res.json(response);
    }
  );
}

export const analyticsController = new AnalyticsController(analyticsService);

