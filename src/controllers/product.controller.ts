import { Request, Response } from 'express';
import {
  addProductImagesSchema,
  addProductOptionsSchema,
  addProductVariantsSchema,
  createDraftProductSchema,
  updateProductStatusSchema,
} from '../validators/product.validators';
import { ValidationError } from '../errors/AppError';
import { productService } from '../config/container';
import { ApiResponse } from '../types/common';
import { addProductCategoriesSchema } from '../validators/category.validator';
import { asyncHandler } from '../middleware/errorHandler';
import { ProductStatus } from '@prisma/client';
import { ProductFilters } from '../types/product.types';

export class ProductController {
  findById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      if (!id) {
        throw new ValidationError('Sản phẩm không tồn tại');
      }

      const product = await productService.findById(id);
      if (!product) {
        throw new ValidationError('Sản phẩm không tồn tại');
      }

      const response: ApiResponse = {
        success: true,
        data: product,
        message: 'Lấy thành công product',
      };
      res.json(response);
    }
  );

  findByShopId = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { shopId } = req.params;
      if (!shopId) {
        throw new ValidationError('Shop ID is required');
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User chưa đăng nhập');
      }

      const products = await productService.findByShopId(shopId);

      const response: ApiResponse = {
        success: true,
        data: products,
        message: 'Lấy danh sách sản phẩm thành công',
      };

      res.json(response);
    }
  );

  findMany = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const priceRange: { min?: number; max?: number } = {};
      const minPrice = req.query.min ? Number(req.query.min) : undefined;
      const maxPrice = req.query.max ? Number(req.query.max) : undefined;

      if (minPrice !== undefined) priceRange.min = minPrice;
      if (maxPrice !== undefined) priceRange.max = maxPrice;

      const filters: ProductFilters = {
        shopId: req.query.shopId as string,
        status: req.query.status as ProductStatus,
        categoryId: req.query.categoryId as string,
        searchTerm: req.query.searchTerm as string,
        priceRange,
        sortBy: req.query.sortBy as 'createdAt',
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 10,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      };

      const products = await productService.findMany(filters);

      const response: ApiResponse = {
        success: true,
        data: products,
        message: 'Lấy danh sách sản phẩm thành công',
      };

      res.json(response);
    }
  );

  createDraftProduct = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { error, value } = createDraftProductSchema.validate(req.body);
      if (error) {
        throw new ValidationError(
          error.details?.[0]?.message || 'Validation error'
        );
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User chưa đăng nhập');
      }

      const result = await productService.createDraftProduct(value, userId);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Tạo sản phẩm nháp thành công',
      };
      res.json(response);
    }
  );

  addCategoriesToProduct = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { productId } = req.params;
      if (!productId) {
        throw new ValidationError('Product ID is required');
      }

      const { error, value } = addProductCategoriesSchema.validate(req.body);
      if (error) {
        throw new ValidationError(
          error.details?.[0]?.message || 'Validation error'
        );
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User chưa đăng nhập');
      }

      const result = await productService.addCategoriesToProduct(
        productId,
        value,
        userId
      );

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Thêm danh mục vào sản phẩm thành công',
      };
      res.status(200).json(response);
    }
  );

  addOptionsToProduct = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { productId } = req.params;
      if (!productId) {
        throw new ValidationError('Product ID is required');
      }

      const { error, value } = addProductOptionsSchema.validate(req.body);
      if (error) {
        throw new ValidationError(
          error.details?.[0]?.message || 'Validation error'
        );
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User chưa đăng nhập');
      }

      const result = await productService.addOptionsToProduct(
        productId,
        value,
        userId
      );

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Thêm tùy chọn vào sản phẩm thành công',
      };
      res.status(200).json(response);
    }
  );

  addVariantsToProduct = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { productId } = req.params;
      if (!productId) {
        throw new ValidationError('Product ID is required');
      }

      const { error, value } = addProductVariantsSchema.validate(req.body);
      if (error) {
        throw new ValidationError(
          error.details?.[0]?.message || 'Validation error'
        );
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User chưa đăng nhập');
      }

      const result = await productService.addVariantsToProduct(
        productId,
        value,
        userId
      );

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Thêm biến thể vào sản phẩm thành công',
      };
      res.status(200).json(response);
    }
  );

  addImagesToProduct = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { productId } = req.params;
      if (!productId) {
        throw new ValidationError('Product ID is required');
      }

      const { error, value } = addProductImagesSchema.validate(req.body);
      if (error) {
        throw new ValidationError(
          error.details?.[0]?.message || 'Validation error'
        );
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User chưa đăng nhập');
      }

      const result = await productService.addImagesToProduct(
        productId,
        value,
        userId
      );

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Thêm hình ảnh vào sản phẩm thành công',
      };
      res.status(200).json(response);
    }
  );

  updateProductStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { productId } = req.params;
      if (!productId) {
        throw new ValidationError('Product ID is required');
      }

      const { error, value } = updateProductStatusSchema.validate(req.body);
      if (error) {
        throw new ValidationError(
          error.details?.[0]?.message || 'Validation error'
        );
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User chưa đăng nhập');
      }

      const result = await productService.updateProductStatus(
        productId,
        value,
        userId
      );

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Cập nhật trạng thái sản phẩm thành công',
      };
      res.status(200).json(response);
    }
  );
}

export const productController = new ProductController();
