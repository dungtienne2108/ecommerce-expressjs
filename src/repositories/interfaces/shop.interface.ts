import { Shop, ShopStatus, Prisma, ApprovalStatus } from '@prisma/client';
import { ShopFilters, ShopIncludes, ShopWithRelations } from '../../types/shop.types';

export interface IShopRepository {
  // Basic CRUD
  
  /**
   * Tạo mới một cửa hàng
   * @param data - Dữ liệu đầu vào để tạo cửa hàng mới
   * @returns Promise trả về đối tượng Shop đã được tạo
   */
  create(data: Prisma.ShopCreateInput): Promise<Shop>;
  
  /**
   * Tìm kiếm cửa hàng theo ID
   * @param id - ID của cửa hàng cần tìm
   * @param include - Các quan hệ cần include khi truy vấn (tùy chọn)
   * @returns Promise trả về đối tượng Shop với quan hệ hoặc null nếu không tìm thấy
   */
  findById(id: string, include?: ShopIncludes): Promise<ShopWithRelations | null>;
  
  /**
   * Tìm kiếm cửa hàng theo ID của chủ sở hữu
   * @param ownerId - ID của chủ sở hữu cửa hàng
   * @param include - Các quan hệ cần include khi truy vấn (tùy chọn)
   * @returns Promise trả về đối tượng Shop với quan hệ hoặc null nếu không tìm thấy
   */
  findByOwnerId(ownerId: string, include?: ShopIncludes): Promise<ShopWithRelations | null>;
  
  /**
   * Cập nhật thông tin cửa hàng
   * @param id - ID của cửa hàng cần cập nhật
   * @param data - Dữ liệu cần cập nhật
   * @returns Promise trả về đối tượng Shop đã được cập nhật
   */
  update(id: string, data: Prisma.ShopUpdateInput): Promise<Shop>;
  
  /**
   * Xóa mềm cửa hàng (soft delete)
   * @param id - ID của cửa hàng cần xóa
   * @param deletedBy - ID của người thực hiện xóa
   * @returns Promise không trả về giá trị khi hoàn thành
   */
  softDelete(id: string, deletedBy: string): Promise<void>;

  // Query methods
  
  /**
   * Tìm kiếm nhiều cửa hàng với các điều kiện lọc
   * @param filters - Các điều kiện lọc cho cửa hàng
   * @returns Promise trả về mảng các đối tượng Shop
   */
  findMany(filters: ShopFilters): Promise<Shop[]>;

  // Approval - Phê duyệt
  
  /**
   * Cập nhật trạng thái phê duyệt của cửa hàng
   * @param shopId - ID của cửa hàng cần cập nhật trạng thái phê duyệt
   * @param status - Trạng thái phê duyệt mới
   * @param approvedBy - ID của người phê duyệt (tùy chọn)
   * @param reason - Lý do phê duyệt hoặc từ chối (tùy chọn)
   * @returns Promise trả về đối tượng Shop đã được cập nhật
   */
  updateApprovalStatus(
    shopId: string,
    status: ApprovalStatus,
    approvedBy?: string,
    reason?: string
  ): Promise<Shop>;
  
  /**
   * Phê duyệt cửa hàng
   * @param shopId - ID của cửa hàng cần phê duyệt
   * @param approvedBy - ID của người phê duyệt
   * @returns Promise trả về đối tượng Shop đã được phê duyệt
   */
  approve(shopId: string, approvedBy: string): Promise<Shop>;
  
  /**
   * Từ chối phê duyệt cửa hàng
   * @param shopId - ID của cửa hàng bị từ chối
   * @param rejectedBy - ID của người từ chối
   * @param reason - Lý do từ chối phê duyệt
   * @returns Promise trả về đối tượng Shop đã bị từ chối
   */
  reject(shopId: string, rejectedBy: string, reason: string): Promise<Shop>;

  /**
   * Cập nhật KYC hiện tại của cửa hàng
   * @param shopId - ID của cửa hàng
   * @param kycId - ID của bản ghi KYC mới
   * @returns Promise trả về đối tượng Shop đã được cập nhật
   */
  updateCurrentKyc(shopId: string, kycId: string): Promise<Shop>;

  // Status - Quản lý trạng thái
  
  /**
   * Kích hoạt cửa hàng
   * @param shopId - ID của cửa hàng cần kích hoạt
   * @returns Promise trả về đối tượng Shop đã được kích hoạt
   */
  activate(shopId: string): Promise<Shop>;
  
  /**
   * Tạm ngưng hoạt động cửa hàng
   * @param shopId - ID của cửa hàng cần tạm ngưng
   * @returns Promise trả về đối tượng Shop đã bị tạm ngưng
   */
  suspend(shopId: string): Promise<Shop>;
  
  /**
   * Đóng cửa hàng vĩnh viễn
   * @param shopId - ID của cửa hàng cần đóng
   * @returns Promise trả về đối tượng Shop đã bị đóng
   */
  close(shopId: string): Promise<Shop>;

  // Verify - Xác minh
  
  /**
   * Xác minh cửa hàng
   * @param shopId - ID của cửa hàng cần xác minh
   * @param verifiedBy - ID của người thực hiện xác minh
   * @returns Promise trả về đối tượng Shop đã được xác minh
   */
  verify(shopId: string, verifiedBy: string): Promise<Shop>;
  
  /**
   * Hủy xác minh cửa hàng
   * @param shopId - ID của cửa hàng cần hủy xác minh
   * @returns Promise trả về đối tượng Shop đã bị hủy xác minh
   */
  unverify(shopId: string): Promise<Shop>;

  // Statistics - Thống kê
  
  /**
   * Cập nhật doanh thu của cửa hàng
   * @param shopId - ID của cửa hàng
   * @param amount - Số tiền doanh thu cần cập nhật
   * @returns Promise trả về đối tượng Shop đã được cập nhật doanh thu
   */
  updateRevenue(shopId: string, amount: number): Promise<Shop>;
  
  /**
   * Tăng số lượng đơn hàng của cửa hàng
   * @param id - ID của cửa hàng
   * @returns Promise không trả về giá trị khi hoàn thành
   */
  incrementOrderCount(id: string): Promise<void>;
  
  /**
   * Cập nhật đánh giá và số lượng review của cửa hàng
   * @param id - ID của cửa hàng
   * @param newRating - Điểm đánh giá mới
   * @param reviewCount - Số lượng đánh giá mới
   * @returns Promise không trả về giá trị khi hoàn thành
   */
  updateRating(
    id: string,
    newRating: number,
    reviewCount: number
  ): Promise<void>;
  
  /**
   * Cập nhật các thống kê tổng hợp của cửa hàng
   * @param id - ID của cửa hàng
   * @param stats - Đối tượng chứa các thống kê cần cập nhật
   * @param stats.totalRevenue - Tổng doanh thu (tùy chọn)
   * @param stats.totalOrders - Tổng số đơn hàng (tùy chọn)
   * @param stats.rating - Điểm đánh giá (tùy chọn)
   * @param stats.reviewCount - Số lượng đánh giá (tùy chọn)
   * @returns Promise trả về đối tượng Shop đã được cập nhật thống kê
   */
  updateStatistics(
    id: string,
    stats: {
      totalRevenue?: number;
      totalOrders?: number;
      rating?: number;
      reviewCount?: number;
    }
  ): Promise<Shop>;

  // Count methods - Phương thức đếm
  
  /**
   * Đếm tổng số cửa hàng theo điều kiện lọc
   * @param filters - Các điều kiện lọc (tùy chọn)
   * @returns Promise trả về số lượng cửa hàng
   */
  count(filters?: ShopFilters): Promise<number>;
  
  /**
   * Đếm số lượng cửa hàng theo trạng thái
   * @param status - Trạng thái cửa hàng cần đếm
   * @returns Promise trả về số lượng cửa hàng có trạng thái tương ứng
   */
  countByStatus(status: ShopStatus): Promise<number>;
}