import { Prisma, Voucher, VoucherStatus } from '@prisma/client';

export interface IVoucherRepository {
  /**
   * Tạo voucher mới
   * @param data - Dữ liệu tạo voucher
   * @returns Promise<Voucher>
   */
  create(data: Prisma.VoucherCreateInput): Promise<Voucher>;

  /**
   * Tìm voucher theo ID
   * @param id - ID của voucher
   * @returns Promise<Voucher | null>
   */

  findById(id: string): Promise<Voucher | null>;

  /**

   * Tìm voucher theo code

   * @param code - Mã voucher

   * @returns Promise<Voucher | null>

   */

  findByCode(code: string): Promise<Voucher | null>;

  /**

   * Tìm voucher active theo code (để validate khi apply)

   * @param code - Mã voucher

   * @returns Promise<Voucher | null>

   */

  findActiveByCode(code: string): Promise<Voucher | null>;

  /**

   * Lấy danh sách vouchers của shop

   * @param shopId - ID của shop

   * @param options - Filter options

   * @returns Promise<Voucher[]>

   */

  findByShopId(
    shopId: string,

    options?: {
      skip?: number;

      take?: number;

      status?: VoucherStatus;

      orderBy?: Prisma.VoucherOrderByWithRelationInput;
    }
  ): Promise<Voucher[]>;

  /**

   * Lấy danh sách vouchers công khai

   * @param options - Filter options

   * @returns Promise<Voucher[]>

   */

  findPublicVouchers(options?: {
    skip?: number;

    take?: number;

    shopId?: string;

    orderBy?: Prisma.VoucherOrderByWithRelationInput;
  }): Promise<Voucher[]>;

  /**

   * Cập nhật voucher

   * @param id - ID của voucher

   * @param data - Dữ liệu cập nhật

   * @returns Promise<Voucher>

   */

  update(id: string, data: Prisma.VoucherUpdateInput): Promise<Voucher>;

  /**

   * Tăng số lượt đã sử dụng

   * @param id - ID của voucher

   * @returns Promise<Voucher>

   */

  incrementUsedCount(id: string): Promise<Voucher>;

  /**

   * Giảm số lượt đã sử dụng (khi hủy đơn)

   * @param id - ID của voucher

   * @returns Promise<Voucher>

   */

  decrementUsedCount(id: string): Promise<Voucher>;

  /**

   * Soft delete voucher

   * @param id - ID của voucher

   * @param deletedBy - ID người xóa

   * @returns Promise<Voucher>

   */

  softDelete(id: string, deletedBy: string): Promise<Voucher>;

  /**

   * Đếm số lượng vouchers

   * @param where - Điều kiện filter

   * @returns Promise<number>

   */

  count(where?: Prisma.VoucherWhereInput): Promise<number>;
}
