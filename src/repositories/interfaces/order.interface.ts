import { Prisma, Order, OrderItem, OrderStatusHistory, OrderStatus, PaymentStatus } from "@prisma/client";
import { OrderIncludes } from "../../types/order.types";

export interface IOrderRepository{
    /**
     * Tạo đơn hàng mới
     * @param data - Dữ liệu tạo đơn hàng
     * @returns Promise<Order>
     */
    create(data: Prisma.OrderCreateInput): Promise<Order>;

    findMany(filters: Prisma.OrderFindManyArgs): Promise<Order[]>;

    /**
   * Tìm đơn hàng theo ID
   * @param id - ID của đơn hàng
   * @param include - Include relations
   * @returns Promise<Order | null>
   */
  findById(id: string, include?: OrderIncludes): Promise<Order | null>;
  
  /**
   * Tìm đơn hàng theo order number
   * @param orderNumber - Mã đơn hàng
   * @param include - Include relations
   * @returns Promise<Order | null>
   */
  findByOrderNumber(orderNumber: string, include?: OrderIncludes): Promise<Order | null>;
  
  /**
   * Tìm đơn hàng theo ID kèm items
   * @param id - ID của đơn hàng
   * @returns Promise<Order & { items: OrderItem[] } | null>
   */
  findByIdWithItems(id: string): Promise<Order & { items: OrderItem[] } | null>;
  /**
   * Lấy danh sách đơn hàng của user
   * @param userId - ID của user
   * @param options - Pagination và filter options
   * @returns Promise<Order[]>
   */
  findByUserId(
    userId: string, 
    options?: {
      skip?: number;
      take?: number;
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
      minTotalAmount?: number;
      maxTotalAmount?: number;
      shopId?: string;
      orderBy?: Prisma.OrderOrderByWithRelationInput;
    }
  ): Promise<Order[]>;
  
  /**
   * Lấy danh sách đơn hàng của shop
   * @param shopId - ID của shop
   * @param options - Pagination và filter options
   * @returns Promise<Order[]>
   */
  findByShopId(
    shopId: string,
    options?: {
      skip?: number;
      take?: number;
      status?: OrderStatus;
      orderBy?: Prisma.OrderOrderByWithRelationInput;
    }
  ): Promise<Order[]>;
  /**
   * Cập nhật thông tin đơn hàng
   * @param id - ID của đơn hàng
   * @param data - Dữ liệu cập nhật
   * @returns Promise<Order>
   */
  update(id: string, data: Prisma.OrderUpdateInput): Promise<Order>;
  
  /**
   * Cập nhật trạng thái đơn hàng
   * @param id - ID của đơn hàng
   * @param status - Trạng thái mới
   * @param note - Ghi chú (optional)
   * @param changedBy - ID người thay đổi (optional)
   * @returns Promise<Order>
   */
  updateStatus(
    id: string, 
    status: OrderStatus, 
    note?: string,
    changedBy?: string
  ): Promise<Order>;
  
  /**
   * Đếm số lượng đơn hàng
   * @param where - Điều kiện filter
   * @returns Promise<number>
   */
  count(where?: Prisma.OrderWhereInput): Promise<number>;
  /**
   * Tính tổng doanh thu
   * @param where - Điều kiện filter
   * @returns Promise<number>
   */
  sumRevenue(where?: Prisma.OrderWhereInput): Promise<number>;
}

export interface IOrderItemRepository {
  /**
   * Tạo order item mới
   * @param data - Dữ liệu tạo order item
   * @returns Promise<OrderItem>
   */
  create(data: Prisma.OrderItemCreateInput): Promise<OrderItem>;
  
  /**
   * Tạo nhiều order items cùng lúc
   * @param data - Mảng dữ liệu tạo order items
   * @returns Promise<Prisma.BatchPayload>
   */
  createMany(data: Prisma.OrderItemCreateManyInput[]): Promise<Prisma.BatchPayload>;
  
  /**
   * Tìm order item theo ID
   * @param id - ID của order item
   * @returns Promise<OrderItem | null>
   */
  findById(id: string): Promise<OrderItem | null>;
  
  /**
   * Lấy tất cả items trong đơn hàng
   * @param orderId - ID của đơn hàng
   * @returns Promise<OrderItem[]>
   */
  findByOrderId(orderId: string): Promise<OrderItem[]>;
  
  /**
   * Tính tổng tiền của items trong đơn hàng
   * @param orderId - ID của đơn hàng
   * @returns Promise<number>
   */
  sumTotalByOrderId(orderId: string): Promise<number>;
  
  /**
   * Tính tổng số lượng sản phẩm trong đơn hàng
   * @param orderId - ID của đơn hàng
   * @returns Promise<number>
   */
  sumQuantityByOrderId(orderId: string): Promise<number>;
}

export interface IOrderStatusHistoryRepository {
  /**
   * Tạo bản ghi lịch sử trạng thái
   * @param data - Dữ liệu tạo status history
   * @returns Promise<OrderStatusHistory>
   */
  create(data: Prisma.OrderStatusHistoryCreateInput): Promise<OrderStatusHistory>;
  
  /**
   * Lấy lịch sử thay đổi trạng thái của đơn hàng
   * @param orderId - ID của đơn hàng
   * @returns Promise<OrderStatusHistory[]>
   */
  findByOrderId(orderId: string): Promise<OrderStatusHistory[]>;
}

export interface IOrderStatusHistoryRepository{
  create(data: Prisma.OrderStatusHistoryCreateInput): Promise<OrderStatusHistory>;
  findByOrderId(orderId: string): Promise<OrderStatusHistory[]>;
}