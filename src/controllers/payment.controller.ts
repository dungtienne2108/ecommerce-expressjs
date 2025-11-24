import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import {
  createPaymentSchema,
  updatePaymentStatusSchema,
  getPaymentsQuerySchema,
  handlePaymentWebhookSchema,
  cancelPaymentSchema,
} from '../validators/payment.validators';
import {
  createVNPayPaymentSchema,
  vnpayReturnSchema,
  vnpayIPNSchema,
} from '../validators/vnpay.validators';
import { UnauthorizedError, ValidationError } from '../errors/AppError';
import { paymentService } from '../config/container';
import { ApiResponse } from '../types/common';
import { PaymentSearchFilters } from '../types/payment.types';
import { PaymentStatus } from '@prisma/client';
import { VNPayService } from '../services/vnpay.service';
import { unitOfWork } from '../config/container';

export class PaymentController {
  private vnpayService: VNPayService;

  constructor() {
    this.vnpayService = new VNPayService(unitOfWork);
  }

  /**
   * @desc Tạo payment cho đơn hàng
   * @route POST /api/payments
   */
  createPayment = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { error, value } = createPaymentSchema.validate(req.body);
      if (error) {
        throw new ValidationError(
          error.details?.[0]?.message || 'Dữ liệu không hợp lệ'
        );
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('Người dùng không hợp lệ');
      }

      const result = await paymentService.createPayment(value.orderId, {
        amount: value.amount,
        currency: value.currency,
        method: value.method,
        expiredAt: value.expiredAt,
        note: value.note,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Tạo thanh toán thành công',
        data: result,
      };
      res.status(201).json(response);
    }
  );

  /**
   * @desc Lấy thông tin payment theo ID
   * @route GET /api/payments/:paymentId
   */
  getPaymentById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { paymentId } = req.params;
      if (!paymentId) {
        throw new ValidationError('Payment ID là bắt buộc');
      }

      const userId = req.user?.id;
      const result = await paymentService.getPaymentById(paymentId, userId);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy thông tin thanh toán thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Lấy payment theo order ID
   * @route GET /api/payments/order/:orderId
   */
  getPaymentByOrderId = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { orderId } = req.params;
      if (!orderId) {
        throw new ValidationError('Order ID là bắt buộc');
      }

      const result = await paymentService.getPaymentByOrderId(orderId);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy thông tin thanh toán theo đơn hàng thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Lấy danh sách payments với filter và phân trang
   * @route GET /api/payments
   */
  getPayments = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { error, value } = getPaymentsQuerySchema.validate(req.query);
      if (error) {
        throw new ValidationError(
          error.details?.[0]?.message || 'Dữ liệu không hợp lệ'
        );
      }

      const filters: PaymentSearchFilters = {
        page: value.page || 1,
        limit: value.limit || 10,
        status: value.status,
        method: value.method,
      };

      const result = await paymentService.getPayments(filters);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy danh sách thanh toán thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Cập nhật trạng thái payment
   * @route PATCH /api/payments/:paymentId/status
   */
  updatePaymentStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { paymentId } = req.params;
      if (!paymentId) {
        throw new ValidationError('Payment ID là bắt buộc');
      }

      const { error, value } = updatePaymentStatusSchema.validate(req.body);
      if (error) {
        throw new ValidationError(
          error.details?.[0]?.message || 'Dữ liệu không hợp lệ'
        );
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new UnauthorizedError('User chưa đăng nhập');
      }

      const result = await paymentService.updatePaymentStatus(paymentId, {
        status: value.status,
        transactionId: value.transactionId,
        gatewayResponse: value.gatewayResponse,
        failureReason: value.failureReason,
      });

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Cập nhật trạng thái thanh toán thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Hủy payment
   * @route POST /api/payments/:paymentId/cancel
   */
  cancelPayment = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { paymentId } = req.params;
      if (!paymentId) {
        throw new ValidationError('Payment ID là bắt buộc');
      }

      const { error, value } = cancelPaymentSchema.validate(req.body);
      if (error) {
        throw new ValidationError(
          error.details?.[0]?.message || 'Dữ liệu không hợp lệ'
        );
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User chưa đăng nhập');
      }

      const result = await paymentService.cancelPayment(
        paymentId,
        value.reason
      );

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Hủy thanh toán thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Xử lý webhook từ payment gateway
   * @route POST /api/payments/webhook
   */
  handlePaymentWebhook = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { error, value } = handlePaymentWebhookSchema.validate(req.body);
      if (error) {
        throw new ValidationError(
          error.details?.[0]?.message || 'Dữ liệu không hợp lệ'
        );
      }

      const result = await paymentService.handlePaymentWebhook({
        transactionId: value.transactionId,
        status: value.status,
        message: value.message,
        rawData: value.rawData,
      });

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Xử lý webhook thanh toán thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Lấy thống kê doanh thu từ payments
   * @route GET /api/payments/statistics
   */
  getPaymentStatistics = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined;
      const method = req.query.method as any;

      if (startDate && isNaN(startDate.getTime())) {
        throw new ValidationError('startDate không hợp lệ');
      }
      if (endDate && isNaN(endDate.getTime())) {
        throw new ValidationError('endDate không hợp lệ');
      }

      const result = await paymentService.getPaymentStatistics({
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(method && { method }),
      });

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy thống kê thanh toán thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Xử lý cashback cho payment
   * @route POST /api/payments/:paymentId/process-cashback
   */
  processCashbackForPayment = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { paymentId } = req.params;
      if (!paymentId) {
        throw new ValidationError('Payment ID là bắt buộc');
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new UnauthorizedError('User chưa đăng nhập');
      }

      const result = await paymentService.processCashbackForPayment(paymentId);

      const response: ApiResponse = {
        success: result.success,
        data: result,
        message: result.message || 'Xử lý cashback thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Xử lý hàng loạt pending cashbacks
   * @route POST /api/payments/cashback/process-pending
   */
  processPendingCashbacks = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const result = await paymentService.processPendingCashbacks();

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Xử lý pending cashbacks thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Retry failed cashbacks
   * @route POST /api/payments/cashback/retry-failed
   */
  retryFailedCashbacks = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const result = await paymentService.retryFailedCashbacks();

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Retry failed cashbacks thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Manual claim cashback cho user
   * @route POST /api/payments/cashback/claim/:cashbackId
   */
  claimCashbackForUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { cashbackId } = req.params;
      if (!cashbackId) {
        throw new ValidationError('Cashback ID là bắt buộc');
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new UnauthorizedError('User chưa đăng nhập');
      }

      const result = await paymentService.claimCashbackForUser(cashbackId, userId);

      const response: ApiResponse = {
        success: result.success,
        data: result,
        message: result.message || 'Claim cashback thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Xử lý expired cashbacks
   * @route POST /api/payments/cashback/handle-expired
   */
  handleExpiredCashbacks = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const result = await paymentService.handleExpiredCashbacks();

      const response: ApiResponse = {
        success: result.success,
        data: result,
        message: result.message || 'Xử lý expired cashbacks thành công',
      };
      res.json(response);
    }
  );

  /**
   * @desc Xử lý payments đã hết hạn (cron job)
   * @route POST /api/payments/process-expired
   */
  processExpiredPayments = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const processedCount = await paymentService.processExpiredPayments();

      const response: ApiResponse = {
        success: true,
        data: {
          processedCount,
        },
        message: `Đã xử lý ${processedCount} thanh toán hết hạn`,
      };
      res.json(response);
    }
  );

  // ==================== VNPAY METHODS ====================

  /**
   * @desc Tạo VNPay payment URL
   * @route POST /api/payments/vnpay/create
   */
  createVNPayPaymentUrl = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { error, value } = createVNPayPaymentSchema.validate(req.body);
      if (error) {
        throw new ValidationError(
          error.details?.[0]?.message || 'Dữ liệu không hợp lệ'
        );
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new UnauthorizedError('User chưa đăng nhập');
      }

      // Get client IP address
      const ipAddr =
        req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        '127.0.0.1';

      const result = await this.vnpayService.createPaymentUrl({
        orderId: value.orderId,
        amount: value.amount,
        orderInfo: value.orderInfo,
        orderType: value.orderType,
        locale: value.locale,
        bankCode: value.bankCode,
        ipAddr: Array.isArray(ipAddr) ? ipAddr[0] : ipAddr.toString(),
      });

      const response: ApiResponse = {
        success: true,
        message: 'Tạo VNPay payment URL thành công',
        data: result,
      };
      res.status(200).json(response);
    }
  );

  /**
   * @desc Xử lý VNPay return URL (redirect từ VNPay)
   * @route GET /api/payments/vnpay/return
   */
  handleVNPayReturn = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { error, value } = vnpayReturnSchema.validate(req.query);
      if (error) {
        throw new ValidationError(
          error.details?.[0]?.message || 'Dữ liệu không hợp lệ'
        );
      }

      const result = await this.vnpayService.verifyReturnUrl(value);

      if (!result.isValid) {
        // Redirect to frontend with error
        const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
        res.redirect(
          `${frontendUrl}/payment/result?success=false&message=${encodeURIComponent(result.message || 'Giao dịch thất bại')}`
        );
        return;
      }

      if (result.data?.responseCode !== '00') {
        // Payment failed
        const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
        res.redirect(
          `${frontendUrl}/payment/result?success=false&message=${encodeURIComponent(result.message || 'Thanh toán thất bại')}&txnRef=${result.data?.txnRef}`
        );
        return;
      }

      // Payment success
      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
      res.redirect(
        `${frontendUrl}/payment/result?success=true&message=${encodeURIComponent('Thanh toán thành công')}&txnRef=${result.data?.txnRef}&amount=${result.data?.amount}`
      );
    }
  );

  /**
   * @desc Xử lý VNPay IPN (Instant Payment Notification)
   * @route GET /api/payments/vnpay/ipn
   */
  handleVNPayIPN = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { error, value } = vnpayIPNSchema.validate(req.query);
      if (error) {
        res.status(200).json({
          RspCode: '99',
          Message: 'Invalid request',
        });
        return;
      }

      const result = await this.vnpayService.verifyIPN(value);

      res.status(200).json(result);
    }
  );
}

export const paymentController = new PaymentController();
