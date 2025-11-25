import { Prisma, VoucherUsage } from '@prisma/client';

export interface IVoucherUsageRepository {
  /**
   * Tạo bản ghi sử dụng voucher
   * @param data - Dữ liệu tạo voucher usage
   * @returns Promise<VoucherUsage>
   */
  create(data: Prisma.VoucherUsageCreateInput): Promise<VoucherUsage>;

  /**
   * Tìm voucher usage theo ID
   * @param id - ID của voucher usage
   * @returns Promise<VoucherUsage | null>
   */
  findById(id: string): Promise<VoucherUsage | null>;

  /**
   * Lấy lịch sử sử dụng của một voucher
   * @param voucherId - ID của voucher
   * @param options - Pagination options
   * @returns Promise<VoucherUsage[]>
   */
  findByVoucherId(
    voucherId: string,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.VoucherUsageOrderByWithRelationInput;
    }
  ): Promise<VoucherUsage[]>;

  /**
   * Lấy lịch sử sử dụng voucher của user
   * @param userId - ID của user
   * @param options - Pagination options
   * @returns Promise<VoucherUsage[]>
   */
  findByUserId(
    userId: string,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.VoucherUsageOrderByWithRelationInput;
    }
  ): Promise<VoucherUsage[]>;

  /**
   * Đếm số lần user đã sử dụng một voucher cụ thể
   * @param voucherId - ID của voucher
   * @param userId - ID của user
   * @returns Promise<number>
   */
  countUserUsage(voucherId: string, userId: string): Promise<number>;

  /**
   * Tìm voucher usage theo order ID
   * @param orderId - ID của order
   * @returns Promise<VoucherUsage | null>
   */
  findByOrderId(orderId: string): Promise<VoucherUsage | null>;

  /**
   * Xóa voucher usage khi hủy đơn
   * @param orderId - ID của order
   * @returns Promise<VoucherUsage | null>
   */
  deleteByOrderId(orderId: string): Promise<VoucherUsage | null>;

  /**
   * Đếm số lượng voucher usage
   * @param where - Điều kiện filter
   * @returns Promise<number>
   */
  count(where?: Prisma.VoucherUsageWhereInput): Promise<number>;
}
