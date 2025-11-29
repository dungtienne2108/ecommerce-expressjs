import { NotFoundError, ValidationError } from '../errors/AppError';
import { IUnitOfWork } from '../repositories/interfaces/uow.interface';
import { CartItemResponse, CartResponse } from '../types/cart.type';
import redis from '../config/redis';
import { CacheUtil } from '../utils/cache.util';

export class CartService {
  constructor(private uow: IUnitOfWork) {}

  async getOrCreateByUser(userId: string): Promise<CartResponse> {
    // Kiểm tra cache trước
    const cacheKey = CacheUtil.cartByUserId(userId);
    try {
      const cachedCart = await redis.get(cacheKey);
      if (cachedCart) {
        return JSON.parse(cachedCart);
      }
    } catch (error) {
      console.error('Redis get error:', error);
    }

    return this.uow.executeInTransaction(async (uow) => {
      let cart = await uow.cart.findByUserIdWithItems(userId);

      if (!cart) {
        cart = await uow.cart.create({
          user: { connect: { id: userId } },
          totalAmount: 0,
          totalItems: 0,
        });

        cart.items = [];
      }

      const cartResponse = this.mapToCartResponse(cart, userId);

      // Lưu vào cache
      await redis
        .set(cacheKey, JSON.stringify(cartResponse), 600)
        .catch((err) => console.error('Redis set error:', err));

      return cartResponse;
    });
  }

  async getOrCreateBySession(sessionId: string): Promise<CartResponse> {
    // Kiểm tra cache trước
    const cacheKey = CacheUtil.cartBySessionId(sessionId);
    const cachedCart = await redis.get(cacheKey);
    if (cachedCart) {
      return JSON.parse(cachedCart);
    }

    const cart = await this.uow.cart.findBySessionIdWithItems(sessionId);
    if (cart) {
      const cartResponse = {
        id: cart.id,
        sessionId: cart.sessionId ?? sessionId,
        items: cart.items.map((item) => {
          return {
            id: item.id,
            productId: item.productId,
            variantId: item.productVariantId,
            productName: item.productName,
            quantity: item.quantity,
            totalPrice: Number(item.totalPrice),
            unitPrice: Number(item.unitPrice),
            variantName: item.variantName ?? '',
          };
        }),
        totalAmount: Number(cart.totalAmount),
        itemsCount: Number(cart.totalItems),
      };

      // Lưu vào cache 10 phút
      await redis.set(cacheKey, JSON.stringify(cartResponse), 600);

      return cartResponse;
    }

    // Nếu không tìm thấy giỏ hàng, tạo mới
    const newCart = await this.uow.cart.create({
      sessionId,
      items: {
        create: [],
      },
    });

    const newCartResponse = {
      id: newCart.id,
      userId: newCart.userId ?? '',
      items: [],
      totalAmount: 0,
      itemsCount: 0,
    };

    // Lưu vào cache
    await redis.set(cacheKey, JSON.stringify(newCartResponse), 600);

    return newCartResponse;
  }

  async addItem(
    cartId: string,
    variantId: string,
    quantity: number,
    userId: string
  ): Promise<CartItemResponse> {
    if (quantity <= 0) {
      throw new ValidationError('Số lượng phải lớn hơn 0');
    }

    const cart = await this.uow.cart.findById(cartId);
    if(!cart){
      throw new NotFoundError('Giỏ hàng không tồn tại');
    }

    if(cart.userId && cart.userId !== userId){
      throw new ValidationError('Bạn không có quyền thêm sản phẩm vào giỏ hàng này');
    }

    return this.uow.executeInTransaction(async (uow) => {
      const [existingItem, variant] = await Promise.all([
        uow.cartItem.findByCartAndVariant(cartId, variantId),
        uow.productVariants.findByIdWithInclude(variantId, {
          images: true,
          product: true
        })
      ]);

      if(!variant){
        throw new NotFoundError('Sản phẩm không tồn tại');
      }

      const finalQuantity = existingItem
      ? existingItem.quantity + quantity
      : quantity;

      if(variant.stock < finalQuantity){
        throw new ValidationError('Số lượng trong kho không đủ');
      }

      const unitPrice = Number(variant.price ?? 0);
      const totalPrice = unitPrice * finalQuantity;

      let cartItem;
      if(existingItem){
        cartItem = await uow.cartItem.update(existingItem.id, {
          quantity: finalQuantity,
          totalPrice,
        });
      }
      else{
        const productImages = variant.images ?? [];

        cartItem = await uow.cartItem.create({
          cart: { connect: { id: cartId } },
          productVariant: { connect: { id: variantId } },
          product: { connect: { id: variant.productId } },
          productName: variant.product?.name || '',
          variantName: variant.name,
          unitPrice,
          quantity: finalQuantity,
          totalPrice,
          productImageUrl: productImages?.[0]?.imageUrl ?? '',
        });
      }

      await this.updateCartTotals(uow, cartId);
      
      const cart = await uow.cart.findById(cartId);

      if(cart?.userId){
        await this.invalidateCartCache(cartId, undefined, cart.userId)
        .catch((err) => console.error('Invalidate cart cache error:', err));
      }

      return this.mapToCartItemResponse(cartItem);
    });
  }

  async setItemQuantity(
    cartId: string,
    itemId: string,
    quantity: number
  ): Promise<CartItemResponse | null> {
    if (quantity <= 0) {
      throw new ValidationError('Số lượng phải lớn hơn 0');
    }

    return this.uow.executeInTransaction(async (uow) => {
      const cartItem = await uow.cartItem.findByIdWithVariant(itemId);

      if(!cartItem || cartItem.cartId !== cartId){
        throw new NotFoundError('Sản phẩm trong giỏ hàng không tồn tại');
      }

      if(quantity === 0){
        await uow.cartItem.delete(itemId);

        await this.updateCartTotals(uow, cartId);

        const cart = await uow.cart.findById(cartId);
        if(cart?.userId){
          await this.invalidateCartCache(cartId, undefined, cart.userId)
          .catch((err) => console.error('Invalidate cart cache error:', err));
        }

        return null;
      }

      const variant = cartItem.productVariant;
      if(!variant){
        throw new NotFoundError('Sản phẩm không tồn tại');
      }

      if(variant.stock < quantity){
        throw new ValidationError('Số lượng trong kho không đủ');
      }

      const unitPrice = Number(variant.price ?? 0);
      const totalPrice = unitPrice * quantity;

      const updatedItem = await uow.cartItem.update(itemId, {
        quantity,
        totalPrice,
      });

      await this.updateCartTotals(uow, cartId);

      const cart = await uow.cart.findById(cartId);

      if(cart?.userId){
        await this.invalidateCartCache(cartId, undefined, cart.userId)
        .catch((err) => console.error('Invalidate cart cache error:', err));
      }

      return this.mapToCartItemResponse(updatedItem);
    });
  }

  async removeItem(cartId: string, itemId: string, userId: string): Promise<CartItemResponse> {
    return this.uow.executeInTransaction(async (uow) => {

      const cart = await uow.cart.findById(cartId);
      if(cart?.userId && cart.userId !== userId){
        throw new ValidationError('Bạn không có quyền xóa sản phẩm này');
      }
      
      const cartItem = await uow.cartItem.findById(itemId);
      if (!cartItem || cartItem.cartId !== cartId) {
        throw new NotFoundError('Cart item not found');
      }

      await uow.cartItem.delete(itemId);

      await this.invalidateCartCache(
        cartId,
        undefined,
        cart?.userId ?? undefined
      );

      return {
        id: cartItem.id,
        cartId: cartItem.cartId,
        productId: cartItem.productId,
        variantId: cartItem.productVariantId,
        variantName: cartItem.variantName,
        productName: cartItem.productName,
        quantity: 0,
        unitPrice: 0,
        totalPrice: 0,
      } as CartItemResponse;
    });
  }

  async clearCart(cartId: string): Promise<CartResponse> {
    const cart = await this.uow.cart.findById(cartId);
    if (!cart) {
      throw new NotFoundError('Cart not found');
    }

    await this.uow.cartItem.deleteByCartId(cartId);

    // Invalidate cache
    await this.invalidateCartCache(cartId, undefined, cart.userId ?? undefined);

    return {
      id: cartId,
      userId: cart.userId ?? '',
      items: [],
      totalAmount: 0,
      itemsCount: 0,
    };
  }

  async transferCartToUser(
    sessionId: string,
    userId: string
  ): Promise<CartResponse> {
    const cart = await this.uow.cart.findBySessionIdWithItems(sessionId);
    if (!cart) {
      throw new NotFoundError('Cart not found');
    }

    // Gán lại userId cho giỏ hàng
    cart.userId = userId;
    await this.uow.cart.update(cart.id, { user: { connect: { id: userId } } });

    const cartResponse = {
      id: cart.id,
      userId: cart.userId ?? '',
      items: cart.items.map((item) => {
        return {
          id: item.id,
          productId: item.productId,
          variantId: item.productVariantId,
          variantName: item.variantName ?? '',
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        };
      }),
      totalAmount: Number(cart.totalAmount),
      itemsCount: cart.totalItems,
    };

    // Invalidate cache
    await this.invalidateCartCache(cart.id, sessionId, userId);

    return cartResponse;
  }

  // ==================== PRIVATE CACHE METHODS ====================
  /**
   * Invalidate cache liên quan đến cart
   */
  private async invalidateCartCache(
    cartId?: string,
    sessionId?: string,
    userId?: string
  ): Promise<void> {
    try {
      if (cartId) {
        console.log('Xóa cache của cartId', cartId);
        await redis.del(CacheUtil.cartItemsByCartId(cartId));
      }

      // Xóa cache session cart
      if (sessionId) {
        await redis.del(CacheUtil.cartBySessionId(sessionId));
      }

      // Xóa cache user cart (điều quan trọng vì frontend luôn lấy cart bằng userId)
      if (userId) {
        console.log('Xóa cache của userId', userId);
        await redis.del(CacheUtil.cartByUserId(userId));
      }
    } catch (error) {
      console.error('Error invalidating cart cache:', error);
    }
  }

  private mapToCartResponse(cart: any, userId: string): CartResponse {
    return {
      id: cart.id,
      userId: cart.userId ?? userId,
      items:
        cart.items?.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          variantId: item.productVariantId,
          variantName: item.variantName ?? '',
          productName: item.productName,
          productImage: item.productImageUrl ?? '',
          productCategory: '', // Consider removing if always empty
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        })) ?? [],
      totalAmount: Number(cart.totalAmount ?? 0),
      itemsCount: cart.totalItems ?? 0,
    };
  }

  private mapToCartItemResponse(item: any): CartItemResponse {
  return {
    id: item.id,
    cartId: item.cartId,
    productId: item.productId,
    variantId: item.productVariantId,
    variantName: item.variantName ?? '',
    productName: item.productName ?? '',
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice ?? 0),
    totalPrice: Number(item.totalPrice ?? 0),
  };
}

  private async updateCartTotals(uow: IUnitOfWork, cartId: string): Promise<void>{
    const items = await uow.cartItem.findByCartId(cartId);
    const totalAmount = items.reduce((sum, item) => sum + Number(item.totalPrice), 0);
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    await uow.cart.update(cartId, {
      totalAmount,
      totalItems
    });
  }
}
