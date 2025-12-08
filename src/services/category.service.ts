import redis from "../config/redis";
import { IUnitOfWork } from "../repositories/interfaces/uow.interface";
import { CategoryResponse } from "../types/category.types";
import { CacheUtil } from "../utils/cache.util";

export class CategoryService {
  constructor(private uow: IUnitOfWork) { }

  async getAll(): Promise<CategoryResponse[]> {
    const cacheKey = CacheUtil.categoriesAll();
    const cacheResult = await redis.get(cacheKey);
    if (cacheResult) {
      return JSON.parse(cacheResult);
    }

    const categories = await this.uow.categories.findAll();
    const result = categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description ?? '',
    }));
    await redis.set(cacheKey, JSON.stringify(result), 600);
    return result;
  }

  async getCategories(name?: string): Promise<CategoryResponse[]> {
    const cacheKey = CacheUtil.categoriesByName(name || '');
    const cacheResult = await redis.get(cacheKey);
    if (cacheResult) {
      return JSON.parse(cacheResult);
    }

    const categories = await this.uow.categories.searchByName(name || '');
    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description ?? '',
    }));
  }
}
