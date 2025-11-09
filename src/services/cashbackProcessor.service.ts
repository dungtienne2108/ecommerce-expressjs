import { ethers } from 'ethers';
import { IUnitOfWork } from '../repositories/interfaces/IUnitOfWork';
import { BlockchainService } from './blockchain.service';
import { SmartContractService } from './smartContract.service';
import { CashbackStatus } from '@prisma/client';

/**
 * CashbackProcessorService
 * Processes cashback transactions on blockchain
 */
export class CashbackProcessorService {
  constructor(
    private uow: IUnitOfWork,
    private blockchainService: BlockchainService,
    private smartContractService: SmartContractService
  ) {}

  /**
   * Process pending cashback transactions
   * @param batchSize Number of cashback items to process in one batch
   */
  async processPendingCashback(batchSize: number = 10): Promise<void> {
    try {
      // Get pending cashback records
      const pendingCashbacks = await this.uow.cashbacks.findByStatus('PENDING', batchSize);

      for (const cashback of pendingCashbacks) {
        await this.processCashback(cashback.id);
      }
    } catch (error) {
      console.error('Error processing pending cashbacks:', error);
      throw error;
    }
  }

  /**
   * Process a single cashback transaction
   * @param cashbackId Cashback record ID
   */
  async processCashback(cashbackId: string): Promise<void> {
    return await this.uow.executeInTransaction(async (uow) => {
      try {
        // Get cashback record
        const cashback = await uow.cashbacks.findById(cashbackId);
        if (!cashback) {
          throw new Error(`Cashback record not found: ${cashbackId}`);
        }

        // Check if already processed
        if (cashback.status !== 'PENDING') {
          console.log(`Cashback ${cashbackId} is not in PENDING status`);
          return;
        }

        // Get user wallet address
        const user = await uow.users.findById(cashback.userId);
        if (!user || !user.walletAddress) {
          throw new Error(`User or wallet address not found for cashback ${cashbackId}`);
        }

        // Get network from user's preference
        const networkType = user.preferredNetwork || 'BSC';
        const network = await uow.blockchainNetworks.findByType(networkType);
        if (!network) {
          throw new Error(`Network ${networkType} not found`);
        }

        // Get cashback manager contract
        const cashbackManagerContract = await uow.smartContracts.findByTypeAndNetwork(
          'CASHBACK_MANAGER',
          network.id
        );
        if (!cashbackManagerContract) {
          throw new Error(`Cashback manager contract not found for network ${network.name}`);
        }

        // Create provider and signer
        const provider = new ethers.JsonRpcProvider(network.rpcUrl);
        const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
        if (!privateKey) {
          throw new Error('BLOCKCHAIN_PRIVATE_KEY not configured');
        }
        const signer = new ethers.Wallet(privateKey, provider);

        // Prepare transaction data
        const amount = ethers.parseEther(cashback.amount.toString());
        const campaignId = 1; // Default campaign ID, can be made configurable

        // Update cashback status to PROCESSING
        await uow.cashbacks.update(cashbackId, {
          status: 'PROCESSING' as CashbackStatus,
          processedAt: new Date(),
        });

        // Execute allocateCashback transaction on blockchain
        const contract = this.smartContractService.getContractInstance(
          cashbackManagerContract.address,
          'CASHBACK_MANAGER',
          signer
        );

        const tx = await contract.allocateCashback(user.walletAddress, amount, campaignId);
        const receipt = await tx.wait();

        if (!receipt || receipt.status === 0) {
          throw new Error('Transaction failed on blockchain');
        }

        // Track transaction
        await uow.blockchainTransactions.create({
          txHash: receipt.hash,
          networkId: network.id,
          contractId: cashbackManagerContract.id,
          fromAddress: signer.address,
          toAddress: cashbackManagerContract.address,
          value: amount.toString(),
          status: 'CONFIRMED',
          blockNumber: BigInt(receipt.blockNumber),
          blockHash: receipt.blockHash,
          gasUsed: BigInt(receipt.gasUsed.toString()),
          gasPrice: BigInt(receipt.gasPrice.toString()),
          sentAt: new Date(),
          confirmedAt: new Date(),
        });

        // Update cashback to COMPLETED
        await uow.cashbacks.update(cashbackId, {
          status: 'COMPLETED' as CashbackStatus,
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          completedAt: new Date(),
        });

        console.log(`Cashback ${cashbackId} processed successfully. TxHash: ${receipt.hash}`);
      } catch (error) {
        // Handle error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing cashback ${cashbackId}:`, errorMessage);

        // Update cashback status to FAILED
        await uow.cashbacks.update(cashbackId, {
          status: 'FAILED' as CashbackStatus,
          failureReason: errorMessage,
          failedAt: new Date(),
          retryCount: (await uow.cashbacks.findById(cashbackId))?.retryCount || 0 + 1,
          lastRetryAt: new Date(),
        });

        throw error;
      }
    });
  }

  /**
   * Retry failed cashback transactions
   * @param maxRetries Maximum number of retries
   * @param batchSize Batch size
   */
  async retryFailedCashback(maxRetries: number = 3, batchSize: number = 10): Promise<void> {
    try {
      const failedCashbacks = await this.uow.cashbacks.findByStatusAndRetryCount(
        'FAILED' as CashbackStatus,
        maxRetries,
        batchSize
      );

      for (const cashback of failedCashbacks) {
        try {
          await this.processCashback(cashback.id);
        } catch (error) {
          console.error(`Failed to retry cashback ${cashback.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error retrying failed cashbacks:', error);
      throw error;
    }
  }

  /**
   * Monitor and update cashback transaction status
   * @param txHash Transaction hash
   */
  async monitorTransaction(txHash: string): Promise<void> {
    try {
      const transaction = await this.uow.blockchainTransactions.findByHash(txHash);
      if (!transaction) {
        throw new Error(`Transaction not found: ${txHash}`);
      }

      const network = await this.uow.blockchainNetworks.findById(transaction.networkId);
      if (!network) {
        throw new Error(`Network not found: ${transaction.networkId}`);
      }

      const provider = new ethers.JsonRpcProvider(network.rpcUrl);
      const receipt = await provider.getTransactionReceipt(txHash);

      if (!receipt) {
        console.log(`Transaction ${txHash} not yet confirmed`);
        return;
      }

      // Update transaction status
      await this.uow.blockchainTransactions.update(transaction.id, {
        status: receipt.status === 1 ? 'CONFIRMED' : 'FAILED',
        blockNumber: BigInt(receipt.blockNumber),
        blockHash: receipt.blockHash,
        gasUsed: BigInt(receipt.gasUsed.toString()),
        confirmedAt: new Date(),
      });

      // Find associated cashback and update status
      const cashback = await this.uow.cashbacks.findByTxHash(txHash);
      if (cashback) {
        if (receipt.status === 1) {
          await this.uow.cashbacks.update(cashback.id, {
            status: 'COMPLETED' as CashbackStatus,
            completedAt: new Date(),
          });
        } else {
          await this.uow.cashbacks.update(cashback.id, {
            status: 'FAILED' as CashbackStatus,
            failureReason: 'Transaction failed on blockchain',
            failedAt: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('Error monitoring transaction:', error);
      throw error;
    }
  }

  /**
   * Get cashback statistics
   */
  async getCashbackStats() {
    return await this.uow.cashbacks.getStats();
  }

  /**
   * Get user cashback balance
   * @param userId User ID
   */
  async getUserCashbackBalance(userId: string): Promise<string> {
    try {
      const user = await this.uow.users.findById(userId);
      if (!user || !user.walletAddress) {
        throw new Error('User or wallet address not found');
      }

      const networkType = user.preferredNetwork || 'BSC';
      const network = await this.uow.blockchainNetworks.findByType(networkType);
      if (!network) {
        throw new Error(`Network ${networkType} not found`);
      }

      const cashbackManagerContract = await this.uow.smartContracts.findByTypeAndNetwork(
        'CASHBACK_MANAGER',
        network.id
      );
      if (!cashbackManagerContract) {
        throw new Error('Cashback manager contract not found');
      }

      const provider = new ethers.JsonRpcProvider(network.rpcUrl);
      const balance = await this.smartContractService.callMethod(
        cashbackManagerContract.address,
        'CASHBACK_MANAGER',
        'getClaimableBalance',
        [user.walletAddress],
        provider
      );

      return balance.toString();
    } catch (error) {
      console.error('Error getting user cashback balance:', error);
      throw error;
    }
  }
}
