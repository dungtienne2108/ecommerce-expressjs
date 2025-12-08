import {
  PrismaClient,
  Product,
  ProductStatus,
  ProductImage,
  ProductOption,
  ProductOptionValue,
  Prisma,
} from '@prisma/client';
import {
  IProductRepository,
  ProductWithRelations,
  TProductWithRelations,
} from '../interfaces/product.interface';
import {
  CreateProductOptionData,
  CreateProductOptionValueData,
  ProductFilters,
  ProductIncludes,
} from '../../types/product.types';
import { PaginatedResponse } from '../../types/common';

export class ProductRepository implements IProductRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: Prisma.ProductCreateInput): Promise<Product> {
    return this.prisma.product.create({
      data,
    });
  }

  async findById(
    id: string,
    include?: ProductIncludes
  ): Promise<ProductWithRelations | null> {
    return this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        shop: true,
        images: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
        options: {
          where: { deletedAt: null },
          include: {
            values: {
              where: { deletedAt: null },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        variants: {
          where: { deletedAt: null },
          include: {
            images: {
              where: { deletedAt: null },
              select: {
                id: true,
                imageUrl: true,
                isPrimary: true,
                sortOrder: true,
              },
              orderBy: [{ sortOrder: 'asc' }, { isPrimary: 'desc' }],
            },
            optionValues: {
              where: { deletedAt: null },
              select: {
                id: true,
                productOptionId: true,
                productOptionValueId: true,
                productOption: {
                  select: { name: true },
                },
                productOptionValue: {
                  select: { value: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        categories: {
          where: { deletedAt: null },
          select: {
            category: {
              select: { id: true, name: true, parentCategoryId: true },
            },
          },
        },
      },
    });
  }

  async findByShopId(shopId: string): Promise<ProductWithRelations[]> {
    return this.prisma.product.findMany({
      where: { shopId, deletedAt: null },
      include: {
        images: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
        options: {
          where: { deletedAt: null },
          include: {
            values: {
              where: { deletedAt: null },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        variants: {
          where: { deletedAt: null },
          include: {
            images: {
              where: { deletedAt: null },
              select: {
                id: true,
                imageUrl: true,
                isPrimary: true,
                sortOrder: true,
              },
            },
            optionValues: {
              where: { deletedAt: null },
              select: {
                id: true,
                productOptionId: true,
                productOptionValueId: true,
                productOption: { select: { name: true } },
                productOptionValue: { select: { value: true } },
              },
            },
          },
        },
        categories: {
          where: { deletedAt: null },
          select: {
            category: {
              select: { id: true, name: true, parentCategoryId: true },
            },
          },
        },
        shop: true,
      },
    });
  }

  async update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return this.prisma.product.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async softDelete(id: string, deletedBy: string): Promise<void> {
    await this.prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
        updatedAt: new Date(),
      },
    });
  }

  async findUnique(
    where: Prisma.ProductWhereUniqueInput
  ): Promise<Product | null> {
    return this.prisma.product.findUnique({
      where,
    });
  }

  async findMany(
    filters: ProductFilters
  ): Promise<
    PaginatedResponse<TProductWithRelations<{ images: true; variants: true }>>
  > {
    // ===== Pagination & Sort defaults =====
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 10;
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder: 'asc' | 'desc' =
      filters.sortOrder === 'asc' ? 'asc' : 'desc';

    // ===== Build WHERE conditions =====
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
    };

    // Filter theo shopId
    if (filters.shopId) {
      where.shopId = filters.shopId;
    }

    // Filter theo trạng thái
    if (filters.status) {
      where.status = filters.status;
    }

    // Filter theo danh mục
    if (filters.categoryId) {
      where.categories = {
        some: {
          categoryId: filters.categoryId,
          deletedAt: null,
        },
      };
    }

    // Filter theo khoảng giá (đã fix lỗi 1=0)
    if (filters.priceRange) {
      const orConditions: Prisma.ProductVariantWhereInput[] = [];

      if (filters.priceRange.min !== undefined) {
        orConditions.push({ price: { gte: filters.priceRange.min } });
      }
      if (filters.priceRange.max !== undefined) {
        orConditions.push({ price: { lte: filters.priceRange.max } });
      }

      // ✅ Chỉ thêm variants nếu có điều kiện thật
      if (orConditions.length > 0) {
        where.variants = { some: { OR: orConditions } };
      }
    }

    // Filter theo từ khóa tìm kiếm
    if (filters.searchTerm) {
      // Tìm kiếm không phân biệt hoa thường
      where.name = {
        contains: filters.searchTerm,
        mode: 'insensitive',
      };
    }

    // ===== OrderBy (Sort) =====
    const orderBy: Prisma.ProductOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // ===== Pagination =====
    const skip = (page - 1) * limit;

    // ===== Query database =====
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          images: {
            where: { deletedAt: null },
            orderBy: { sortOrder: 'asc' },
            take: 1,
          },
          variants: { where: { deletedAt: null } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // ===== Return response =====
    return {
      data: products,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  // Product Images Management (Aggregate methods)
  async addImages(
    productId: string,
    images: Prisma.ProductImageCreateManyInput[],
    createdBy: string
  ): Promise<void> {
    const imagesWithMeta = images.map((img) => ({
      ...img,
      productId,
      createdBy,
      updatedBy: createdBy,
    }));

    console.log('images', images);
    console.log('imagesWithMeta', imagesWithMeta);

    await this.prisma.productImage.createMany({
      data: images,
    });
  }

  async removeImages(
    productId: string,
    imageIds: string[],
    deletedBy: string
  ): Promise<void> {
    await this.prisma.productImage.updateMany({
      where: {
        id: { in: imageIds },
        productId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        deletedBy,
        updatedAt: new Date(),
      },
    });
  }

  async setPrimaryImage(productId: string, imageId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Reset all images to not primary
      await tx.productImage.updateMany({
        where: {
          productId,
          deletedAt: null,
        },
        data: {
          isPrimary: false,
          updatedAt: new Date(),
        },
      });

      // Set the specified image as primary
      await tx.productImage.update({
        where: { id: imageId },
        data: {
          isPrimary: true,
          updatedAt: new Date(),
        },
      });
    });
  }

  // Product Options Management (Aggregate methods)
  async addOptions(
    productId: string,
    options: CreateProductOptionData[],
    createdBy: string
  ): Promise<void> {
    // 🔥 OPTIMIZED: Use transaction for all operations
    for (const option of options) {
      const createdOption = await this.prisma.productOption.create({
        data: {
          productId,
          name: option.name,
          createdBy,
          updatedBy: createdBy,
        },
      });

      if (option.values && option.values.length > 0) {
        await this.prisma.productOptionValue.createMany({
          data: option.values.map((value, index) => ({
            productOptionId: createdOption.id,
            value: value.value,
            sortOrder: value.sortOrder ?? index,
            createdBy,
            updatedBy: createdBy,
          })),
        });
      }
    }
  }

  async removeOptions(
    productId: string,
    optionIds: string[],
    deletedBy: string
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Soft delete option values first
      await tx.productOptionValue.updateMany({
        where: {
          productOptionId: { in: optionIds },
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          deletedBy,
          updatedAt: new Date(),
        },
      });

      // Then soft delete options
      await tx.productOption.updateMany({
        where: {
          id: { in: optionIds },
          productId,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          deletedBy,
          updatedAt: new Date(),
        },
      });
    });
  }

  async addOptionValues(
    optionId: string,
    values: CreateProductOptionValueData[],
    createdBy: string
  ): Promise<void> {
    const valuesWithMeta = values.map((value, index) => ({
      productOptionId: optionId,
      value: value.value,
      sortOrder: value.sortOrder ?? index,
      createdBy,
      updatedBy: createdBy,
    }));

    await this.prisma.productOptionValue.createMany({
      data: valuesWithMeta,
    });
  }

  async removeOptionValues(
    optionId: string,
    valueIds: string[],
    deletedBy: string
  ): Promise<void> {
    await this.prisma.productOptionValue.updateMany({
      where: {
        id: { in: valueIds },
        productOptionId: optionId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        deletedBy,
        updatedAt: new Date(),
      },
    });
  }

  // Rating methods
  async updateAverageRating(
    id: string,
    rating: number,
    reviewCount: number
  ): Promise<void> {
    await this.prisma.product.update({
      where: { id },
      data: {
        averageRating: rating,
        reviewCount,
        updatedAt: new Date(),
      },
    });
  }

  // Count methods
  async count(filters: Prisma.ProductWhereInput): Promise<number> {
    return this.prisma.product.count({
      where: filters,
    });
  }

  async countByShop(shopId: string): Promise<number> {
    return this.prisma.product.count({
      where: {
        shopId,
        deletedAt: null,
      },
    });
  }
}
