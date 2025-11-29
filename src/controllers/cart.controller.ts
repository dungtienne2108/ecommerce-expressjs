import { Request, Response } from 'express';
import { cartService } from '../config/container';
import { UnauthorizedError, ValidationError } from '../errors/AppError';
import { ApiResponse } from '../types/common';
import { asyncHandler } from '../middleware/errorHandler';

export class CartController {
  getByUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('Không tìm thấy user');
      }

      const result = await cartService.getOrCreateByUser(userId);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy thành công giỏ hàng',
      };

      res.json(response);
    }
  );

  getBySession = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { sessionId } = req.params;
      if (!sessionId) {
        throw new ValidationError('Không tìm thấy session');
      }

      const result = await cartService.getOrCreateBySession(sessionId);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Lấy thành công giỏ hàng',
      };

      res.json(response);
    }
  );

  addItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { cartId } = req.params;
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError('Chưa đăng nhập');

    const { variantId, quantity } = req.body;

    if (!cartId) {
      throw new ValidationError('Bắt buộc phải có Cart ID');
    }
    if (!variantId) {
      throw new ValidationError('Bắt buộc phải có Variant ID');
    }
    if (!quantity || typeof quantity !== 'number') {
      throw new ValidationError('Bắt buộc phải có số lượng hợp lệ');
    }

    const result = await cartService.addItem(
      cartId,
      variantId,
      quantity,
      userId
    );

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'Thêm sản phẩm vào giỏ hàng thành công',
    };

    res.json(response);
  });

  updateItemQuantity = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { cartId, itemId } = req.params;
      const { quantity } = req.body;

      if (!cartId) {
        throw new ValidationError('Bắt buộc phải có Cart ID');
      }
      if (!itemId) {
        throw new ValidationError('Bắt buộc phải có Item ID');
      }
      if (quantity === undefined || typeof quantity !== 'number') {
        throw new ValidationError('Bắt buộc phải có số lượng hợp lệ');
      }
      if (quantity < 1) {
        throw new ValidationError('Số lượng phải lớn hơn hoặc bằng 1');
      }

      const result = await cartService.setItemQuantity(
        cartId,
        itemId,
        quantity
      );

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Cập nhật số lượng sản phẩm trong giỏ hàng thành công',
      };

      res.json(response);
    }
  );

  removeItem = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { cartId, itemId } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        throw new UnauthorizedError('Chưa đăng nhập');
      }

      if (!cartId) {
        throw new ValidationError('Bắt buộc phải có Cart ID');
      }
      if (!itemId) {
        throw new ValidationError('Bắt buộc phải có Item ID');
      }

      const result = await cartService.removeItem(cartId, itemId, userId);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Xóa sản phẩm khỏi giỏ hàng thành công',
      };

      res.json(response);
    }
  );

  clearCart = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { cartId } = req.params;

      if (!cartId) {
        throw new ValidationError('Bắt buộc phải có Cart ID');
      }

      const result = await cartService.clearCart(cartId);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Xóa sản phẩm khỏi giỏ hàng thành công',
      };

      res.json(response);
    }
  );

  transferCartToUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('Không tìm thấy user');
      }

      const { sessionId } = req.body;
      if (!sessionId) {
        throw new ValidationError('Không tìm thấy session');
      }

      const result = await cartService.transferCartToUser(sessionId, userId);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Chuyển giỏ hàng thành công',
      };

      res.json(response);
    }
  );
}

export const cartController = new CartController();
