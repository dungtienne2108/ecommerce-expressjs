import { UserStatus, Prisma, Gender, RoleType } from '@prisma/client';
import { IUnitOfWork } from '../repositories/interfaces/uow.interface';
import { PasswordUtils } from '../utils/password.util';
import { DateUtils } from '../utils/date.util';
import {
  CreateUserInput,
  UpdateUserInput,
  UserSearchFilters,
  UserStatistics,
  UserQueryOptions,
} from '../types/user.types';
import { PaginatedResponse } from '../types/common';
import {
  EmailExistsError,
  PhoneExistsError,
  UserNotFoundError,
} from '../errors/AppError';
import redis from '../config/redis';
import { CacheUtil } from '../utils/cache.util';
import { UserResponse } from '../types/auth.types';

export class UserService {
  constructor(private uow: IUnitOfWork) {}

  /**
   * Remove sensitive data from user object
   */
  private excludeSensitiveData(user: any): UserResponse {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Build where clause for user queries - BUSINESS LOGIC Ở SERVICE
   */
  private buildWhereClause(
    filters?: Partial<UserSearchFilters>,
    includeDeleted = false
  ): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};

    // Soft delete
    if (!includeDeleted) where.deletedAt = null;

    if (!filters) return where;

    // --- Search ---
    const q = (filters.search ?? '').trim();
    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phoneNumber: { contains: q } }, // phone: không cần mode
      ];
    }

    // --- Status ---
    if (filters.status !== undefined) {
      if (
        Array.isArray(filters.status) &&
        (filters.status as any[]).length > 0
      ) {
        where.status = { in: filters.status as UserStatus[] };
      } else {
        where.status = filters.status as UserStatus;
      }
    }

    // --- Gender ---
    if (filters.gender !== undefined) {
      if (
        Array.isArray(filters.gender) &&
        (filters.gender as any[]).length > 0
      ) {
        where.gender = { in: filters.gender as Gender[] };
      } else {
        where.gender = filters.gender as Gender;
      }
    }

    // --- Age range (birthday from years) ---
    if (filters.ageFrom !== undefined || filters.ageTo !== undefined) {
      const now = DateUtils.now();

      // Validate now date first
      if (isNaN(now.getTime())) {
        console.error('DateUtils.now() returned invalid date');
        return where;
      }

      const birthday: Prisma.DateTimeNullableFilter = {};

      if (filters.ageFrom !== undefined) {
        // Validate ageFrom is valid number
        const ageFromNum = Number(filters.ageFrom);
        if (!isNaN(ageFromNum) && ageFromNum >= 0 && ageFromNum <= 150) {
          try {
            birthday.lte = DateUtils.subtractYears(now, ageFromNum);
          } catch (error) {
            console.error('Error creating maxBirthday:', error);
          }
        }
      }

      if (filters.ageTo !== undefined) {
        const ageToNum = Number(filters.ageTo);
        if (!isNaN(ageToNum) && ageToNum >= 0 && ageToNum <= 150) {
          try {
            birthday.gte = DateUtils.subtractYears(now, ageToNum + 1);
          } catch (error) {
            console.error('Error creating minBirthday:', error);
          }
        }
      }

      if (Object.keys(birthday).length > 0) where.birthday = birthday;
    }

    // --- CreatedAt range ---
    const createdAt: Prisma.DateTimeFilter = {};
    if (filters.createdFrom) {
      const from =
        filters.createdFrom instanceof Date
          ? filters.createdFrom
          : new Date(filters.createdFrom);
      if (!isNaN(from.getTime())) createdAt.gte = from;
    }
    if (filters.createdTo) {
      const to =
        filters.createdTo instanceof Date
          ? filters.createdTo
          : new Date(filters.createdTo);
      if (!isNaN(to.getTime())) createdAt.lte = to;
    }
    if (Object.keys(createdAt).length > 0) where.createdAt = createdAt;

    return where;
  }

  /**
   * Create a new user
   */
  async createUser(
    data: CreateUserInput,
    createdBy?: string
  ): Promise<UserResponse> {
    return await this.uow.executeInTransaction(async (uow) => {
      // kiem tra email
      const existingEmail = await uow.users.findFirst({
        email: data.email.toLowerCase(),
        deletedAt: null,
      });
      if (existingEmail) {
        throw new EmailExistsError();
      }

      // kiem tra sdt
      if (data.phoneNumber) {
        const existingPhone = await uow.users.findFirst({
          phoneNumber: data.phoneNumber,
          deletedAt: null,
        });
        if (existingPhone) {
          throw new PhoneExistsError();
        }
      }

      // kiem tra mat khau
      const hashedPassword = await PasswordUtils.hash(data.password);

      //
      const user = await uow.users.create({
        email: data.email.toLowerCase(),
        identityCard: data.identityCard || null,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber || null,
        address: data.address || null,
        birthday: data.birthday || null,
        gender: data.gender || null,
        avatarUrl: null,
        status: UserStatus.ACTIVE,
        roles: {
          create: [
            {
              role: {
                connect: { type: RoleType.CUSTOMER },
              },
              createdBy: 'system',
            },
          ],
        },
      });

      // Invalidate cache
      // await this.invalidateUserCache();

      return this.excludeSensitiveData(user);
    });
  }

  /**
   * Get user by ID with options
   */
  async getUserById(
    id: string,
    options?: UserQueryOptions
  ): Promise<UserResponse | null> {
    // Kiểm tra cache trước
    const cacheKey = CacheUtil.userById(id);
    const cachedUser = await redis.get(cacheKey);
    if (cachedUser) {
      return JSON.parse(cachedUser);
    }

    // Business logic: xử lý options
    const where: Prisma.UserWhereInput = options?.includeDeleted
      ? { id }
      : { id, deletedAt: null };

    let user;
    if (options?.include) {
      user = await this.uow.users.findFirst(where, options.include);
    } else {
      user = await this.uow.users.findFirst(where);
    }

    if (!user) {
      return null;
    }

    const userResponse = this.excludeSensitiveData(user);

    // Lưu vào cache 1 giờ
    await redis.set(cacheKey, JSON.stringify(userResponse), 3600);

    return userResponse;
  }

  /**
   * Update user with business validation
   */
  async updateUser(
    id: string,
    data: UpdateUserInput,
    updatedBy?: string
  ): Promise<UserResponse> {
    return await this.uow.executeInTransaction(async (uow) => {
      // Business rule: User must exist
      const existingUser = await uow.users.findFirst({ id, deletedAt: null });
      if (!existingUser) {
        throw new UserNotFoundError();
      }

      // Business rule: Email uniqueness
      if (data.email && data.email !== existingUser.email) {
        const emailExists = await uow.users.findFirst({
          email: data.email.toLowerCase(),
          deletedAt: null,
          id: { not: id },
        });
        if (emailExists) {
          throw new EmailExistsError();
        }
      }

      // Business rule: Phone uniqueness
      if (data.phoneNumber && data.phoneNumber !== existingUser.phoneNumber) {
        const phoneExists = await uow.users.findFirst({
          phoneNumber: data.phoneNumber,
          deletedAt: null,
          id: { not: id },
        });
        if (phoneExists) {
          throw new PhoneExistsError();
        }
      }

      const updateData: Prisma.UserUpdateInput = {
        updatedAt: DateUtils.now(),
        updatedBy: existingUser.id,
      };

      if (data.email) updateData.email = data.email.toLowerCase();
      if (data.firstName) updateData.firstName = data.firstName;
      if (data.lastName) updateData.lastName = data.lastName;
      if (data.phoneNumber !== undefined)
        updateData.phoneNumber = data.phoneNumber || null;
      if (data.address !== undefined) updateData.address = data.address || null;
      if (data.birthday !== undefined)
        updateData.birthday = data.birthday || null;
      if (data.gender !== undefined) updateData.gender = data.gender || null;
      if (data.avatarUrl !== undefined)
        updateData.avatarUrl = data.avatarUrl || null;
      if (data.status) updateData.status = data.status;

      const updatedUser = await uow.users.update({ id }, updateData);

      // Invalidate cache
      await this.invalidateUserCache(id);

      return this.excludeSensitiveData(updatedUser);
    });
  }

  /**
   * Get users with pagination and filtering - TẤT CẢ LOGIC Ở SERVICE
   */
  async getUsers(
    filters?: UserSearchFilters
  ): Promise<PaginatedResponse<UserResponse>> {
    // Tạo cache key từ filters
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(100, Math.max(1, filters?.limit || 10));
    const cacheKey = CacheUtil.usersByFilters({ ...filters, page, limit });

    // Kiểm tra cache
    const cachedResult = await redis.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    // Business logic: Default values và validation
    const skip = (page - 1) * limit;
    const sortBy = filters?.sortBy || 'createdAt';
    const sortOrder = filters?.sortOrder || 'desc';

    // Business logic: Build complex where clause
    const where = this.buildWhereClause(filters);

    // Repository calls với Prisma args thuần
    const [total, users] = await Promise.all([
      this.uow.users.count(where),
      this.uow.users.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    // Business logic: Calculate pagination
    const totalPages = Math.ceil(total / limit);

    const result = {
      data: users.map((user) => this.excludeSensitiveData(user)),
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };

    // Lưu vào cache 10 phút
    await redis.set(cacheKey, JSON.stringify(result), 600);

    return result;
  }

  /**
   * Soft delete user
   */
  async deleteUser(id: string, deletedBy?: string): Promise<void> {
    const user = await this.uow.users.findFirst({ id, deletedAt: null });
    if (!user) {
      throw new UserNotFoundError();
    }

    await this.uow.users.update(
      { id },
      {
        deletedAt: DateUtils.now(),
        ...(deletedBy ? { deletedByUser: { connect: { id: deletedBy } } } : {}),
        status: UserStatus.INACTIVE,
      }
    );

    // Invalidate cache
    await this.invalidateUserCache(id);
  }

  /**
   * Get user statistics - COMPLEX BUSINESS LOGIC
   */
  async getUserStatistics(): Promise<UserStatistics> {
    // Kiểm tra cache trước
    const cacheKey = CacheUtil.userStatistics();
    const cachedStats = await redis.get(cacheKey);
    if (cachedStats) {
      return JSON.parse(cachedStats);
    }

    const now = DateUtils.now();
    const today = DateUtils.startOfDay(now);
    const thisWeek = DateUtils.startOfWeek(now);
    const thisMonth = DateUtils.startOfMonth(now);
    const thisYear = DateUtils.startOfYear(now);

    const baseWhere = { deletedAt: null };

    const [
      total,
      statusCounts,
      genderCounts,
      createdToday,
      createdThisWeek,
      createdThisMonth,
      createdThisYear,
      usersWithBirthday,
    ] = await Promise.all([
      this.uow.users.count(baseWhere),

      this.uow.users.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { id: true },
      }),

      this.uow.users.groupBy({
        by: ['gender'],
        where: { ...baseWhere, gender: { not: null } },
        _count: { id: true },
      }),

      this.uow.users.count({ ...baseWhere, createdAt: { gte: today } }),
      this.uow.users.count({ ...baseWhere, createdAt: { gte: thisWeek } }),
      this.uow.users.count({ ...baseWhere, createdAt: { gte: thisMonth } }),
      this.uow.users.count({ ...baseWhere, createdAt: { gte: thisYear } }),

      this.uow.users.findMany({
        where: { ...baseWhere, birthday: { not: null } },
        select: { birthday: true },
      }),
    ]);

    // Process status statistics - use proper type casting
    const byStatus = Object.values(UserStatus).reduce(
      (acc, status) => {
        const statusGroup = statusCounts.find(
          (s) => (s as any).status === status
        );
        acc[status] = (statusGroup as any)?._count?.id ?? 0;
        return acc;
      },
      {} as Record<UserStatus, number>
    );

    // Process gender statistics - use proper type casting
    const byGender = Object.values(Gender).reduce(
      (acc, gender) => {
        const genderGroup = genderCounts.find(
          (g) => (g as any).gender === gender
        );
        acc[gender] = (genderGroup as any)?._count?.id ?? 0;
        return acc;
      },
      {} as Record<Gender, number>
    );

    // Calculate average age with better logic
    let averageAge: number | undefined = 0;
    if (usersWithBirthday.length > 0) {
      const totalAge = usersWithBirthday.reduce((sum, user) => {
        if (!user.birthday) return sum;
        return sum + DateUtils.calculateAge(user.birthday);
      }, 0);
      averageAge = Math.round(totalAge / usersWithBirthday.length);
    }

    const stats = {
      total,
      byStatus,
      byGender,
      createdToday,
      createdThisWeek,
      createdThisMonth,
      createdThisYear,
      averageAge,
    };

    // Lưu vào cache 1 giờ
    await redis.set(cacheKey, JSON.stringify(stats), 3600);

    return stats;
  }

  /**
   * Bulk operations
   */
  async bulkUpdateUserStatus(
    userIds: string[],
    status: UserStatus,
    updatedBy?: string
  ): Promise<number> {
    const result = await this.uow.users.updateMany(
      { id: { in: userIds }, deletedAt: null },
      {
        status,
        ...(updatedBy ? { updatedByUser: { connect: { id: updatedBy } } } : {}),
      }
    );

    // Invalidate cache cho tất cả users đó
    await this.invalidateUserCache();

    return result.count;
  }

  async bulkDeleteUsers(
    userIds: string[],
    deletedBy?: string
  ): Promise<number> {
    const result = await this.uow.users.updateMany(
      { id: { in: userIds }, deletedAt: null },
      {
        deletedAt: DateUtils.now(),
        ...(deletedBy ? { deletedByUser: { connect: { id: deletedBy } } } : {}),
        status: UserStatus.INACTIVE,
      }
    );

    // Invalidate cache
    await this.invalidateUserCache();

    return result.count;
  }

  // ==================== PRIVATE METHODS ====================
  /**
   * Invalidate cache liên quan đến user
   */
  private async invalidateUserCache(userId?: string): Promise<void> {
    try {
      if (userId) {
        await redis.del(CacheUtil.userById(userId));
      }

      // Xóa tất cả user list caches
      for (let page = 1; page <= 100; page++) {
        await redis.del(CacheUtil.userList(page, 10));
        await redis.del(CacheUtil.userList(page, 20));
        await redis.del(CacheUtil.userList(page, 50));
      }

      // Xóa user statistics
      await redis.del(CacheUtil.userStatistics());

      // Xóa tất cả cached users filters
      // Vì không thể lặp qua tất cả filter combinations, chỉ xóa những pattern chính
    } catch (error) {
      console.error('Error invalidating user cache:', error);
    }
  }
}
