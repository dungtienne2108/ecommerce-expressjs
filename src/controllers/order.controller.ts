import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import {
    cancelOrderSchema,
  createOrderSchema,
  getOrdersQuerySchema,
  updateOrderStatusSchema,
} from '../validators/order.validators';
import { UnauthorizedError, ValidationError } from '../errors/AppError';
import { orderService } from '../config/container';
import { ApiResponse } from '../types/common';
import { OrderFilters } from '../types/order.types';
import { OrderStatus, PaymentStatus } from '@prisma/client';

export class OrderController {
  /**
   * @desc Tạo đơn hàng từ giỏ hàng
   * @route POST /api/orders
   */
  createOrder = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { error, value } = createOrderSchema.validate(req.body);
      if (error) {
        throw new ValidationError(
          error.details?.[0]?.message || 'Dữ liệu không hợp lệ'
        );
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('Người dùng không hợp lệ');
      }

      const result = await orderService.createOrderFromCart(userId, value);

      const response: ApiResponse = {
        success: true,
        message: 'Tạo đơn hàng thành công',
        data: result,
      };
      res.status(201).json(response);
    }
  );

  getOrders = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const filters: OrderFilters = {
        status: req.query.status as OrderStatus,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
        shopId: req.query.shopId as string,
      }

      const orders = await orderService.getOrders(filters);
      const response: ApiResponse = {
        success: true,
        data: orders,
        message: 'Lấy danh sách đơn hàng thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Lấy thông tin đơn hàng theo ID
   * @route GET /api/orders/:orderId
   */
  getOrderById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { orderId } = req.params;
      if (!orderId) {
        throw new ValidationError('Order ID là bắt buộc');
      }

      const userId = req.user?.id;
      const result = await orderService.getOrderById(orderId, userId);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy thông tin đơn hàng thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Lấy danh sách đơn hàng của người dùng hiện tại với phân trang và lọc theo trạng thái
   * @route GET /api/orders
   */
  getMyOrders = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const minAmount = req.query.minTotalAmount ? Number(req.query.minTotalAmount as string) : 0;
      const maxAmount = req.query.maxTotalAmount ? Number(req.query.maxTotalAmount as string) : 0;

      const filters: OrderFilters = {
        status: req.query.status as OrderStatus,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
        paymentStatus: req.query.paymentStatus as PaymentStatus,
        minTotalAmount: minAmount ?? 0,
        maxTotalAmount: maxAmount ?? 0,
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User chưa đăng nhập');
      }

      const result = await orderService.getUserOrders(userId, filters);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy danh sách đơn hàng thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Lấy danh sách đơn hàng của shop với phân trang và lọc theo trạng thái
   * @route GET /api/shops/:shopId/orders
   */
  getShopOrders = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { shopId } = req.params;
      if (!shopId) {
        throw new ValidationError('Shop ID là bắt buộc');
      }

      const { error, value } = getOrdersQuerySchema.validate(req.query);
      if (error) {
        throw new ValidationError(
          error.details?.[0]?.message || 'Dữ liệu không hợp lệ'
        );
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User chưa đăng nhập');
      }

      const result = await orderService.getShopOrders(shopId, userId, {
        page: value.page,
        limit: value.limit,
        status: value.status,
      });

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy danh sách đơn hàng của shop thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Cập nhật trạng thái đơn hàng
   * @route PATCH /api/orders/:orderId/status
   */
  updateOrderStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { orderId } = req.params;
      if (!orderId) {
        throw new ValidationError('Order ID là bắt buộc');
      }

      const { error, value } = updateOrderStatusSchema.validate(req.body);
      if (error) {
        throw new ValidationError(
          error.details?.[0]?.message || 'Dữ liệu không hợp lệ'
        );
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new UnauthorizedError('User chưa đăng nhập');
      }

      const result = await orderService.updateOrderStatus(
        orderId,
        value,
        userId
      );

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Cập nhật trạng thái đơn hàng thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Hủy đơn hàng
   * @route POST /api/orders/:orderId/cancel
   */
  cancelOrder = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { orderId } = req.params;
      if (!orderId) {
        throw new ValidationError('Order ID là bắt buộc');
      }

      const { error, value } = cancelOrderSchema.validate(req.body);
      if (error) {
        throw new ValidationError(
          error.details?.[0]?.message || 'Dữ liệu không hợp lệ'
        );
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User chưa đăng nhập');
      }

      const result = await orderService.cancelOrder(
        orderId,
        userId,
        value.reason
      );

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Hủy đơn hàng thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Xác nhận đơn hàng ()
   * @route POST /api/orders/:orderId/confirm
   */
  confirmOrder = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { orderId } = req.params;
      if (!orderId) {
        throw new ValidationError('Order ID là bắt buộc');
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User chưa đăng nhập');
      }

      const result = await orderService.confirmOrder(orderId, userId);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Xác nhận đơn hàng thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Lấy lịch sử trạng thái của đơn hàng
   * @route GET /api/orders/:orderId/history
   */
  getOrderHistory = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { orderId } = req.params;
      if (!orderId) {
        throw new ValidationError('Order ID is required');
      }

      const result = await orderService.getOrderStatusHistory(orderId);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy lịch sử đơn hàng thành công',
      };
      res.json(response);
    }
  );
}

export const orderController = new OrderController();
