import { ProductDetailResponse } from './../types/product.types';
import { ProductStatus, ShopStatus } from '@prisma/client';
import { ForbiddenError, NotFoundError, ValidationError } from '../errors/AppError';
import { IUnitOfWork } from '../repositories/interfaces/uow.interface';
import {
  AddProductCategoriesInput,
  AddProductImagesInput,
  AddProductOptionsInput,
  AddProductVariantsInput,
  CreateDraftProductInput,
  DraftProductResponse,
  ProductCategoriesResponse,
  ProductFilters,
  ProductImagesResponse,
  ProductOptionsResponse,
  ProductResponse,
  ProductStatusResponse,
  ProductVariantsResponse,
  UpdateProductStatusInput,
  VariantOptionValueMapping,
} from '../types/product.types';
import { generateSKU } from '../utils/sku.util';
import { PaginatedResponse } from '../types/common';
import redis from '../config/redis';
import { CacheUtil } from '../utils/cache.util';
import { CategoryResponse } from '../types/category.types';
import { create } from 'domain';

export class ProductService {
  constructor(private uow: IUnitOfWork) {}

  async findById(productId: string): Promise<ProductDetailResponse | null> {
    const cacheKey = CacheUtil.productById(productId);
    const cacheResult = await redis.get(cacheKey);
    if (cacheResult) {
      return JSON.parse(cacheResult);
    }

    const product = await this.uow.products.findById(productId);

    if (!product) {
      return null;
    }

    const productDetail: ProductDetailResponse = {
      id: product.id,
      name: product.name,
      shopId: product.shopId,
      status: product.status,
      averageRating: product.averageRating,
      reviewCount: product.reviewCount,
      createdAt: product.createdAt,
      imageUrl: product.images?.[0]?.imageUrl ?? '',
      price: Number(product.variants?.[0]?.price),
      shop: {
        id: product.shop?.id ?? '',
        name: product.shop?.name ?? '',
        address: product.shop?.city ?? '',
        logoUrl: product.shop?.logoUrl ?? '',
        rating: Number(product.shop?.rating),
        reviewCount: Number(product.shop?.reviewCount),
        createdAt: product.shop?.createdAt ?? '',
      },
      variants: product.variants?.map((variant) => ({
        id: variant.id,
        name: variant.name,
        value: variant.value,
        price: Number(variant.price),
        currency: variant.currency,
        sku: variant.sku,
        stock: variant.stock,
        status: variant.status,
        optionValues: variant.optionValues?.map((ov) => ({
          id: ov.id,
          productOptionId: ov.productOptionId,
          productOptionValueId: ov.productOptionValueId,
          productOption: ov.productOption.name,
          productOptionValue: ov.productOptionValue.value,
        })),
        images: variant.images?.map((img) => ({
          id: img.id,
          imageUrl: img.imageUrl,
          isPrimary: img.isPrimary,
          sortOrder: img.sortOrder,
        })),
      })),
      images: product.images?.map((img) => ({
        id: img.id,
        imageUrl: img.imageUrl,
        isPrimary: img.isPrimary,
        sortOrder: img.sortOrder,
      })),
      options: product.options?.map((opt) => ({
        id: opt.id,
        name: opt.name,
        values: opt.values?.map((val) => ({
          id: val.id,
          value: val.value,
          sortOrder: val.sortOrder,
        })),
      })),
      categories: product.categories?.map((pc) => ({
        id: pc.category.id,
        name: pc.category.name,
        parentCategoryId: pc.category.parentCategoryId ?? '',
      })),
    };

    await redis.set(cacheKey, JSON.stringify(productDetail), 600); // 10 phút

    return productDetail;
  }

  async findByShopId(shopId: string): Promise<ProductResponse[]> {
    const products = await this.uow.products.findByShopId(shopId);

    const productResponses: ProductResponse[] = products.map((product) => ({
      id: product.id,
      name: product.name,
      shopId: product.shopId,
      status: product.status,
      averageRating: product.averageRating,
      reviewCount: product.reviewCount,
      createdAt: product.createdAt,
      imageUrl: product.images?.[0]?.imageUrl ?? '',
      price: Number(product.variants?.[0]?.price),
    }));

    return productResponses;
  }

  async findMany(
    filters: ProductFilters
  ): Promise<PaginatedResponse<ProductResponse>> {
    // Tạo cache key từ filters
    const cacheKey = CacheUtil.productsByFilters(filters);
    const cacheResult = await redis.get(cacheKey).catch(err => {
      console.error('Redis get error:', err);
      return null;
    });
    if (cacheResult) {
      console.log('cacheResult', cacheResult);
      return JSON.parse(cacheResult);
    }

    const products = await this.uow.products.findMany(filters);

    const productResponses: ProductResponse[] = products.data.map((product) => ({
      id: product.id,
      name: product.name,
      shopId: product.shopId,
      status: product.status,
      averageRating: product.averageRating,
      reviewCount: product.reviewCount,
      createdAt: product.createdAt,
      imageUrl: product.images?.[0]?.imageUrl ?? '',
      price: Number(product.variants?.[0]?.price),
      totalStock: product.variants?.reduce((acc, variant) => acc + (variant.stock ?? 0), 0),
      soldCount: product.soldCount,
    }));

    const result = {
      data: productResponses,
      pagination: {
        total: products.pagination.total,
        totalPages: products.pagination.totalPages,
        currentPage: products.pagination.currentPage,
        limit: products.pagination.limit,
        hasNext: products.pagination.hasNext,
        hasPrev: products.pagination.hasPrev,
      },
    };

    // Lưu vào cache 15 phút
    await redis.set(cacheKey, JSON.stringify(result), 900);

    return result;
  }

  async createDraftProduct(
    data: CreateDraftProductInput,
    createdBy: string
  ): Promise<DraftProductResponse> {
    return this.uow.executeInTransaction(async (uow) => {
      const shop = await uow.shops.findById(data.shopId);
      if (!shop) {
        throw new NotFoundError('Shop');
      }
      if (shop.ownerId !== createdBy) {
        throw new ForbiddenError(
          'Bạn không có quyền tạo sản phẩm cho cửa hàng này'
        );
      }
      if (shop.status !== ShopStatus.ACTIVE) {
        throw new ForbiddenError('Cửa hàng này không hoạt động');
      }

      const product = await uow.products.create({
        name: data.name,
        shop: { connect: { id: shop.id } },
        status: ProductStatus.DRAFT,
        createdBy,
        updatedBy: createdBy,
      });

      console.log('Created product:', product);

      console.log('this.invalidateProductCache:', this.invalidateProductCache);

      // Invalidate cache
      // await this.invalidateProductCache(shop.id);

      return {
        id: product.id,
        name: product.name,
        shopId: product.shopId,
        status: product.status,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        description: data.description || '',
      };
    });
  }

  async addCategoriesToProduct(
    productId: string,
    data: AddProductCategoriesInput,
    updatedBy: string
  ): Promise<ProductCategoriesResponse> {
    return this.uow.executeInTransaction(async (uow) => {
      const [product, categories] = await Promise.all([
        uow.products.findById(productId, { shop: true }),
        uow.categories.findManyByIds(data.categoryIds)
      ]);

      if (!product) {
        throw new NotFoundError('Product');
      }
      if (product.shop?.ownerId !== updatedBy) {
        throw new ForbiddenError(
          'Bạn không có quyền sửa đổi danh mục sản phẩm này'
        );
      }

      if (categories.length !== data.categoryIds.length) {
        throw new NotFoundError('Category');
      }
      
      await uow.productCategories.replaceProductCategories(
        productId,
        data.categoryIds,
        updatedBy
      );

      // Invalidate cache
      // await this.invalidateProductCache(product.shopId, productId);

      return {
        productId,
        categories: categories.map((cate) => ({
          id: cate.id,
          name: cate.name,
          description: cate.description,
        })),
      };
    });
  }

  async addOptionsToProduct(
    productId: string,
    data: AddProductOptionsInput,
    updatedBy: string
  ): Promise<ProductOptionsResponse> {
    return this.uow.executeInTransaction(async (uow) => {
      const product = await uow.products.findById(productId, { shop: true });

      if (!product) {
        throw new NotFoundError('Product');
      }
      if (product.shop?.ownerId !== updatedBy) {
        throw new ForbiddenError(
          'Bạn không có quyền sửa đổi tùy chọn sản phẩm này'
        );
      }

      await uow.products.addOptions(productId, data.options, updatedBy);

      const productWithOptions = await uow.products.findById(productId, {
        options: true,
      });

      // Invalidate cache
      // await this.invalidateProductCache(product.shopId, productId);

      return {
        productId,
        options:
          productWithOptions?.options?.map((option) => ({
            id: option.id,
            name: option.name,
            values:
              option.values?.map((value) => ({
                id: value.id,
                value: value.value,
                sortOrder: value.sortOrder,
              })) || [],
          })) || [],
      };
    });
  }

  async addVariantsToProduct(
    productId: string,
    data: AddProductVariantsInput,
    updatedBy: string
  ): Promise<ProductVariantsResponse> {
    // validate
    if(data.variants.length === 0) {
      throw new ValidationError('Phải có ít nhất một biến thể sản phẩm');
    }

    // tên tron data không được trùng nhau
    const names = new Set<string>();
    for(const variant of data.variants) {
      if(!variant.name || variant.name.trim() === '') {
        throw new ValidationError('Tên biến thể không được để trống');
      }
      if(names.has(variant.name.trim().toLowerCase())) {
        throw new ValidationError(`Tên biến thể '${variant.name}' bị trùng`);
      }
      names.add(variant.name.trim().toLowerCase());
    }

    return this.uow.executeInTransaction(async (uow) => {
      const product = await uow.products.findById(productId, {
        shop: true,
        options: true,
      });

      if (!product) {
        throw new NotFoundError('Product');
      }
      if (product.shop?.ownerId !== updatedBy) {
        throw new ForbiddenError(
          'Bạn không có quyền sửa đổi biến thể sản phẩm này'
        );
      }

      const createdVariants = [];

      for (const variantData of data.variants) {
        const sku = generateSKU(
          product.shop!.name,
          product.name,
          variantData.name
        );

        const existingVariant = await uow.productVariants.findBySku(sku);
        if (existingVariant) {
          throw new ForbiddenError(`SKU ${sku} đã tồn tại cho sản phẩm khác`);
        }

        const variant = await uow.productVariants.create({
          product: { connect: { id: product.id } },
          sku,
          name: variantData.name,
          value: variantData.value,
          price: variantData.price,
          stock: variantData.stock,
          currency: 'VND',
          description: variantData.description ?? null,
          status: ProductStatus.DRAFT,
          createdBy: updatedBy,
          updatedBy: updatedBy,
          images: {
            create: variantData.imageUrls?.map((url, index) => ({
              imageUrl: url,
              isPrimary: index === 0,
              sortOrder: index,
              createdBy: updatedBy,
              updatedBy: updatedBy,
              productId: product.id,
            })) ?? [],
          }
        });

        if (
          variantData.optionCombination &&
          Object.keys(variantData.optionCombination).length > 0
        ) {
          const optionValueMappings = await this.resolveOptionValueMappings(
            product.options || [],
            variantData.optionCombination
          );

          if (optionValueMappings.length > 0) {
            await uow.productVariants.setOptionValues(
              variant.id,
              optionValueMappings,
              updatedBy
            );
          }
        }

        createdVariants.push(variant);
      }

      // Invalidate cache
      // await this.invalidateProductCache(product.shopId, productId);

      return {
        productId,
        variants: createdVariants.map((variant) => ({
          id: variant.id,
          name: variant.name,
          value: variant.value,
          price: Number(variant.price),
          currency: variant.currency,
          sku: variant.sku,
        })),
      };
    });
  }

  private async resolveOptionValueMappings(
    options: any[],
    optionCombination: Record<string, string>
  ): Promise<VariantOptionValueMapping[]> {
    const mappings: VariantOptionValueMapping[] = [];

    for (const [optionName, optionValue] of Object.entries(optionCombination)) {
      const option = options.find(
        (opt) => opt.name.toLowerCase() === optionName.toLowerCase()
      );
      if (!option) {
        throw new NotFoundError(`Option '${optionName}`);
      }

      const value = option.values?.find(
        (val: any) => val.value.toLowerCase() === optionValue.toLowerCase()
      );
      if (!value) {
        throw new NotFoundError(
          `Option value '${optionValue}'của option '${optionName}'`
        );
      }

      mappings.push({
        optionId: option.id,
        optionValueId: value.id,
      });
    }

    return mappings;
  }

  async addImagesToProduct(
    productId: string,
    data: AddProductImagesInput,
    updatedBy: string
  ): Promise<ProductImagesResponse> {
    return this.uow.executeInTransaction(async (uow) => {
      const product = await uow.products.findById(productId, { shop: true });
      if (!product) {
        throw new NotFoundError('Product');
      }
      if (product.shop?.ownerId !== updatedBy) {
        throw new ForbiddenError(
          'Bạn không có quyền sửa đổi hình ảnh sản phẩm này'
        );
      }

      const imagesData = data.images.map((img, index) => ({
        productId,
        imageUrl: img.imageUrl,
        isPrimary: img.isPrimary || index === 0,
        sortOrder: img.sortOrder ?? index,
        description: img.description ?? null,
      }));

      await uow.products.addImages(productId, imagesData, updatedBy);

      const productWithImages = await uow.products.findById(productId, {
        images: true,
      });

      // Invalidate cache
      // await this.invalidateProductCache(product.shopId, productId);

      return {
        productId,
        images:
          productWithImages?.images?.map((img) => ({
            id: img.id,
            imageUrl: img.imageUrl,
            isPrimary: img.isPrimary,
            sortOrder: img.sortOrder,
            description: img.description ?? '',
          })) || [],
      };
    });
  }

  async updateProductStatus(
    productId: string,
    data: UpdateProductStatusInput,
    updatedBy: string
  ): Promise<ProductStatusResponse> {
    return this.uow.executeInTransaction(async (uow) => {
      const product = await uow.products.findById(productId, {
        shop: true,
        variants: true,
        images: true,
      });

      if (!product) {
        throw new NotFoundError('Product');
      }

      if (product.shop?.ownerId !== updatedBy) {
        throw new ForbiddenError(
          'Bạn không có quyền sửa đổi trạng thái sản phẩm này'
        );
      }

      if (data.status === ProductStatus.PUBLISHED) {
        if (!product.variants || product.variants.length === 0) {
          throw new ValidationError('Sản phẩm chưa có biến thể');
        }

        if (!product.images || product.images.length === 0) {
          throw new ValidationError('Sản phẩm chưa có hình ảnh');
        }
      }

      const updatedProduct = await uow.products.update(productId, {
        status: data.status,
        updatedBy,
      });

      // Invalidate cache
      // await this.invalidateProductCache(product.shopId, productId);

      return {
        id: updatedProduct.id,
        status: updatedProduct.status,
        updatedAt: updatedProduct.updatedAt,
      };
    });
  }

  // ==================== PRIVATE METHODS ====================
  /**
   * Invalidate cache liên quan đến product
   */
  private async invalidateProductCache(
    shopId: string,
    productId?: string
  ): Promise<void> {
    try {
      const cachePatterns = [
        ...(productId ? CacheUtil.productPatterns(productId) : CacheUtil.productPatterns()),
        CacheUtil.shopPatterns(shopId),
      ];

      // Redis không hỗ trợ KEYS trong production, nên ta xóa các key cụ thể đã biết
      for (const pattern of cachePatterns) {
        // Xóa các key từ pattern bằng cách dùng SCAN hoặc xóa key cụ thể
        if (typeof pattern === 'string' && !pattern.includes('*')) {
          // Nếu là key cụ thể, xóa trực tiếp
          await redis.del(pattern);
        }
      }

      // Xóa các key cụ thể mà ta biết
      if (productId) {
        await redis.del(CacheUtil.productById(productId));
      }
      await redis.del(CacheUtil.productsByShop(shopId));

      // Xóa cache list products (tất cả trang)
      for (let page = 1; page <= 100; page++) {
        // Giả sử có tối đa 100 trang cache
        await redis.del(CacheUtil.productListAll(page, 10));
        await redis.del(CacheUtil.productListAll(page, 20));
        await redis.del(CacheUtil.productListAll(page, 50));
      }
    } catch (error) {
      console.error('Error invalidating product cache:', error);
      // Không throw error, chỉ log
    }
  }
}
