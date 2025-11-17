import { DocumentStatus, KycData, KycDocument, KycHistory, KycStatus, Prisma } from '@prisma/client';
import { KycDataFilters, KycDataIncludes,  KycDataWithRelations} from '../../types/kyc.types';
import { PaginationParams } from '../../types/common';

export interface IKycDataRepository {  
  /**
   * Tạo mới một bản ghi KYC
   * @param data - Dữ liệu đầu vào để tạo bản ghi KYC mới
   * @returns Promise trả về đối tượng KycData đã được tạo
   */
  create(data: Prisma.KycDataCreateInput): Promise<KycData>;
  
  /**
   * Tìm kiếm bản ghi KYC theo ID
   * @param id - ID của bản ghi KYC cần tìm
   * @param include - Các quan hệ cần include khi truy vấn (tùy chọn)
   * @returns Promise trả về đối tượng KycData với quan hệ hoặc null nếu không tìm thấy
   */
  findById(id: string, include?: KycDataIncludes): Promise<KycData | null>;
  
  /**
   * Tìm kiếm bản ghi KYC theo ID của shop
   * @param shopId - ID của shop cần tìm KYC
   * @returns Promise trả về đối tượng KycData hoặc null nếu không tìm thấy
   */
  findByShopId(shopId: string): Promise<KycData | null>;
  
  /**
   * Cập nhật thông tin KYC theo ID
   * @param id - ID của bản ghi KYC cần cập nhật
   * @param data - Dữ liệu cần cập nhật
   * @returns Promise trả về đối tượng KycData đã được cập nhật
   */
  update(id: string, data: Prisma.KycDataUpdateInput): Promise<KycData>;
  
  // Query methods
  
  /**
   * Tìm kiếm nhiều bản ghi KYC theo các điều kiện lọc
   * @param filters - Các điều kiện lọc để tìm kiếm
   * @returns Promise trả về mảng các đối tượng KycData
   */
  findMany(filters: KycDataFilters): Promise<KycData[]>;
  
  /**
   * Tìm kiếm các bản ghi KYC đang chờ xem xét
   * @param pagination - Tham số phân trang (tùy chọn)
   * @returns Promise trả về mảng các đối tượng KycData đang chờ xem xét
   */
  findPendingReview(pagination?: PaginationParams): Promise<KycData[]>;
  
  /**
   * Tìm kiếm các bản ghi KYC theo trạng thái
   * @param status - Trạng thái KYC cần tìm kiếm
   * @returns Promise trả về mảng các đối tượng KycData có trạng thái tương ứng
   */
  findByStatus(status: KycStatus): Promise<KycData[]>;
  
  /**
   * Tìm kiếm các bản ghi KYC đã hết hạn
   * @returns Promise trả về mảng các đối tượng KycData đã hết hạn
   */
  findExpiredKyc(): Promise<KycData[]>;
  
  // Status management
  
  /**
   * Cập nhật trạng thái của bản ghi KYC
   * @param id - ID của bản ghi KYC cần cập nhật trạng thái
   * @param status - Trạng thái mới cần cập nhật
   * @param reviewerUserId - ID của người xem xét (tùy chọn)
   * @param reviewerNote - Ghi chú của người xem xét (tùy chọn)
   * @returns Promise trả về đối tượng KycData đã được cập nhật trạng thái
   */
  updateStatus(
    id: string, 
    status: KycStatus, 
    reviewerUserId?: string, 
    reviewerNote?: string
  ): Promise<KycData>;
  
  // Document management
  
  /**
   * Thêm tài liệu vào bản ghi KYC
   * @param kycId - ID của bản ghi KYC cần thêm tài liệu
   * @param documentData - Dữ liệu của tài liệu cần thêm
   * @returns Promise trả về đối tượng KycDocument đã được tạo
   */
  addDocument(kycId: string, documentData: Prisma.KycDocumentCreateInput): Promise<KycDocument>;
  
  /**
   * Cập nhật trạng thái của tài liệu KYC
   * @param documentId - ID của tài liệu cần cập nhật
   * @param status - Trạng thái mới của tài liệu
   * @param verifierNote - Ghi chú của người xác minh (tùy chọn)
   * @returns Promise trả về đối tượng KycDocument đã được cập nhật
   */
  updateDocument(documentId: string, status: DocumentStatus, verifierNote?: string): Promise<KycDocument>;
  
  // History tracking
  
  /**
   * Thêm một bản ghi lịch sử vào KYC
   * @param kycId - ID của bản ghi KYC
   * @param action - Hành động được thực hiện
   * @param metadata - Dữ liệu bổ sung về hành động (tùy chọn)
   * @returns Promise trả về đối tượng KycHistory đã được tạo
   */
  addHistoryEntry(kycId: string, action: string, metadata?: any): Promise<KycHistory>;
  
  // Count methods
  
  /**
   * Đếm tổng số bản ghi KYC theo điều kiện lọc
   * @param filters - Các điều kiện lọc (tùy chọn)
   * @returns Promise trả về số lượng bản ghi
   */
  count(filters?: KycDataFilters): Promise<number>;
  
  /**
   * Đếm số lượng bản ghi KYC theo trạng thái
   * @param status - Trạng thái KYC cần đếm
   * @returns Promise trả về số lượng bản ghi có trạng thái tương ứng
   */
  countByStatus(status: KycStatus): Promise<number>;
}