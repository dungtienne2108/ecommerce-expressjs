import { Conversation, Prisma } from '@prisma/client';

/**
 * Interface repository cho việc quản lý Conversation (Cuộc hội thoại)
 * Cung cấp các phương thức CRUD và truy vấn nâng cao cho chat conversation
 */
export interface IConversationRepository {
  // Basic CRUD Operations

  /**
   * Tìm conversation theo ID
   * @param id - ID của conversation
   * @param include - Các quan hệ cần include
   */
  findById(id: string, include?: Prisma.ConversationInclude): Promise<Conversation | null>;

  /**
   * Tìm conversation theo điều kiện unique
   * @param where - Điều kiện tìm kiếm unique
   * @param include - Các quan hệ cần include
   */
  findUnique(where: Prisma.ConversationWhereUniqueInput, include?: Prisma.ConversationInclude): Promise<Conversation | null>;

  /**
   * Tìm conversation đầu tiên theo điều kiện
   * @param where - Điều kiện tìm kiếm
   * @param include - Các quan hệ cần include
   */
  findFirst(where: Prisma.ConversationWhereInput, include?: Prisma.ConversationInclude): Promise<Conversation | null>;

  /**
   * Tìm nhiều conversations với điều kiện
   * @param args - Các tham số tìm kiếm
   */
  findMany(args: Prisma.ConversationFindManyArgs): Promise<Conversation[]>;

  /**
   * Tạo mới conversation
   * @param data - Dữ liệu conversation mới
   */
  create(data: Prisma.ConversationCreateInput): Promise<Conversation>;

  /**
   * Cập nhật conversation
   * @param where - Điều kiện xác định conversation
   * @param data - Dữ liệu cần cập nhật
   */
  update(where: Prisma.ConversationWhereUniqueInput, data: Prisma.ConversationUpdateInput): Promise<Conversation>;

  /**
   * Cập nhật nhiều conversations
   * @param where - Điều kiện lọc
   * @param data - Dữ liệu cập nhật
   */
  updateMany(where: Prisma.ConversationWhereInput, data: Prisma.ConversationUpdateManyMutationInput): Promise<Prisma.BatchPayload>;

  /**
   * Xóa conversation
   * @param where - Điều kiện xác định conversation
   */
  delete(where: Prisma.ConversationWhereUniqueInput): Promise<Conversation>;

  /**
   * Xóa nhiều conversations
   * @param where - Điều kiện lọc
   */
  deleteMany(where: Prisma.ConversationWhereInput): Promise<Prisma.BatchPayload>;

  /**
   * Đếm số lượng conversations
   * @param where - Điều kiện lọc
   */
  count(where?: Prisma.ConversationWhereInput): Promise<number>;

  // Specialized Methods

  /**
   * Tìm conversations của user
   * @param userId - ID của user
   * @param limit - Số lượng giới hạn
   * @param offset - Vị trí bắt đầu
   */
  findByUserId(userId: string, limit?: number, offset?: number): Promise<Conversation[]>;

  /**
   * Tìm conversations của shop
   * @param shopId - ID của shop
   * @param limit - Số lượng giới hạn
   * @param offset - Vị trí bắt đầu
   */
  findByShopId(shopId: string, limit?: number, offset?: number): Promise<Conversation[]>;

  /**
   * Tìm conversation giữa user và shop
   * @param userId - ID của user
   * @param shopId - ID của shop
   */
  findByUserAndShop(userId: string, shopId: string): Promise<Conversation | null>;

  /**
   * Cập nhật thời gian tin nhắn cuối
   * @param conversationId - ID của conversation
   * @param lastMessageAt - Thời gian tin nhắn cuối
   * @param lastMessageText - Nội dung tin nhắn cuối
   */
  updateLastMessage(conversationId: string, lastMessageAt: Date, lastMessageText: string): Promise<Conversation>;

  /**
   * Tăng số lượng tin nhắn
   * @param conversationId - ID của conversation
   * @param increment - Số lượng tăng (mặc định 1)
   */
  incrementMessageCount(conversationId: string, increment?: number): Promise<Conversation>;

  /**
   * Cập nhật unread count
   * @param conversationId - ID của conversation
   * @param count - Số lượng tin chưa đọc
   */
  updateUnreadCount(conversationId: string, count: number): Promise<Conversation>;

  /**
   * Đóng conversation
   * @param conversationId - ID của conversation
   */
  close(conversationId: string): Promise<Conversation>;

  /**
   * Resolve conversation
   * @param conversationId - ID của conversation
   */
  resolve(conversationId: string): Promise<Conversation>;
}
