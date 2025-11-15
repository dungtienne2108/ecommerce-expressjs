import { Message, Prisma } from '@prisma/client';

/**
 * Interface repository cho việc quản lý Message (Tin nhắn)
 * Cung cấp các phương thức CRUD và truy vấn nâng cao cho chat messages
 */
export interface IMessageRepository {
  // Basic CRUD Operations

  /**
   * Tìm message theo ID
   * @param id - ID của message
   * @param include - Các quan hệ cần include
   */
  findById(id: string, include?: Prisma.MessageInclude): Promise<Message | null>;

  /**
   * Tìm message theo điều kiện unique
   * @param where - Điều kiện tìm kiếm unique
   * @param include - Các quan hệ cần include
   */
  findUnique(where: Prisma.MessageWhereUniqueInput, include?: Prisma.MessageInclude): Promise<Message | null>;

  /**
   * Tìm message đầu tiên theo điều kiện
   * @param where - Điều kiện tìm kiếm
   * @param include - Các quan hệ cần include
   */
  findFirst(where: Prisma.MessageWhereInput, include?: Prisma.MessageInclude): Promise<Message | null>;

  /**
   * Tìm nhiều messages với điều kiện
   * @param args - Các tham số tìm kiếm
   */
  findMany(args: Prisma.MessageFindManyArgs): Promise<Message[]>;

  /**
   * Tạo mới message
   * @param data - Dữ liệu message mới
   */
  create(data: Prisma.MessageCreateInput): Promise<Message>;

  /**
   * Cập nhật message
   * @param where - Điều kiện xác định message
   * @param data - Dữ liệu cần cập nhật
   */
  update(where: Prisma.MessageWhereUniqueInput, data: Prisma.MessageUpdateInput): Promise<Message>;

  /**
   * Cập nhật nhiều messages
   * @param where - Điều kiện lọc
   * @param data - Dữ liệu cập nhật
   */
  updateMany(where: Prisma.MessageWhereInput, data: Prisma.MessageUpdateManyMutationInput): Promise<Prisma.BatchPayload>;

  /**
   * Xóa message (soft delete)
   * @param where - Điều kiện xác định message
   */
  delete(where: Prisma.MessageWhereUniqueInput): Promise<Message>;

  /**
   * Xóa nhiều messages
   * @param where - Điều kiện lọc
   */
  deleteMany(where: Prisma.MessageWhereInput): Promise<Prisma.BatchPayload>;

  /**
   * Đếm số lượng messages
   * @param where - Điều kiện lọc
   */
  count(where?: Prisma.MessageWhereInput): Promise<number>;

  // Specialized Methods

  /**
   * Tìm messages trong conversation
   * @param conversationId - ID của conversation
   * @param limit - Số lượng giới hạn
   * @param offset - Vị trí bắt đầu
   * @param before - Lấy messages trước messageId này
   */
  findByConversationId(
    conversationId: string,
    limit?: number,
    offset?: number,
    before?: string
  ): Promise<Message[]>;

  /**
   * Tìm messages của user
   * @param userId - ID của user
   * @param limit - Số lượng giới hạn
   * @param offset - Vị trí bắt đầu
   */
  findByUserId(userId: string, limit?: number, offset?: number): Promise<Message[]>;

  /**
   * Đánh dấu message là đã đọc
   * @param messageId - ID của message
   */
  markAsRead(messageId: string): Promise<Message>;

  /**
   * Đánh dấu nhiều messages là đã đọc
   * @param messageIds - Array các message IDs
   */
  markManyAsRead(messageIds: string[]): Promise<Prisma.BatchPayload>;

  /**
   * Đánh dấu tất cả messages trong conversation là đã đọc
   * @param conversationId - ID của conversation
   * @param userId - ID của user (không đánh dấu tin nhắn của chính mình)
   */
  markAllAsReadInConversation(conversationId: string, userId: string): Promise<Prisma.BatchPayload>;

  /**
   * Đánh dấu message là delivered
   * @param messageId - ID của message
   */
  markAsDelivered(messageId: string): Promise<Message>;

  /**
   * Soft delete message
   * @param messageId - ID của message
   */
  softDelete(messageId: string): Promise<Message>;

  /**
   * Đếm unread messages trong conversation
   * @param conversationId - ID của conversation
   * @param userId - ID của user
   */
  countUnreadInConversation(conversationId: string, userId: string): Promise<number>;

  /**
   * Lấy message cuối cùng trong conversation
   * @param conversationId - ID của conversation
   */
  getLastMessage(conversationId: string): Promise<Message | null>;
}