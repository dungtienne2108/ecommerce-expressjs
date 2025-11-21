import { CashbackStatus } from '@prisma/client';
import { NotFoundError, ValidationError } from '../errors/AppError';
import { IUnitOfWork } from '../repositories/interfaces/uow.interface';
import { ethers } from 'ethers';
import Web3Service from './web3.service';
import redis from '../config/redis';
import { CacheUtil } from '../utils/cache.util';

export interface Web3CashbackResult {
  success: boolean;
  cashbackId?: string;
  txHash?: string;
  blockNumber?: number;
  amount?: string;
  message: string;
  error?: string;
}

export interface CashbackProcessingResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  results: Web3CashbackResult[];
}

/**
 * Web3CashbackService
 * Xử lý tích hợp cashback với blockchain (Web3)
 * Kết hợp xử lý DB (cashback repository) với Web3Service
 */
export class Web3CashbackService {
  private web3Service: Web3Service;

  constructor(private uow: IUnitOfWork) {
    this.web3Service = new Web3Service();
  }

  /**
   * Xử lý gửi cashback lên blockchain và cập nhật DB
   * @param cashbackId
   * @returns
   */
  async processCashbackToWeb3(cashbackId: string): Promise<Web3CashbackResult> {
    return this.uow.executeInTransaction(async (uow) => {
      try {
        // Lấy thông tin cashback từ DB
        const cashback = await uow.cashbacks.findById(cashbackId, {
          user: true,
          payment: true,
          order: true,
        });
        console.log('🔄 Cashback:', cashback);
        if (!cashback) {
          throw new NotFoundError('Cashback không tồn tại');
        }

        // Kiểm tra điều kiện xử lý
        if (cashback.status !== CashbackStatus.PENDING) {
          throw new ValidationError(
            `Cashback ở trạng thái ${cashback.status}, không thể xử lý`
          );
        }

        if (cashback.eligibleAt && cashback.eligibleAt > new Date()) {
          throw new ValidationError('Cashback chưa đến thời gian xử lý');
        }

        if (cashback.expiresAt && cashback.expiresAt < new Date()) {
          throw new ValidationError('Cashback đã hết hạn');
        }

        // Kiểm tra wallet address
        if (!cashback.walletAddress) {
          throw new ValidationError('Ví người dùng không tồn tại');
        }

        console.log('🔄 Cập nhật status sang PROCESSING');
        // Cập nhật status sang PROCESSING
        await uow.cashbacks.updateStatus(
          cashbackId,
          CashbackStatus.PROCESSING,
          {
            processedAt: new Date(),
          }
        );
        console.log('🔄 Cập nhật status sang PROCESSING thành công');

        console.log('🔄 Gửi transaction lên blockchain');
        // Gửi transaction lên blockchain
        const amountInWei = ethers.parseEther(cashback.amount.toString());
        console.log('🔄 Amount in wei:', amountInWei);
        const txResult = await this.web3Service.processPaymentWithCashback(
          cashback.walletAddress,
          amountInWei
        );
        console.log('🔄 Gửi transaction lên blockchain thành công');
        if (!txResult.success) {
          throw new Error(txResult.error || 'Gửi cashback thất bại');
        }
        console.log('🔄 Validate transaction trên blockchain');
        // Validate transaction trên blockchain
        const validation = await this.web3Service.validateTransaction(
          txResult.txHash!
        );
        console.log('🔄 Validate transaction trên blockchain thành công');
        if (!validation.confirmed) {
          throw new Error('Transaction chưa được xác nhận trên blockchain');
        }
        console.log('🔄 Cập nhật status COMPLETED với thông tin transaction');
        // Cập nhật status COMPLETED với thông tin transaction
        const updateData: any = {
          completedAt: new Date(),
        };
        if (txResult.txHash) updateData.txHash = txResult.txHash;
        if (txResult.blockNumber) updateData.blockNumber = txResult.blockNumber;

        await uow.cashbacks.updateStatus(
          cashbackId,
          CashbackStatus.COMPLETED,
          updateData
        );
        console.log(
          '🔄 Cập nhật status COMPLETED với thông tin transaction thành công'
        );
        // Invalidate cache
        // await this.invalidateCashbackCache(cashbackId, cashback.userId);

        // Auto claim cashback for user

        console.log('💰 Bắt đầu auto claim cashback cho user...');

        try {
          const claimResult = await this.web3Service.claimCashbackForUser(
            cashback.walletAddress
          );

          if (claimResult.success) {
            console.log(`✅ Auto claim thành công: ${claimResult.txHash}`);

            // Update claimTxHash to database
          } else {
            console.log(
              `⚠️ Auto claim thất bại: ${claimResult.error || claimResult.message}`
            );

            // Không throw error, cashback vẫn COMPLETED, user có thể claim manual sau
          }
        } catch (claimError: any) {
          console.error('⚠️ Lỗi auto claim:', claimError.message);

          // Không throw error, cashback vẫn COMPLETED
        }

        console.log('🔄 Invalidate cache thành công');
        return {
          success: true,
          cashbackId,
          txHash: txResult.txHash,
          blockNumber: txResult.blockNumber,
          amount: txResult.cashbackAmount,
          message: txResult.message || 'Cashback đã được gửi thành công',
        } as any as Web3CashbackResult;
      } catch (error: any) {
        // Cập nhật status FAILED với thông tin lỗi
        await uow.cashbacks.updateStatus(cashbackId, CashbackStatus.FAILED, {
          failedAt: new Date(),
          failureReason: error.message,
        });
        console.log('🔄 Cập nhật status FAILED với thông tin lỗi thành công');
        // Increment retry count
        await uow.cashbacks.incrementRetryCount(cashbackId);
        console.log('🔄 Increment retry count thành công');
        // Invalidate cache
        try {
          const cashback = await uow.cashbacks.findById(cashbackId);
          if (cashback) {
            // await this.invalidateCashbackCache(cashbackId, cashback.userId);
          }
        } catch (cacheError) {
          console.error('Error invalidating cache:', cacheError);
        }
        console.log('🔄 Invalidate cache thành công');
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.log('🔄 Return error');
        return {
          success: false,
          cashbackId,
          message: `Gửi cashback thất bại: ${errorMessage}`,
          error: errorMessage,
        };
      }
    });
  }

  /**
   * Xử lý hàng loạt cashback PENDING
   * @param limit
   * @returns
   */
  async processPendingCashbacksToWeb3(
    limit: number = 50
  ): Promise<CashbackProcessingResult> {
    const results: Web3CashbackResult[] = [];
    let successful = 0;
    let failed = 0;

    try {
      // Lấy danh sách cashback pending và đủ điều kiện
      const pendingCashbacks =
        await this.uow.cashbacks.findPendingCashbacks(limit);

      console.log(
        `🔄 Bắt đầu xử lý ${pendingCashbacks.length} cashback đang pending`
      );

      for (const cashback of pendingCashbacks) {
        try {
          const result = await this.processCashbackToWeb3(cashback.id);
          results.push(result);

          if (result.success) {
            successful++;
            console.log(
              `✅ Cashback ${cashback.id} xử lý thành công: ${result.txHash}`
            );
          } else {
            failed++;
            console.log(`❌ Cashback ${cashback.id} xử lý thất bại`);
          }
        } catch (error: any) {
          failed++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          results.push({
            success: false,
            cashbackId: cashback.id,
            message: `Lỗi xử lý: ${errorMessage}`,
            error: errorMessage,
          });
          console.error(`❌ Lỗi xử lý cashback ${cashback.id}:`, error);
        }
      }
    } catch (error: any) {
      console.error('❌ Lỗi xử lý hàng loạt cashback:', error);
    }

    return {
      totalProcessed: results.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Manual claim cashback cho user (có kiểm tra quyền)
   * @param cashbackId
   * @param userId - User yêu cầu claim (để check quyền)
   * @returns
   */
  async claimCashbackForUser(
    cashbackId: string,
    userId: string
  ): Promise<Web3CashbackResult> {
    return this.uow.executeInTransaction(async (uow) => {
      try {
        // Lấy thông tin cashback
        const cashback = await uow.cashbacks.findById(cashbackId, {
          user: true,
        });

        if (!cashback) {
          throw new NotFoundError('Cashback không tồn tại');
        }

        // Kiểm tra quyền: chỉ cho phép user sở hữu hoặc admin
        const userRoles = await uow.userRoles.findByUserIdWithRoles(userId);
        const isAdmin = userRoles.some((r) => r.role.type === 'SYSTEM_ADMIN');

        if (cashback.userId !== userId && !isAdmin) {
          throw new ValidationError('Bạn không có quyền claim cashback này');
        }

        // Kiểm tra trạng thái
        if (cashback.status !== CashbackStatus.COMPLETED) {
          throw new ValidationError(
            `Cashback ở trạng thái ${cashback.status}, chỉ có thể claim khi COMPLETED`
          );
        }

        if (!cashback.walletAddress) {
          throw new ValidationError('Ví người dùng không tồn tại');
        }

        console.log(`💰 Claim cashback ${cashbackId} cho user: ${cashback.walletAddress}`);

        // Gọi Web3Service để claim
        const claimResult = await this.web3Service.claimCashbackForUser(
          cashback.walletAddress
        );

        if (!claimResult.success) {
          throw new Error(claimResult.error || 'Claim cashback thất bại');
        }

        // TODO: Update claimTxHash nếu cần
        // await uow.cashbacks.update(cashbackId, {
        //   claimTxHash: claimResult.txHash,
        //   claimedAt: new Date(),
        // });

        console.log(`✅ Claim cashback thành công: ${claimResult.txHash}`);

        return {
          success: true,
          cashbackId,
          txHash: claimResult.txHash || '',
          blockNumber: claimResult.blockNumber || 0,
          amount: claimResult.cashbackAmount || '',
          message: `Claim thành công ${claimResult.cashbackAmount} CASH tokens`,
        };
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('❌ Lỗi claim cashback:', errorMessage);
        return {
          success: false,
          cashbackId,
          message: `Claim cashback thất bại: ${errorMessage}`,
          error: errorMessage,
        };
      }
    });
  }

  /**
   * Retry cashback failed và gửi lại lên blockchain
   * @param maxRetries
   * @returns
   */
  async retryFailedCashbacksToWeb3(
    maxRetries: number = 3
  ): Promise<CashbackProcessingResult> {
    const results: Web3CashbackResult[] = [];
    let successful = 0;
    let failed = 0;

    try {
      // Lấy danh sách cashback FAILED chưa vượt quá max retries
      const failedCashbacks =
        await this.uow.cashbacks.findFailedCashbacksForRetry(maxRetries);

      console.log(
        `🔄 Bắt đầu retry ${failedCashbacks.length} cashback đã thất bại`
      );

      for (const cashback of failedCashbacks) {
        try {
          // Reset status về PENDING để xử lý lại
          await this.uow.cashbacks.updateStatus(
            cashback.id,
            CashbackStatus.PENDING
          );

          const result = await this.processCashbackToWeb3(cashback.id);
          results.push(result);

          if (result.success) {
            successful++;
            console.log(
              `✅ Retry cashback ${cashback.id} thành công: ${result.txHash}`
            );
          } else {
            failed++;
            console.log(`❌ Retry cashback ${cashback.id} thất bại`);
          }
        } catch (error: any) {
          failed++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          results.push({
            success: false,
            cashbackId: cashback.id,
            message: `Retry thất bại: ${errorMessage}`,
            error: errorMessage,
          });
          console.error(`❌ Lỗi retry cashback ${cashback.id}:`, error);
        }
      }
    } catch (error: any) {
      console.error('❌ Lỗi retry hàng loạt cashback:', error);
    }

    return {
      totalProcessed: results.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Kiểm tra và xử lý cashback đã hết hạn
   * @returns số lượng cashback đã hủy
   */
  async handleExpiredCashbacks(): Promise<number> {
    try {
      const expiredCashbacks = await this.uow.cashbacks.findExpiredCashbacks();

      console.log(
        `⚠️  Tìm thấy ${expiredCashbacks.length} cashback đã hết hạn`
      );

      let cancelledCount = 0;
      for (const cashback of expiredCashbacks) {
        try {
          await this.uow.cashbacks.updateStatus(
            cashback.id,
            CashbackStatus.CANCELLED,
            {
              failedAt: new Date(),
              failureReason: 'Cashback đã hết hạn',
            }
          );

          // Invalidate cache
          await this.invalidateCashbackCache(cashback.id, cashback.userId);

          cancelledCount++;
          console.log(`✅ Hủy cashback đã hết hạn: ${cashback.id}`);
        } catch (error) {
          console.error(`❌ Lỗi hủy cashback ${cashback.id}:`, error);
        }
      }

      return cancelledCount;
    } catch (error) {
      console.error('❌ Lỗi xử lý cashback hết hạn:', error);
      return 0;
    }
  }

  /**
   * Verify transaction trên blockchain
   * @param cashbackId
   * @returns
   */
  async verifyCashbackOnBlockchain(cashbackId: string): Promise<boolean> {
    try {
      const cashback = await this.uow.cashbacks.findById(cashbackId);
      if (!cashback) {
        throw new NotFoundError('Cashback không tồn tại');
      }

      if (!cashback.txHash) {
        throw new ValidationError('Cashback chưa có transaction hash');
      }

      // Verify transaction trên blockchain
      const validation = await this.web3Service.validateTransaction(
        cashback.txHash
      );

      if (validation.confirmed && validation.status === 'Success') {
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Lỗi verify transaction:', error);
      return false;
    }
  }

  /**
   * Lấy thông tin cashback kèm tình trạng trên blockchain
   * @param cashbackId
   * @returns
   */
  async getCashbackWithBlockchainStatus(cashbackId: string) {
    try {
      // Kiểm tra cache trước
      const cacheKey = `cashback:blockchain:${cashbackId}`;
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      const cashback = await this.uow.cashbacks.findById(cashbackId, {
        user: true,
        payment: true,
        order: true,
      });

      if (!cashback) {
        throw new NotFoundError('Cashback không tồn tại');
      }

      let blockchainStatus = null;
      if (cashback.txHash) {
        blockchainStatus = await this.web3Service.validateTransaction(
          cashback.txHash
        );
      }

      // Lấy thông tin merchant từ blockchain
      let merchantInfo = null;
      try {
        merchantInfo = await this.web3Service.getMerchantInfo();
      } catch (error) {
        console.error('Lỗi lấy merchant info:', error);
      }

      const result = {
        cashback,
        blockchainStatus,
        merchantInfo,
      };

      // Lưu vào cache 15 phút
      await redis.set(cacheKey, JSON.stringify(result), 900);

      return result;
    } catch (error) {
      console.error('❌ Lỗi lấy thông tin cashback:', error);
      throw error;
    }
  }

  /**
   * Lấy user balance từ blockchain
   * @param walletAddress
   * @returns
   */
  async getUserTokenBalance(walletAddress: string): Promise<string> {
    try {
      const balance = await this.web3Service.getUserTokenBalance(walletAddress);
      return balance;
    } catch (error) {
      console.error('❌ Lỗi lấy user balance:', error);
      throw error;
    }
  }

  /**
   * Thống kê cashback kèm thông tin blockchain
   * @param filters
   * @returns
   */
  async getCashbackStatisticsWithBlockchain(filters?: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: CashbackStatus;
  }) {
    try {
      const cacheKey = 'cashback:statistics:blockchain';
      const cachedStats = await redis.get(cacheKey);
      if (cachedStats) {
        return JSON.parse(cachedStats);
      }

      const where: any = {
        ...(filters?.userId && { userId: filters.userId }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.startDate && {
          createdAt: { gte: filters.startDate },
        }),
        ...(filters?.endDate && {
          createdAt: { ...{ lte: filters.endDate } },
        }),
      };

      // Lấy thống kê từ DB
      const [totalAmount, totalCount, completedAmount] = await Promise.all([
        this.uow.cashbacks.sumAmount(where),
        this.uow.cashbacks.count(where),
        this.uow.cashbacks.sumAmount({
          ...where,
          status: CashbackStatus.COMPLETED,
        }),
      ]);

      // Lấy merchant info từ blockchain
      let merchantInfo = null;
      try {
        merchantInfo = await this.web3Service.getMerchantInfo();
      } catch (error) {
        console.error('Lỗi lấy merchant info:', error);
      }

      const stats = {
        database: {
          totalAmount,
          totalCount,
          completedAmount,
          averageAmount: totalCount > 0 ? totalAmount / totalCount : 0,
          pendingCount: await this.uow.cashbacks.count({
            ...where,
            status: CashbackStatus.PENDING,
          }),
          failedCount: await this.uow.cashbacks.count({
            ...where,
            status: CashbackStatus.FAILED,
          }),
          processingCount: await this.uow.cashbacks.count({
            ...where,
            status: CashbackStatus.PROCESSING,
          }),
        },
        blockchain: merchantInfo,
      };

      // Lưu vào cache 1 giờ
      await redis.set(cacheKey, JSON.stringify(stats), 3600);

      return stats;
    } catch (error) {
      console.error('❌ Lỗi thống kê cashback:', error);
      throw error;
    }
  }

  /**
   * Invalidate cashback cache
   * @private
   */
  private async invalidateCashbackCache(
    cashbackId?: string,
    userId?: string
  ): Promise<void> {
    try {
      if (cashbackId) {
        await redis.del(CacheUtil.cashbackById(cashbackId));
        await redis.del(`cashback:blockchain:${cashbackId}`);
      }

      if (userId) {
        for (let page = 1; page <= 50; page++) {
          await redis.del(CacheUtil.userCashbacks(userId, page, 10));
          await redis.del(CacheUtil.userCashbacks(userId, page, 20));
          await redis.del(CacheUtil.userCashbacks(userId, page, 50));
        }
      }

      await redis.del(CacheUtil.cashbackStatistics());
      await redis.del('cashback:statistics:blockchain');
    } catch (error) {
      console.error('❌ Lỗi invalidate cache:', error);
    }
  }
}
