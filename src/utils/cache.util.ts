/**
 * Cache Key Generator Utility
 * Sử dụng để tạo các key cache theo qui ước chung cho toàn app
 */

export class CacheUtil {
  // ==================== PRODUCT ====================
  static productById(id: string): string {
    return `product:${id}`;
  }

  static productsByFilters(filters: Record<string, any>): string {
    const key = `products:list:${JSON.stringify(filters)
      .split('')
      .reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0)}`;
    return key;
  }

  static productListAll(page: number, limit: number): string {
    return `products:all:page:${page}:limit:${limit}`;
  }

  static productsByShop(shopId: string): string {
    return `products:shop:${shopId}`;
  }

  static productsByCategory(categoryId: string): string {
    return `products:category:${categoryId}`;
  }

  static categoriesByName(name: string): string {
    return `categories:name:${name.toLowerCase()}`;
  }

  static categoriesAll(): string {
    return 'categories:all';
  }
  // ==================== USER ====================
  static userById(id: string): string {
    return `user:${id}`;
  }

  static userByEmail(email: string): string {
    return `user:email:${email.toLowerCase()}`;
  }

  static usersByFilters(filters: Record<string, any>): string {
    const filterStr = JSON.stringify(filters);
    const hash = filterStr
      .split('')
      .reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0);
    return `users:list:${hash}`;
  }

  static userList(page: number, limit: number): string {
    return `users:all:page:${page}:limit:${limit}`;
  }

  static userStatistics(): string {
    return 'user:statistics';
  }

  // ==================== SHOP ====================
  static shopById(id: string): string {
    return `shop:${id}`;
  }

  static shopByOwnerId(ownerId: string): string {
    return `shop:owner:${ownerId}`;
  }

  static shopList(): string {
    return 'shops:all';
  }

  // ==================== ORDER ====================
  static orderById(id: string): string {
    return `order:${id}`;
  }

  static orderByNumber(orderNumber: string): string {
    return `order:number:${orderNumber}`;
  }

  static ordersByFilters(filters: Record<string, any>): string {
    const key = `orders:list:${JSON.stringify(filters)
      .split('')
      .reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0)}`;
    return key;
  }

  static orderListAll(page: number, limit: number): string {
    return `orders:all:page:${page}:limit:${limit}`;
  }

  static userOrders(userId: string, page: number, limit: number): string {
    return `orders:user:${userId}:page:${page}:limit:${limit}`;
  }

  static userOrdersByFilters(userId: string, filters: Record<string, any>): string {
    const key = `orders:user:${userId}:filters:${JSON.stringify(filters)
      .split('')
      .reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0)}`;
    return key;
  }

  static shopOrders(shopId: string, page: number, limit: number): string {
    return `orders:shop:${shopId}:page:${page}:limit:${limit}`;
  }

  static userOrdersByStatus(userId: string, status: string): string {
    return `orders:user:${userId}:status:${status}`;
  }

  static shopOrdersByStatus(shopId: string, status: string): string {
    return `orders:shop:${shopId}:status:${status}`;
  }

  // ==================== PAYMENT ====================
  static paymentById(id: string): string {
    return `payment:${id}`;
  }

  static paymentByOrderId(orderId: string): string {
    return `payment:order:${orderId}`;
  }

  static paymentsList(page: number, limit: number): string {
    return `payments:all:page:${page}:limit:${limit}`;
  }

  static paymentsByStatus(status: string): string {
    return `payments:status:${status}`;
  }

  static paymentStatistics(): string {
    return 'payment:statistics';
  }

  // ==================== CART ====================
  static cartByUserId(userId: string): string {
    return `cart:user:${userId}`;
  }

  static cartBySessionId(sessionId: string): string {
    return `cart:session:${sessionId}`;
  }

  static cartItemsByCartId(cartId: string): string {
    return `cart:${cartId}:items`;
  }

  // ==================== CASHBACK ====================
  static cashbackById(id: string): string {
    return `cashback:${id}`;
  }

  static cashbackByPaymentId(paymentId: string): string {
    return `cashback:payment:${paymentId}`;
  }

  static userCashbacks(userId: string, page: number, limit: number): string {
    return `cashbacks:user:${userId}:page:${page}:limit:${limit}`;
  }

  static cashbacksByStatus(status: string): string {
    return `cashbacks:status:${status}`;
  }

  static cashbackStatistics(): string {
    return 'cashback:statistics';
  }

  // ==================== CATEGORY ====================
  static categoryById(id: string): string {
    return `category:${id}`;
  }

  static categoriesList(): string {
    return 'categories:all';
  }

  // ==================== VOUCHER ====================
  static voucherById(id: string): string {
    return `voucher:${id}`;
  }

  static voucherByCode(code: string): string {
    return `voucher:code:${code}`;
  }

  static vouchersByFilters(filters: Record<string, any>): string {
    const key = `vouchers:list:${JSON.stringify(filters)
      .split('')
      .reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0)}`;
    return key;
  }

  static voucherListAll(page: number, limit: number): string {
    return `vouchers:all:page:${page}:limit:${limit}`;
  }

  static vouchersByShop(shopId: string): string {
    return `vouchers:shop:${shopId}`;
  }

  static publicVouchers(): string {
    return 'vouchers:public';
  }

  // ==================== VARIANTS ====================
  static variantById(id: string): string {
    return `variant:${id}`;
  }

  static variantsBySku(sku: string): string {
    return `variant:sku:${sku}`;
  }

  static variantsByProductId(productId: string): string {
    return `variants:product:${productId}`;
  }

  // ==================== ROLE & PERMISSIONS ====================
  static roleById(id: string): string {
    return `role:${id}`;
  }

  static rolesList(): string {
    return 'roles:all';
  }

  static userPermissions(userId: string): string {
    return `permissions:user:${userId}`;
  }

  static rolePermissions(roleId: string): string {
    return `permissions:role:${roleId}`;
  }

  // ==================== KYC ====================
  static kycByShopId(shopId: string): string {
    return `kyc:shop:${shopId}`;
  }

  static kycById(id: string): string {
    return `kyc:${id}`;
  }

  // ==================== PATTERNS ====================
  /**
   * Xóa tất cả cache theo pattern
   * Ví dụ: products:*, user:123:*, etc.
   */
  static getPattern(entity: string): string {
    return `${entity}:*`;
  }

  /**
   * Xóa cache liên quan đến product
   */
  static productPatterns(productId?: string): string[] {
    const patterns: string[] = [
      `product:${productId || '*'}`,
      `products:*`,
      `variants:product:${productId || '*'}`,
    ];
    return patterns;
  }

  /**
   * Xóa cache liên quan đến user
   */
  static userPatterns(userId?: string): string[] {
    return [
      `user:${userId || '*'}`,
      `users:*`,
      `user:email:*`,
      `user:statistics`,
    ];
  }

  /**
   * Xóa cache liên quan đến shop
   */
  static shopPatterns(shopId?: string): string[] {
    return [
      `shop:${shopId || '*'}`,
      `products:shop:${shopId || '*'}`,
      `orders:shop:${shopId || '*'}`,
      `shops:*`,
    ];
  }

  /**
   * Xóa cache liên quan đến order
   */
  static orderPatterns(orderId?: string): string[] {
    return [
      `order:${orderId || '*'}`,
      `orders:*`,
      `payment:order:${orderId || '*'}`,
    ];
  }

  /**
   * Xóa cache liên quan đến payment
   */
  static paymentPatterns(paymentId?: string): string[] {
    return [
      `payment:${paymentId || '*'}`,
      `payments:*`,
      `payment:statistics`,
    ];
  }

  /**
   * Xóa cache liên quan đến cart
   */
  static cartPatterns(cartId?: string, userId?: string): string[] {
    return [
      `cart:user:${userId || '*'}`,
      `cart:session:*`,
      `cart:${cartId || '*'}:items`,
    ];
  }

  /**
   * Xóa cache liên quan đến cashback
   */
  static cashbackPatterns(cashbackId?: string): string[] {
    return [
      `cashback:${cashbackId || '*'}`,
      `cashbacks:*`,
      `cashback:statistics`,
    ];
  }
}
