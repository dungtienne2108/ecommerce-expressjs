import {
  Product,
  ProductStatus,
  ProductImage,
  ProductOption,
  Prisma,
  ProductOptionValue,
  ProductVariant,
  ProductCategory,
  Shop,
  ProductVariantOptionValue,
} from '@prisma/client';
import {
  BatchUpdateVariantData,
  CreateProductOptionData,
  CreateProductOptionValueData,
  ProductFilters,
  ProductIncludes,
  VariantFilters,
  VariantIncludes,
  VariantOptionValueMapping,
} from '../../types/product.types';
import { PaginatedResponse } from '../../types/common';

export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    images: true;
    options: {
      include: {
        values: true;
      };
    };
    variants: {
      include: {
        images: {
          select: {
            id: true;
            imageUrl: true;
            isPrimary: true;
            sortOrder: true;
          };
        };
        optionValues: {
          select: {
            id: true;
            productOptionId: true;
            productOptionValueId: true;
            productOption: { select: { name: true } };
            productOptionValue: { select: { value: true } };
          };
        };
      };
    };
    categories: {
      select: {
        category: { select: { id: true; name: true; parentCategoryId: true } };
      };
    };
    shop: true;
  };
}>;

export type TProductWithRelations<T extends ProductIncludes> =
  Prisma.ProductGetPayload<{
    include: T;
  }>;

export interface IProductRepository {
  /**
   * Tạo mới một sản phẩm
   * @param {Prisma.ProductCreateInput} data - Dữ liệu tạo sản phẩm
   * @returns {Promise<Product>} - Sản phẩm vừa được tạo
   */
  create(data: Prisma.ProductCreateInput): Promise<Product>;
  /**
   * Tìm sản phẩm theo ID, bao gồm tất cả quan hệ liên quan (shop, images, options, variants, categories)
   * @param {string} id - ID của sản phẩm
   * @returns {Promise<ProductWithRelations | null>} - Sản phẩm với các quan hệ hoặc null
   */
  findById(
    id: string,
    include?: ProductIncludes
  ): Promise<ProductWithRelations | null>;

  findByShopId(shopId: string): Promise<ProductWithRelations[]>;
  /**
   * Cập nhật thông tin sản phẩm
   * @param {string} id - ID của sản phẩm
   * @param {Prisma.ProductUpdateInput} data - Dữ liệu cập nhật sản phẩm
   * @returns {Promise<Product>} - Sản phẩm đã được cập nhật
   */
  update(id: string, data: Prisma.ProductUpdateInput): Promise<Product>;
  /**
   * Xóa mềm sản phẩm
   * @param {string} id - ID của sản phẩm
   * @param {string} deletedBy - ID người dùng đã xóa
   */
  softDelete(id: string, deletedBy: string): Promise<void>;

  /**
   * Tìm nhiều sản phẩm với bộ lọc, phân trang và sắp xếp
   * @param {ProductFilters} filters - Bộ lọc và tham số phân trang
   * @returns {Promise<PaginatedResponse<Product>>} - Danh sách sản phẩm với phân trang và filter
   */
  findMany(
    filters: ProductFilters
  ): Promise<
    PaginatedResponse<TProductWithRelations<{ images: true; variants: true }>>
  >;

  findUnique(where: Prisma.ProductWhereUniqueInput): Promise<Product | null>;

  /**
   * Thêm nhiều hình ảnh cho sản phẩm
   * @param {string} productId - ID của sản phẩm
   * @param {Prisma.ProductImageCreateManyInput[]} images - Danh sách hình ảnh cần thêm
   * @param {string} createdBy - ID người tạo
   * @returns {Promise<void>}
   */
  addImages(
    productId: string,
    images: Prisma.ProductImageCreateManyInput[],
    createdBy: string
  ): Promise<void>;
  /**
   * Xóa mềm nhiều hình ảnh của sản phẩm
   * @param {string} productId - ID của sản phẩm
   * @param {string[]} imageIds - Danh sách ID hình ảnh cần xóa
   * @param {string} deletedBy - ID người thực hiện xóa
   * @returns {Promise<void>}
   */
  removeImages(
    productId: string,
    imageIds: string[],
    deletedBy: string
  ): Promise<void>;
  /**
   * Đặt một hình ảnh làm hình ảnh chính (reset tất cả rồi set hình được chọn)
   * @param {string} productId - ID của sản phẩm
   * @param {string} imageId - ID hình ảnh được chọn làm chính
   * @returns {Promise<void>}
   */
  setPrimaryImage(productId: string, imageId: string): Promise<void>;

  /**
   * Thêm nhiều tùy chọn và giá trị tùy chọn cho sản phẩm
   * @param {string} productId - ID của sản phẩm
   * @param {CreateProductOptionData[]} options - Danh sách tùy chọn cần thêm
   * @param {string} createdBy - ID người tạo
   * @returns {Promise<void>}
   */
  addOptions(
    productId: string,
    options: CreateProductOptionData[],
    createdBy: string
  ): Promise<void>;
  /**
   * Xóa mềm nhiều tùy chọn và tất cả giá trị tùy chọn liên quan
   * @param {string} productId - ID của sản phẩm
   * @param {string[]} optionIds - Danh sách ID tùy chọn cần xóa
   * @param {string} deletedBy - ID người thực hiện xóa
   * @returns {Promise<void>}
   */
  removeOptions(
    productId: string,
    optionIds: string[],
    deletedBy: string
  ): Promise<void>;
  /**
   * Thêm nhiều giá trị cho một tùy chọn
   * @param {string} optionId - ID của tùy chọn
   * @param {CreateProductOptionValueData[]} values - Danh sách giá trị cần thêm
   * @param {string} createdBy - ID người tạo
   * @returns {Promise<void>}
   */
  addOptionValues(
    optionId: string,
    values: CreateProductOptionValueData[],
    createdBy: string
  ): Promise<void>;
  /**
   * Xóa mềm nhiều giá trị của một tùy chọn
   * @param {string} optionId - ID của tùy chọn
   * @param {string[]} valueIds - Danh sách ID giá trị cần xóa
   * @param {string} deletedBy - ID người thực hiện xóa
   * @returns {Promise<void>}
   */
  removeOptionValues(
    optionId: string,
    valueIds: string[],
    deletedBy: string
  ): Promise<void>;

  // Rating methods
  /**
   * Cập nhật điểm đánh giá trung bình và số lượng đánh giá của sản phẩm
   * @param {string} id - ID của sản phẩm
   * @param {number} rating - Điểm đánh giá trung bình mới
   * @param {number} reviewCount - Số lượng đánh giá mới
   * @returns {Promise<void>}
   */
  updateAverageRating(
    id: string,
    rating: number,
    reviewCount: number
  ): Promise<void>;

  // Count methods
  /**
   * Đếm tổng số sản phẩm theo bộ lọc
   * @param {ProductFilters} [filters] - Bộ lọc (tùy chọn)
   * @returns {Promise<number>} - Tổng số sản phẩm
   */
  count(filters?: Prisma.ProductWhereInput): Promise<number>;
  /**
   * Đếm số sản phẩm theo shop
   * @param {string} shopId - ID của shop
   * @returns {Promise<number>} - Số lượng sản phẩm của shop
   */
  countByShop(shopId: string): Promise<number>;
}

export type ProductVariantWithRelations = Prisma.ProductVariantGetPayload<{
  include: {
    product: { include?: { images: true } };
    images: true;
    optionValues: true;
  };
}>;

export interface IProductVariantRepository {
  batchUpdateStock(stockUpdates: { id: string; quantity: number }[]): any;
  /**
   * Tạo mới một biến thể sản phẩm
   * @param {Prisma.ProductVariantCreateInput} data - Dữ liệu tạo biến thể
   * @returns {Promise<ProductVariant>} - Biến thể vừa được tạo
   */
  create(data: Prisma.ProductVariantCreateInput): Promise<ProductVariant>;
  /**
   * Tìm biến thể sản phẩm theo ID
   * @param {string} id - ID của biến thể
   * @param {VariantIncludes} [include] - Tùy chọn include các quan hệ
   * @returns {Promise<ProductVariantWithRelations | null>} - Biến thể với quan hệ hoặc null
   */
  findById(
    id: string,
    include?: VariantIncludes
  ): Promise<ProductVariantWithRelations | null>;
  /**
   * Tìm biến thể sản phẩm theo ID với flexible includes
   * @param {string} id - ID của biến thể
   * @param {VariantIncludes} [include] - Tùy chọn include các quan hệ (nếu có product.images)
   * @returns {Promise<ProductVariantWithRelations | null>} - Biến thể với quan hệ hoặc null
   */
  findByIdWithInclude(
    id: string,
    include?: VariantIncludes
  ): Promise<ProductVariantWithRelations | null>;
  /**
   * Tìm biến thể theo mã SKU
   * @param {string} sku - Mã SKU của biến thể
   * @returns {Promise<ProductVariant | null>} - Biến thể hoặc null
   */
  findBySku(sku: string): Promise<ProductVariant | null>;

  findBySkus(skus: string[]): Promise<ProductVariant[]>;

  /**
   * Cập nhật thông tin biến thể
   * @param {string} id - ID của biến thể
   * @param {Prisma.ProductVariantUpdateInput} data - Dữ liệu cập nhật
   * @returns {Promise<ProductVariant>} - Biến thể sau khi cập nhật
   */
  update(
    id: string,
    data: Prisma.ProductVariantUpdateInput
  ): Promise<ProductVariant>;

  /**
   * Tìm nhiều biến thể theo danh sách IDs (batch loading)
   * @param {string[]} ids - Danh sách ID của biến thể
   * @param {VariantIncludes} [include] - Tùy chọn include các quan hệ
   * @returns {Promise<ProductVariantWithRelations[]>} - Danh sách biến thể
   */
  findByIds(
    ids: string[],
    include?: VariantIncludes
  ): Promise<ProductVariantWithRelations[]>;
  /**
   * Xóa mềm biến thể
   * @param {string} id - ID của biến thể
   * @param {string} deletedBy - ID người thực hiện xóa
   * @returns {Promise<void>}
   */
  softDelete(id: string, deletedBy: string): Promise<void>;

  // Query methods
  /**
   * Tìm nhiều biến thể với bộ lọc, phân trang và sắp xếp
   * @param {VariantFilters} filters - Bộ lọc và tham số phân trang
   * @returns {Promise<ProductVariant[]>} - Danh sách biến thể
   */
  findMany(filters: VariantFilters): Promise<ProductVariant[]>;

  // Variant Images Management
  /**
   * Thêm nhiều hình ảnh cho biến thể
   * @param {string} variantId - ID của biến thể
   * @param {Prisma.ProductImageCreateManyInput[]} images - Danh sách hình ảnh cần thêm
   * @param {string} createdBy - ID người tạo
   * @returns {Promise<void>}
   */
  addImages(
    variantId: string,
    images: Prisma.ProductImageCreateManyInput[],
    createdBy: string
  ): Promise<void>;
  /**
   * Xóa mềm nhiều hình ảnh của biến thể
   * @param {string} variantId - ID của biến thể
   * @param {string[]} imageIds - Danh sách ID hình ảnh cần xóa
   * @param {string} deletedBy - ID người thực hiện xóa
   * @returns {Promise<void>}
   */
  removeImages(
    variantId: string,
    imageIds: string[],
    deletedBy: string
  ): Promise<void>;

  // Option Values Management
  /**
   * Đặt giá trị tùy chọn cho biến thể (xóa cũ, thêm mới)
   * @param {string} variantId - ID của biến thể
   * @param {VariantOptionValueMapping[]} optionValueMappings - Danh sách ánh xạ giá trị tùy chọn
   * @param {string} updatedBy - ID người cập nhật
   * @returns {Promise<void>}
   */
  setOptionValues(
    variantId: string,
    optionValueMappings: VariantOptionValueMapping[],
    updatedBy: string
  ): Promise<void>;

  /**
   * Xóa giá trị tùy chọn của biến thể theo option IDs
   * @param {string} variantId - ID của biến thể
   * @param {string[]} optionIds - Danh sách ID tùy chọn cần xóa
   * @param {string} deletedBy - ID người thực hiện xóa
   * @returns {Promise<void>}
   */
  removeOptionValues(
    variantId: string,
    optionIds: string[],
    deletedBy: string
  ): Promise<void>;

  // Bulk operations
  /**
   * Tạo nhiều biến thể cùng lúc
   * @param {Prisma.ProductVariantCreateManyInput[]} variants - Danh sách dữ liệu biến thể
   * @returns {Promise<Prisma.BatchPayload>} - Kết quả batch operation
   */
  createMany(
    variants: Prisma.ProductVariantCreateManyInput[]
  ): Promise<Prisma.BatchPayload>;
  /**
   * Cập nhật nhiều biến thể theo batch
   * @param {BatchUpdateVariantData[]} updates - Danh sách dữ liệu cập nhật
   * @returns {Promise<void>}
   */
  updateMany(updates: BatchUpdateVariantData[]): Promise<void>;

  // Count methods
  /**
   * Đếm tổng số biến thể theo bộ lọc
   * @param {VariantFilters} [filters] - Bộ lọc (tùy chọn)
   * @returns {Promise<number>} - Tổng số biến thể
   */
  count(filters?: VariantFilters): Promise<number>;
}
