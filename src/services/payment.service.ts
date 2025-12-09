import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { NotFoundError, ValidationError, ForbiddenError } from '../errors/AppError';
import { IUnitOfWork } from '../repositories/interfaces/uow.interface';
import {
  CreatePaymentInput,
  PaymentResponse,
  PaymentSearchFilters,
  UpdatePaymentStatusInput,
  PaymentWebhookData,
} from '../types/payment.types';
import { PaginatedResponse } from '../types/common';
import redis from '../config/redis';
import { CacheUtil } from '../utils/cache.util';
import {
  Web3CashbackService,
  type Web3CashbackResult,
  type CashbackProcessingResult,
} from './web3Cashback.service';

export class PaymentService {
  private web3CashbackService: Web3CashbackService;

  constructor(
    private uow: IUnitOfWork,
  ) {
    this.web3CashbackService = new Web3CashbackService(uow);
  }

  /**
   * Tạo payment cho đơn hàng
   * @param orderId 
   * @param input 
   * @returns 
   */
  async createPayment(
    orderId: string,
    input: CreatePaymentInput
  ): Promise<PaymentResponse> {
    return this.uow.executeInTransaction(async (uow) => {
      // Kiểm tra order tồn tại
      const order = await uow.orders.findById(orderId);
      if (!order) {
        throw new NotFoundError('Đơn hàng không tồn tại');
      }

      // Kiểm tra order đã có payment chưa
      const existingPayment = await uow.payments.findByOrderId(orderId);
      if (existingPayment && existingPayment.status !== PaymentStatus.FAILED) {
        throw new ValidationError('Đơn hàng đã có thanh toán');
      }

      // Tính expiredAt (mặc định 15 phút)
      const expiredAt = input.expiredAt || new Date(Date.now() + 15 * 60 * 1000);

      // Tạo payment
      const payment = await uow.payments.create({
        order: { connect: { id: orderId } },
        amount: input.amount,
        currency: input.currency || 'VND',
        method: input.method,
        status: PaymentStatus.PENDING,
        expiredAt,
        note: input.note || null,
      });

      // Invalidate cache
      await this.invalidatePaymentCache(undefined, orderId);

      return this.mapToPaymentResponse(payment);
    });
  }

  /**
   * Lấy thông tin payment theo ID
   * @param paymentId 
   * @param userId (optional) - để check quyền
   * @returns 
   */
  async getPaymentById(
    paymentId: string,
    userId?: string
  ): Promise<PaymentResponse> {
    // Kiểm tra cache trước
    const cacheKey = CacheUtil.paymentById(paymentId);
    const cachedPayment = await redis.get(cacheKey);
    if (cachedPayment) {
      return JSON.parse(cachedPayment);
    }

    const payment = await this.uow.payments.findById(paymentId, {
      order: true,
      cashback: true,
    });

    if (!payment) {
      throw new NotFoundError('Thanh toán không tồn tại');
    }

    // Nếu có userId, kiểm tra quyền
    // 🔥 OPTIMIZED: Use already-fetched order instead of querying again
    if (userId && payment.orderId && payment.order) {
      // Kiểm tra có phải chủ đơn hàng hoặc chủ shop
      if (payment.order.userId !== userId) {
        const shop = await this.uow.shops.findById(payment.order.shopId);
        if (!shop || shop.ownerId !== userId) {
          throw new ForbiddenError('Bạn không có quyền xem thanh toán này');
        }
      }
    }

    const paymentResponse = this.mapToPaymentResponse(payment);

    // Lưu vào cache 30 phút
    await redis.set(cacheKey, JSON.stringify(paymentResponse), 1800);

    return paymentResponse;
  }

  /**
   * Lấy payment theo order ID
   * @param orderId 
   * @returns 
   */
  async getPaymentByOrderId(orderId: string): Promise<PaymentResponse | null> {
    // Kiểm tra cache trước
    const cacheKey = CacheUtil.paymentByOrderId(orderId);
    const cachedPayment = await redis.get(cacheKey);
    if (cachedPayment) {
      return JSON.parse(cachedPayment);
    }

    const payment = await this.uow.payments.findByOrderId(orderId, {
      order: true,
      cashback: true,
    });

    if (!payment) {
      return null;
    }

    const paymentResponse = this.mapToPaymentResponse(payment);

    // Lưu vào cache 30 phút
    await redis.set(cacheKey, JSON.stringify(paymentResponse), 1800);

    return paymentResponse;
  }

  /**
   * Lấy danh sách payments với filter
   * @param options 
   * @returns 
   */
  async getPayments(
    options?: PaymentSearchFilters
  ): Promise<PaginatedResponse<PaymentResponse>> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;

    // Tạo cache key
    const cacheKey = CacheUtil.paymentsList(page, limit);

    // Kiểm tra cache
    const cachedResult = await redis.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    const payments = await this.uow.payments.findMany({
      skip: (page - 1) * limit,
      take: limit,
      ...(options?.status && { status: options.status }),
      ...(options?.method && { method: options.method }),
      ...(options?.where && { where: options.where }),
    });

    const total = await this.uow.payments.count(options?.where);

    const result = {
      data: payments.map(this.mapToPaymentResponse),
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
        hasNext: (page + 1) * limit < total,
        hasPrev: page > 1,
      },
    };

    // Lưu vào cache 15 phút
    await redis.set(cacheKey, JSON.stringify(result), 900);

    return result;
  }

  /**
   * Cập nhật trạng thái payment
   * @param paymentId 
   * @param input 
   * @returns 
   */
  async updatePaymentStatus(
    paymentId: string,
    input: UpdatePaymentStatusInput
  ): Promise<PaymentResponse> {
    return this.uow.executeInTransaction(async (uow) => {
      const payment = await uow.payments.findById(paymentId, { order: true });
      if (!payment) {
        throw new NotFoundError('Thanh toán không tồn tại');
      }

      // Validate status transition
      this.validateStatusTransition(payment.status, input.status);

      // Cập nhật payment
      const updatedPayment = await uow.payments.updateStatus(
        paymentId,
        input.status,
        {
          transactionId: input.transactionId ?? '',
          gatewayResponse: input.gatewayResponse,
          ...(input.status === PaymentStatus.PAID && { paidAt: new Date() }),
          ...(input.status === PaymentStatus.FAILED && {
            failedAt: new Date(),
            failureReason: input.failureReason,
          }),
        }
      );

      // Nếu thanh toán thành công, cập nhật order và tạo cashback
      if (input.status === PaymentStatus.PAID && payment.orderId) {
        // Cập nhật order payment status
        await uow.orders.update(payment.orderId, {
          paymentStatus: PaymentStatus.PAID,
          paidAt: new Date(),
        });

        // Tạo cashback nếu đủ điều kiện
        try {
          const order = await uow.orders.findById(payment.orderId, { user: true });
          if (order?.userId) {
            const user = await uow.users.findById(order.userId);
            if (user?.walletAddress) {
              const existingCashback = await uow.cashbacks.findByPaymentId(payment.id);
              if (!existingCashback) {
                const cashbackPercentage = 1; // 1%
                // const cashbackAmount = (Number(payment.amount) * cashbackPercentage) / 100;
                const cashbackAmount = Number(payment.amount);
                const eligibleAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

                await uow.cashbacks.create({
                  payment: { connect: { id: payment.id } },
                  user: { connect: { id: order.userId } },
                  order: { connect: { id: payment.orderId } },
                  amount: cashbackAmount,
                  percentage: cashbackPercentage,
                  currency: payment.currency,
                  walletAddress: user.walletAddress,
                  blockchainNetwork: user.preferredNetwork || 'BSC',
                  status: 'PENDING',
                  eligibleAt,
                  expiresAt,
                  updatedAt: new Date(),
                  metadata: {
                    orderNumber: order.orderNumber,
                    createdBy: 'payment_update',
                  },
                });

                console.log(
                  `✅ Tạo cashback từ payment: ${payment.id} | Amount: ${cashbackAmount}`
                );
              }
            }
          }
        } catch (error) {
          console.error('❌ Lỗi tạo cashback từ payment:', error);
          // Không throw error để không ảnh hưởng đến quá trình cập nhật payment
        }
      }

      const result = await uow.payments.findById(paymentId, {
        order: true,
        cashback: true,
      });
      if (!result) {
        throw new NotFoundError('Thanh toán không tồn tại');
      }

      // Invalidate cache
      // await this.invalidatePaymentCache(paymentId, payment.orderId);

      return this.mapToPaymentResponse(result);
    });
  }

  /**
   * Xử lý webhook từ payment gateway
   * @param webhookData 
   * @returns 
   */
  async handlePaymentWebhook(
    webhookData: PaymentWebhookData
  ): Promise<PaymentResponse> {
    return this.uow.executeInTransaction(async (uow) => {
      // Tìm payment theo transactionId
      const payment = await uow.payments.findByTransactionId(
        webhookData.transactionId
      );

      if (!payment) {
        throw new NotFoundError(
          `Payment với transaction ${webhookData.transactionId} không tồn tại`
        );
      }

      // Verify signature (tùy gateway)
      // this.verifyWebhookSignature(webhookData);

      // Cập nhật payment status dựa vào webhook
      let newStatus: PaymentStatus;
      switch (webhookData.status) {
        case 'success':
        case 'completed':
          newStatus = PaymentStatus.PAID;
          break;
        case 'failed':
        case 'error':
          newStatus = PaymentStatus.FAILED;
          break;
        default:
          newStatus = PaymentStatus.PENDING;
      }

      return this.updatePaymentStatus(payment.id, {
        status: newStatus,
        transactionId: webhookData.transactionId,
        gatewayResponse: webhookData.rawData,
        ...(newStatus === PaymentStatus.FAILED && {
          failureReason: webhookData.message,
        }),
      });
    });
  }

  /**
   * Hủy payment (chỉ cho PENDING)
   * @param paymentId 
   * @param reason 
   * @returns 
   */
  async cancelPayment(
    paymentId: string,
    reason?: string
  ): Promise<PaymentResponse> {
    const payment = await this.uow.payments.findById(paymentId);
    if (!payment) {
      throw new NotFoundError('Thanh toán không tồn tại');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new ValidationError('Chỉ có thể hủy thanh toán đang chờ xử lý');
    }

    return this.updatePaymentStatus(paymentId, {
      status: PaymentStatus.FAILED,
      failureReason: reason || 'Đã hủy thanh toán',
    });
  }

  /**
   * Xử lý các payment đã hết hạn
   * @returns số lượng payment đã xử lý
   */
  async processExpiredPayments(): Promise<number> {
    const expiredPayments = await this.uow.payments.findExpiredPendingPayments();

    let processedCount = 0;
    for (const payment of expiredPayments) {
      try {
        await this.updatePaymentStatus(payment.id, {
          status: PaymentStatus.FAILED,
          failureReason: 'Thanh toán đã hết hạn',
        });
        processedCount++;
      } catch (error) {
        console.error(
          `Failed to process expired payment ${payment.id}:`,
          error
        );
      }
    }

    return processedCount;
  }

  /**
   * Thống kê doanh thu từ payments
   * @param filters 
   * @returns 
   */
  async getPaymentStatistics(filters?: {
    startDate?: Date;
    endDate?: Date;
    method?: PaymentMethod;
  }) {
    // Kiểm tra cache trước
    const cacheKey = CacheUtil.paymentStatistics();
    const cachedStats = await redis.get(cacheKey);
    if (cachedStats) {
      return JSON.parse(cachedStats);
    }

    const where: any = {
      status: PaymentStatus.PAID,
      ...(filters?.startDate && {
        paidAt: { gte: filters.startDate },
      }),
      ...(filters?.endDate && {
        paidAt: { ...{ lte: filters.endDate } },
      }),
      ...(filters?.method && { method: filters.method }),
    };

    const [totalAmount, totalCount] = await Promise.all([
      this.uow.payments.sumAmount(where),
      this.uow.payments.count(where),
    ]);

    const stats = {
      totalAmount,
      totalCount,
      averageAmount: totalCount > 0 ? totalAmount / totalCount : 0,
    };

    // Lưu vào cache 1 giờ
    await redis.set(cacheKey, JSON.stringify(stats), 3600);

    return stats;
  }

  //#region Private methods

  private validateStatusTransition(
    currentStatus: PaymentStatus,
    newStatus: PaymentStatus
  ): void {
    const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
      [PaymentStatus.PENDING]: [PaymentStatus.PAID, PaymentStatus.FAILED],
      [PaymentStatus.PAID]: [PaymentStatus.REFUNDED],
      [PaymentStatus.FAILED]: [], // không thể chuyển từ failed
      [PaymentStatus.REFUNDED]: [], // không thể chuyển từ refunded
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new ValidationError(
        `Không thể chuyển từ ${currentStatus} sang ${newStatus}`
      );
    }
  }

  private mapToPaymentResponse(payment: any): PaymentResponse {
    return {
      id: payment.id,
      orderId: payment.orderId,
      amount: Number(payment.amount),
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      transactionId: payment.transactionId,
      gatewayResponse: payment.gatewayResponse,
      paidAt: payment.paidAt,
      expiredAt: payment.expiredAt,
      failedAt: payment.failedAt,
      failureReason: payment.failureReason,
      note: payment.note,
      cashback: {
        id: payment.cashback?.id || null,
        amount: Number(payment.cashback?.amount),
        status: payment.cashback?.status,
      },
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  /**
   * Xử lý cashback cho payment thành công (gọi qua cron job)
   * @param paymentId
   * @returns
   */
  async processCashbackForPayment(paymentId: string): Promise<any> {
    try {
      const payment = await this.uow.payments.findById(paymentId);
      if (!payment) {
        throw new NotFoundError('Thanh toán không tồn tại');
      }

      if (payment.status !== PaymentStatus.PAID) {
        throw new ValidationError('Chỉ xử lý cashback cho thanh toán đã thành công');
      }

      // Lấy cashback liên quan
      const cashback = await this.uow.cashbacks.findByPaymentId(paymentId);
      if (!cashback) {
        console.log(`⚠️  Không tìm thấy cashback cho payment: ${paymentId}`);
        return {
          success: false,
          message: 'Không tìm thấy cashback',
        };
      }

      // Gửi lên blockchain
      return await this.web3CashbackService.processCashbackToWeb3(cashback.id);
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Lỗi xử lý cashback từ payment:', errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Xử lý hàng loạt cashback từ payment pending
   * @returns
   */
  async processPendingCashbacks(): Promise<any> {
    try {
      console.log('🔄 Bắt đầu xử lý pending cashbacks từ payments...');
      await this.web3CashbackService.processPendingCashbacksToWeb3(50);
      console.log('🔄 Xử lý pending cashbacks từ payments thành công');
    } catch (error) {
      console.error('❌ Lỗi xử lý pending cashbacks:', error);
      throw error;
    }
  }

  /**
   * Retry cashback đã failed
   * @returns
   */
  async retryFailedCashbacks(): Promise<any> {
    try {
      console.log('🔄 Bắt đầu retry failed cashbacks...');
      return await this.web3CashbackService.retryFailedCashbacksToWeb3(3);
    } catch (error) {
      console.error('❌ Lỗi retry failed cashbacks:', error);
      return {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        results: [],
      };
    }
  }

  /**
   * Manual claim cashback cho user
   * @param cashbackId
   * @param userId - User requesting (for permission check)
   * @returns
   */
  async claimCashbackForUser(cashbackId: string, userId: string): Promise<any> {
    try {
      console.log(`🔄 Bắt đầu claim cashback ${cashbackId} cho user ${userId}...`);
      return await this.web3CashbackService.claimCashbackForUser(cashbackId, userId);
    } catch (error) {
      console.error('❌ Lỗi claim cashback:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Lỗi claim cashback',
      };
    }
  }

  /**
   * Xử lý cashback đã hết hạn
   * @returns
   */
  async handleExpiredCashbacks() {
    try {
      console.log('🔄 Bắt đầu xử lý expired cashbacks...');
      const count = await this.web3CashbackService.handleExpiredCashbacks();
      return {
        success: true,
        message: `Đã xử lý ${count} cashback hết hạn`,
        count,
      };
    } catch (error) {
      console.error('❌ Lỗi xử lý expired cashbacks:', error);
      return {
        success: false,
        message: 'Lỗi xử lý cashback hết hạn',
        count: 0,
      };
    }
  }

  //#endregion

  // ==================== PRIVATE CACHE METHODS ====================
  /**
   * Invalidate cache liên quan đến payment
   */
  private async invalidatePaymentCache(
    paymentId?: string,
    orderId?: string
  ): Promise<void> {
    try {
      if (paymentId) {
        await redis.del(CacheUtil.paymentById(paymentId));
      }

      if (orderId) {
        await redis.del(CacheUtil.paymentByOrderId(orderId));
      }

      // Xóa payment list caches
      for (let page = 1; page <= 50; page++) {
        await redis.del(CacheUtil.paymentsList(page, 10));
        await redis.del(CacheUtil.paymentsList(page, 20));
        await redis.del(CacheUtil.paymentsList(page, 50));
      }

      // Xóa payment statistics
      await redis.del(CacheUtil.paymentStatistics());
    } catch (error) {
      console.error('Error invalidating payment cache:', error);
    }
  }
}