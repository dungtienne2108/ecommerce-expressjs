import { Prisma, KycDocument, DocumentType, DocumentStatus } from "@prisma/client";

export interface IKycDocumentRepository {
  /**
   * Tạo mới một tài liệu KYC
   * @param data - Dữ liệu đầu vào để tạo tài liệu KYC mới
   * @returns Promise trả về đối tượng KycDocument đã được tạo
   */
  create(data: Prisma.KycDocumentCreateInput): Promise<KycDocument>;
  
  /**
   * Tìm kiếm tài liệu KYC theo ID
   * @param id - ID của tài liệu KYC cần tìm
   * @returns Promise trả về đối tượng KycDocument hoặc null nếu không tìm thấy
   */
  findById(id: string): Promise<KycDocument | null>;
  
  /**
   * Tìm kiếm tất cả tài liệu theo KYC ID
   * @param kycId - ID của bản ghi KYC chứa các tài liệu
   * @returns Promise trả về mảng các đối tượng KycDocument
   */
  findByKycId(kycId: string): Promise<KycDocument[]>;
  
  /**
   * Tìm kiếm tài liệu theo KYC ID và loại tài liệu
   * @param kycId - ID của bản ghi KYC
   * @param type - Loại tài liệu cần tìm
   * @returns Promise trả về đối tượng KycDocument hoặc null nếu không tìm thấy
   */
  findByType(kycId: string, type: DocumentType): Promise<KycDocument | null>;
  
  /**
   * Cập nhật thông tin tài liệu KYC
   * @param id - ID của tài liệu cần cập nhật
   * @param data - Dữ liệu cần cập nhật
   * @returns Promise trả về đối tượng KycDocument đã được cập nhật
   */
  update(id: string, data: Prisma.KycDocumentUpdateInput): Promise<KycDocument>;
  
  /**
   * Xóa tài liệu KYC
   * @param id - ID của tài liệu cần xóa
   * @returns Promise không trả về giá trị khi hoàn thành
   */
  delete(id: string): Promise<void>;
  
  /**
   * Cập nhật trạng thái của tài liệu KYC
   * @param id - ID của tài liệu cần cập nhật trạng thái
   * @param status - Trạng thái mới của tài liệu
   * @param verifierNote - Ghi chú của người xác minh (tùy chọn)
   * @returns Promise trả về đối tượng KycDocument đã được cập nhật trạng thái
   */
  updateStatus(id: string, status: DocumentStatus, verifierNote?: string): Promise<KycDocument>;
  
  /**
   * Tìm kiếm các tài liệu đang chờ xác minh
   * @returns Promise trả về mảng các đối tượng KycDocument đang chờ xác minh
   */
  findPendingVerification(): Promise<KycDocument[]>;
}