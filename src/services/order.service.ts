import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  RoleType,
  VoucherType,
} from '@prisma/client';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../errors/AppError';
import { IUnitOfWork } from '../repositories/interfaces/uow.interface';
import {
  CreateOrderInput,
  OrderFilters,
  OrderResponse,
  OrderSearchFilters,
  UpdateOrderStatusInput,
} from '../types/order.types';
import { PaginatedResponse } from '../types/common';
import redis from '../config/redis';
import { CacheUtil } from '../utils/cache.util';
import { filter } from 'compression';
import { Web3CashbackService } from './web3Cashback.service';
import { VoucherService } from './voucher.service';
import { logger } from './logger';

export class OrderService {
  private web3CashbackService: Web3CashbackService;
  private voucherService: VoucherService;

  constructor(private uow: IUnitOfWork) {
    this.web3CashbackService = new Web3CashbackService(uow);
    this.voucherService = new VoucherService(uow);
  }

  async createOrderFromCart(
    userId: string,
    input: CreateOrderInput
  ): Promise<OrderResponse> {
    if (
      !input.shippingAddress ||
      !input.recipientName ||
      !input.recipientPhone
    ) {
      throw new ValidationError('Thông tin giao hàng không hợp lệ');
    }

    return this.uow.executeInTransaction(async (uow) => {
      // lấy giỏ hàng với items và product variant
      const cart = await uow.cart.findByUserIdWithItemsAndVariant(userId);

      if (!cart || cart.items.length === 0) {
        throw new ValidationError('Giỏ hàng trống');
      }

      let shopId: string | null = null;
      let subTotal = 0;
      const orderItemsData = [];
      const stockUpdates = [];

      for (const item of cart.items) {
        const variant = item.productVariant;

        if (!variant?.product?.shopId) {
          throw new NotFoundError('Cửa hàng không tồn tại');
        }

        // bắt buộc sản phẩm cùng shop
        if (!shopId) shopId = variant.product.shopId;
        if (variant.product.shopId !== shopId) {
          throw new ValidationError(
            'Tất cả sản phẩm trong giỏ hàng phải thuộc cùng một cửa hàng'
          );
        }

        // check tồn kho
        if (variant.stock < item.quantity) {
          throw new ValidationError(
            `Sản phẩm "${item.productName}" không đủ số lượng trong kho (còn ${variant.stock})`
          );
        }

        // tính tổng phụ
        subTotal += Number(item.totalPrice);

        // chuẩn bị data cho order item
        orderItemsData.push({
          productId: item.productId,
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          productName: item.productName,
          variantName: item.variantName,
          productImageUrl: item.productImageUrl,
          sku: variant.sku || '',
        });

        // chuẩn bị data cập nhật tồn kho
        stockUpdates.push({
          id: item.productVariantId,
          quantity: variant.stock - item.quantity,
        });
      }

      // tính tổng đơn hàng
      const orderNumber = await this.generateOrderNumber();

      // áp dụng voucher
      let discount = 0;
      let shippingFee = input.shippingFee || 0;
      let voucherId: string | null = null;
      if (input.voucherCode) {
        console.log('Áp dụng voucher:', input.voucherCode);
        const voucherResult = await this.voucherService.validateAndApplyVoucher(
          input.voucherCode,
          userId,
          shopId!,
          cart.items,
          subTotal
        );

        if (!voucherResult.isValid) {
          console.log('Voucher không hợp lệ:', voucherResult.error);
          throw new ValidationError(voucherResult.error || 'Voucher không hợp lệ');
        }

        if (voucherResult.type === VoucherType.FREE_SHIPPING) {
          shippingFee = 0;
        }
        else {
          discount = voucherResult.discountAmount;
        }

        voucherId = voucherResult.voucherId || null;
      }

      const totalAmount = subTotal + shippingFee - discount;
      delete input.voucherCode;

      // tạo đơn hàng
      const order = await uow.orders.create({
        orderNumber,
        user: { connect: { id: userId } },
        shop: { connect: { id: shopId! } },
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        subtotal: subTotal,
        shippingFee: shippingFee,
        discount: discount,
        totalAmount,
        ...input,
        createdBy: userId,
      });

      // chạy song song các thao tác tạo order items, cập nhật tồn kho, tạo payment, xóa cart items
      const promises = [
        uow.orderItems.createMany(
          orderItemsData.map((item) => ({ ...item, orderId: order.id }))
        ),
        uow.productVariants.batchUpdateStock(stockUpdates), // Single query
        this.createPaymentForOrder(uow, order, input.paymentMethod),
        uow.cartItem.deleteByCartId(cart.id),
        redis.del(CacheUtil.cartByUserId(userId)), // xóa cache giỏ hàng
        redis.del(CacheUtil.cartByUserId(userId)),
      ];

      if (voucherId) {
        promises.push(
          uow.vouchers.incrementUsedCount(voucherId),
          uow.orders.update(order.id, { voucher: { connect: { id: voucherId } } }),
          uow.voucherUsages.create({
            voucher: { connect: { id: voucherId } },
            user: { connect: { id: userId } },
            order: { connect: { id: order.id } },
            discountAmount: discount,
          })
        )
      }

      await Promise.all(promises);

      // cache
      this.invalidateOrderCache(userId, shopId!).catch(console.error);

      return {
        ...order,
        voucherId,
        currency: 'VND',
        subtotal: Number(order.subtotal),
        shippingFee: Number(order.shippingFee),
        discount: Number(order.discount),
        totalAmount: Number(order.totalAmount),
        customerNote: order.customerNote,
        shopNote: order.shopNote,
        items: orderItemsData.map((item) => ({
          id: '', // Chưa có ID vì mới tạo
          productId: item.productId,
          variantId: item.productVariantId,
          productName: item.productName,
          variantName: item.variantName || '',
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
          productImageUrl: item.productImageUrl || '',
          sku: item.sku || '',
        })),
      };
    });
  }

  async getOrders(
    filters: OrderFilters
  ): Promise<PaginatedResponse<OrderResponse>> {
    const cacheKey = CacheUtil.ordersByFilters(filters);
    const cachedResult = await redis.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    const orderFindManyArgs: Prisma.OrderFindManyArgs = {
      where: {
        ...(filters.shopId ? { shopId: filters.shopId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (page - 1) * limit,
      take: limit,
    };

    const [orders, total] = await Promise.all([
      this.uow.orders.findMany(orderFindManyArgs),
      this.uow.orders.count(orderFindManyArgs.where),
    ]);

    const result = {
      data: orders.map((o) => this.mapToOrderResponse(o)),
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };

    // Lưu vào cache 15 phút
    await redis.set(cacheKey, JSON.stringify(result), 900);

    return result;
  }

  /**
   * Lấy thông tin đơn hàng theo ID
   * @param orderId
   * @param userId
   * @returns
   */
  async getOrderById(orderId: string, userId?: string): Promise<OrderResponse> {
    // Kiểm tra cache trước
    const cacheKey = CacheUtil.orderById(orderId);
    const cachedOrder = await redis.get(cacheKey);
    if (cachedOrder) {
      return JSON.parse(cachedOrder);
    }

    const order = await this.uow.orders.findByIdWithItems(orderId);
    if (!order) throw new NotFoundError('Đơn hàng không tồn tại');
    if (userId && order.userId !== userId) {
      // nếu không phải chủ đơn hàng, kiểm tra có phải chủ shop hoặc admin không
      const roles = await this.uow.userRoles.findByUserIdWithRoles(userId);
      const isAdmin = roles.some((r) => r.role.type === RoleType.SYSTEM_ADMIN);

      // Nếu là admin → cho xem luôn → return
      if (isAdmin) {
        return this.mapToOrderResponse(order);
      }

      // Nếu không phải admin → check tiếp shop owner
      const shop = await this.uow.shops.findById(order.shopId);
      if (!shop || shop.ownerId !== userId) {
        throw new ForbiddenError('Bạn không có quyền xem đơn hàng này');
      }
    }

    const orderResponse = this.mapToOrderResponse(order);

    // Lưu vào cache 30 phút
    await redis.set(cacheKey, JSON.stringify(orderResponse), 1800);

    return orderResponse;
  }

  /**
   * Lấy danh sách đơn hàng của người dùng
   * @param userId
   * @param options
   * @returns
   */
  async getUserOrders(
    userId: string,
    options?: OrderSearchFilters
  ): Promise<PaginatedResponse<OrderResponse>> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;

    // Tạo cache key
    const cacheKey = CacheUtil.userOrdersByFilters(userId, options as Record<string, any>);

    // Kiểm tra cache
    const cachedResult = await redis.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    logger.info(`Lấy danh sách đơn hàng của người dùng ${userId} với filters: ${JSON.stringify(options)}`);
    console.log('options', options);
    const orders = await this.uow.orders.findByUserId(userId, {
      skip: (page - 1) * limit,
      take: limit,
      ...(options?.status !== undefined && { status: options.status }),
      ...(options?.paymentStatus !== undefined && { paymentStatus: options.paymentStatus as PaymentStatus }),
      ...(options?.minTotalAmount !== undefined && { subtotal: { gte: options.minTotalAmount } }),
      ...(options?.maxTotalAmount !== undefined && { subtotal: { lte: options.maxTotalAmount } }),
    });
    console.log('orders', orders);

    const total = await this.uow.orders.count({
      userId,
      ...(options?.status !== undefined && { status: options.status }),
      ...(options?.paymentStatus !== undefined && { paymentStatus: options.paymentStatus as PaymentStatus }),
      ...(options?.minTotalAmount !== undefined && { subtotal: { gte: options.minTotalAmount } }),
      ...(options?.maxTotalAmount !== undefined && { subtotal: { lte: options.maxTotalAmount } }),
    });
    console.log('total', total);
    const result = {
      data: orders.map((o) => this.mapToOrderResponse(o)),
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
    console.log('result', result);
    // Lưu vào cache 15 phút
    await redis.set(cacheKey, JSON.stringify(result), 900);

    return result;
  }

  /**
   * Lấy danh sách đơn hàng của cửa hàng
   * @param shopId
   * @param ownerId
   * @param options
   * @returns
   */
  async getShopOrders(
    shopId: string,
    ownerId: string,
    options?: OrderSearchFilters
  ): Promise<PaginatedResponse<OrderResponse>> {
    const shop = await this.uow.shops.findById(shopId);
    if (!shop) throw new NotFoundError('Cửa hàng không tồn tại');
    if (shop.ownerId !== ownerId)
      throw new ForbiddenError(
        'Bạn không có quyền xem đơn hàng của cửa hàng này'
      );

    const page = options?.page || 1;
    const limit = options?.limit || 10;

    // Tạo cache key
    const cacheKey = CacheUtil.shopOrders(shopId, page, limit);

    // Kiểm tra cache
    const cachedResult = await redis.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    const orders = await this.uow.orders.findByShopId(shopId, {
      skip: (page - 1) * limit,
      take: limit,
      ...(options?.status !== undefined ? { status: options.status } : {}),
    });

    const total = await this.uow.orders.count({
      shopId,
      ...(options?.status && { status: options.status }),
    });

    const result = {
      data: orders.map((o) => this.mapToOrderResponse(o)),
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };

    // Lưu vào cache 15 phút
    await redis.set(cacheKey, JSON.stringify(result), 900);

    return result;
  }

  /**
   * Cập nhật trạng thái đơn hàng
   * @param orderId
   * @param input
   * @param updatedBy
   * @returns
   */
  async updateOrderStatus(
    orderId: string,
    input: UpdateOrderStatusInput,
    updatedBy: string
  ): Promise<OrderResponse> {
    return this.uow.executeInTransaction(async (uow) => {
      const order = await uow.orders.findById(orderId);
      if (!order) throw new NotFoundError('Đơn hàng không tồn tại');

      const roles = await uow.userRoles.findByUserIdWithRoles(updatedBy);
      const isAdmin = roles.some((r) => r.role.type === 'SYSTEM_ADMIN');

      if (order.userId !== updatedBy && !isAdmin) {
        const shop = await uow.shops.findById(order.shopId);
        if (!shop || shop.ownerId !== updatedBy) {
          throw new ForbiddenError('Bạn không có quyền cập nhật đơn hàng này');
        }
      }

      // kiểm tra tính hợp lệ của việc chuyển trạng thái
      this.validateStatusTransition(order.status, input.status);

      const updatedOrder = await uow.orders.updateStatus(
        orderId,
        input.status,
        input.note,
        updatedBy
      );

      // nếu hủy đơn hàng, hoàn trả tiền và trả lại tồn kho
      if (input.status === OrderStatus.CANCELLED) {
        const orderItems = await uow.orderItems.findByOrderId(orderId);

        // 🔥 OPTIMIZED: Batch fetch all variants instead of N+1 queries
        if (orderItems.length > 0) {
          const variantIds = orderItems.map((item) => item.productVariantId);
          const variantsMap = new Map(
            (await uow.productVariants.findByIds(variantIds)).map((v) => [
              v.id,
              v,
            ])
          );

          // Batch update stocks
          const stockUpdates: Array<{ id: string; quantity: number }> = [];
          for (const item of orderItems) {
            const variant = variantsMap.get(item.productVariantId);
            if (variant) {
              stockUpdates.push({
                id: item.productVariantId,
                quantity: variant.stock + item.quantity,
              });
            }
          }

          // Update all stocks in parallel
          await Promise.all(
            stockUpdates.map((update) =>
              uow.productVariants.update(update.id, { stock: update.quantity })
            )
          );
        }
      }

      const result = await uow.orders.findByIdWithItems(orderId);
      if (!result) throw new NotFoundError('Đơn hàng không tồn tại');

      // Invalidate cache
      // await this.invalidateOrderCache(result.userId, result.shopId, orderId);

      return this.mapToOrderResponse(result);
    });
  }

  /**
   * Hủy đơn hàng
   * @param orderId
   * @param userId
   * @param reason
   * @returns
   */
  async cancelOrder(
    orderId: string,
    userId: string,
    reason?: string
  ): Promise<OrderResponse> {
    const order = await this.uow.orders.findById(orderId);
    if (!order) throw new NotFoundError('Đơn hàng không tồn tại');
    if (order.userId !== userId)
      throw new ForbiddenError('Bạn không có quyền hủy đơn hàng này');
    if (order.status === OrderStatus.CANCELLED)
      throw new ValidationError('Đơn hàng đã bị hủy');
    if (order.status === OrderStatus.COMPLETED)
      throw new ValidationError('Đơn hàng đã hoàn thành, không thể hủy');

    return this.updateOrderStatus(
      orderId,
      { status: OrderStatus.CANCELLED, note: reason ?? '' },
      userId
    );
  }

  /**
   * Xác nhận đơn hàng
   * @param orderId
   * @param ownerId
   * @returns
   */
  async confirmOrder(orderId: string, ownerId: string): Promise<OrderResponse> {
    return this.updateOrderStatus(
      orderId,
      { status: OrderStatus.CONFIRMED },
      ownerId
    );
  }

  async getOrderStatusHistory(orderId: string) {
    const order = await this.uow.orders.findById(orderId);
    if (!order) throw new NotFoundError('Đơn hàng không tồn tại');

    return this.uow.orderStatusHistory.findByOrderId(orderId);
  }

  //#region private
  private async generateOrderNumber(): Promise<string> {
    const orderCount = await this.uow.orders.count();

    return `ORD${orderCount + 1}`;
  }

  /**
   *  Kiểm tra tính hợp lệ của việc chuyển trạng thái đơn hàng
   * @param currentStatus
   * @param newStatus
   */
  private validateStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus
  ): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED], // đang chờ -> có thể hủy/confirm
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED], // đã xác nhận -> có thể hủy/processing
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPING, OrderStatus.CANCELLED], // đang xử lý -> có thể hủy/shipping
      [OrderStatus.SHIPPING]: [OrderStatus.DELIVERED], // đang giao hàng -> có thể delivered
      [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.REFUNDED], // đã giao -> có thể hoàn thành/refund
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new ValidationError(
        `Không thể chuyển từ ${currentStatus} sang ${newStatus}`
      );
    }
  }

  private mapToOrderResponse(order: any): OrderResponse {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      shopId: order.shopId,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      shippingMethod: order.shippingMethod,
      shippingAddress: order.shippingAddress,
      recipientName: order.recipientName,
      recipientPhone: order.recipientPhone,
      subtotal: Number(order.subtotal),
      shippingFee: Number(order.shippingFee),
      discount: Number(order.discount),
      totalAmount: Number(order.totalAmount),
      currency: order.currency,
      customerNote: order.customerNote,
      shopNote: order.shopNote,
      cancelReason: order.cancelReason,
      items:
        order.items?.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          variantId: item.productVariantId,
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
          productImageUrl: item.productImageUrl,
        })) || [],
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      confirmedAt: order.confirmedAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
    };
  }

  private async createPaymentForOrder(
    uow: IUnitOfWork,
    order: any,
    paymentMethod: PaymentMethod
  ) {
    let expirationMinutes = 15;

    switch (paymentMethod) {
      case PaymentMethod.COD:
        expirationMinutes = 0;
        break;
      case PaymentMethod.BANK_TRANSFER:
        expirationMinutes = 60; // 1 giờ
        break;
      case PaymentMethod.E_WALLET:
      case PaymentMethod.CREDIT_CARD:
        expirationMinutes = 15; // 15 phút
        break;
    }

    const expiredAt =
      expirationMinutes > 0
        ? new Date(Date.now() + expirationMinutes * 60000)
        : null;

    const payment = await uow.payments.create({
      order: { connect: { id: order.id } },
      amount: order.totalAmount,
      method: paymentMethod,
      status: PaymentStatus.PENDING,
      expiredAt,
      note: `Thanh toán đơn hàng ${order.orderNumber} qua ${paymentMethod}`,
    });

    // xử lý nếu cod
    if (paymentMethod === PaymentMethod.COD) {
    }

    return payment;
  }

  private async handlePaymentOnStatusChange(
    uow: IUnitOfWork,
    order: any,
    newStatus: OrderStatus
  ) {
    const payment = await uow.payments.findByOrderId(order.id);
    if (!payment) return;

    switch (newStatus) {
      case OrderStatus.DELIVERED:
        if (
          payment.method === PaymentMethod.COD &&
          payment.status === PaymentStatus.PENDING
        ) {
          await uow.payments.updateStatus(payment.id, PaymentStatus.PAID, {
            paidAt: new Date(),
            transactionId: `COD-${Date.now()}`,
          });

          // cashback
          await this.createCashbackForPayment(uow, payment, order.userId);
        }
        break;

      case OrderStatus.CANCELLED:
        if (payment.status === PaymentStatus.PENDING) {
          await uow.payments.updateStatus(payment.id, PaymentStatus.FAILED, {
            failedAt: new Date(),
            failureReason: 'Đơn hàng bị hủy',
          });
        }
        break;

      case OrderStatus.COMPLETED:
        if (payment.status !== PaymentStatus.PAID) {
          throw new ValidationError(
            'Không thể hoàn thành đơn hàng khi thanh toán chưa hoàn tất'
          );
        }
        break;
    }
  }

  private async createCashbackForPayment(
    uow: IUnitOfWork,
    payment: any,
    userId: string
  ) {
    try {
      const user = await uow.users.findById(userId);
      if (!user || !user.walletAddress) {
        console.log('❌ User không có ví, không tạo cashback');
        return;
      }

      const existingCashback = await uow.cashbacks.findByPaymentId(payment.id);
      if (existingCashback) {
        console.log('⚠️  Cashback đã tồn tại cho payment này');
        return;
      }

      const cashbackPercentage = 5; // 5%
      const cashbackAmount =
        (Number(payment.amount) * cashbackPercentage) / 100;

      // Tạo cashback với trạng thái PENDING
      const eligibleAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 ngày sau
      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 ngày sau

      const cashback = await uow.cashbacks.create({
        payment: { connect: { id: payment.id } },
        user: { connect: { id: userId } },
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
          orderNumber: payment.order?.orderNumber,
          createdBy: 'system',
        },
      });

      console.log(
        `✅ Tạo cashback thành công: ${cashback.id} | Amount: ${cashbackAmount}`
      );

      // Log thông tin để xử lý bằng cron job sau
      console.log(
        `📅 Cashback sẽ được xử lý vào blockchain sau 7 ngày (${eligibleAt.toISOString()})`
      );
    } catch (error) {
      console.error('❌ Lỗi tạo cashback:', error);
      // Không throw error để không ảnh hưởng đến quá trình tạo order
    }
  }

  //#endregion

  // ==================== PRIVATE CACHE METHODS ====================
  /**
   * Invalidate cache liên quan đến order
   */
  private async invalidateOrderCache(
    userId?: string,
    shopId?: string,
    orderId?: string
  ): Promise<void> {
    try {
      if (orderId) {
        await redis.del(CacheUtil.orderById(orderId));
      }

      // Xóa user orders cache
      if (userId) {
        for (let page = 1; page <= 50; page++) {
          await redis.del(CacheUtil.userOrders(userId, page, 10));
          await redis.del(CacheUtil.userOrders(userId, page, 20));
          await redis.del(CacheUtil.userOrders(userId, page, 50));
        }
      }

      // Xóa shop orders cache
      if (shopId) {
        for (let page = 1; page <= 50; page++) {
          await redis.del(CacheUtil.shopOrders(shopId, page, 10));
          await redis.del(CacheUtil.shopOrders(shopId, page, 20));
          await redis.del(CacheUtil.shopOrders(shopId, page, 50));
        }
      }

      const keys = await redis.keys('orders:list:*');
      for (const key of keys) {
        await redis.del(key);
      }
    } catch (error) {
      console.error('Error invalidating order cache:', error);
    }
  }
}
