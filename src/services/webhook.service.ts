import { ethers } from 'ethers';
import { IUnitOfWork } from '../repositories/interfaces/IUnitOfWork';

/**
 * WebhookService
 * Monitors blockchain events and handles webhook processing
 */
export class WebhookService {
  constructor(private uow: IUnitOfWork) {}

  /**
   * Listen to contract events
   * @param networkId Network ID
   * @param contractId Contract ID
   * @param contractAddress Contract address
   * @param eventName Event name to listen
   * @param provider Ethers provider
   */
  async listenToContractEvent(
    networkId: string,
    contractId: string,
    contractAddress: string,
    eventName: string,
    provider: ethers.Provider,
    callback?: (event: any) => Promise<void>
  ): Promise<void> {
    try {
      const contract = new ethers.Contract(
        contractAddress,
        [
          {
            anonymous: false,
            inputs: [],
            name: eventName,
            type: 'event',
          },
        ],
        provider
      );

      // Listen to event
      contract.on(eventName, async (...args) => {
        console.log(`Event ${eventName} detected:`, args);

        // Extract event data
        const eventData = args[args.length - 1];

        // Store event in database
        try {
          await this.uow.blockchainEvents.create({
            networkId,
            contractId,
            eventName,
            logIndex: eventData?.logIndex || 0,
            transactionHash: eventData?.transactionHash || '',
            blockNumber: BigInt(eventData?.blockNumber || 0),
            blockHash: eventData?.blockHash || '',
            eventData: eventData?.args || {},
            rawLog: args,
          });

          // Execute callback if provided
          if (callback) {
            await callback(eventData);
          }
        } catch (error) {
          console.error(`Error processing event ${eventName}:`, error);
        }
      });

      console.log(`Listening to ${eventName} events on contract ${contractAddress}`);
    } catch (error) {
      console.error(`Error setting up event listener for ${eventName}:`, error);
      throw error;
    }
  }

  /**
   * Process webhook from blockchain indexer (Etherscan, Alchemy, etc.)
   * @param payload Webhook payload
   */
  async processWebhook(payload: any): Promise<void> {
    return await this.uow.executeInTransaction(async (uow) => {
      try {
        const { event, blockNumber, transactionHash, logIndex, data } = payload;

        // Validate webhook
        if (!event || !blockNumber || !transactionHash) {
          throw new Error('Invalid webhook payload');
        }

        // Check if event already processed
        const existingEvent = await uow.blockchainEvents.findByTransactionHashAndLogIndex(
          transactionHash,
          logIndex || 0
        );

        if (existingEvent) {
          console.log(`Event already processed: ${transactionHash}-${logIndex}`);
          return;
        }

        // Find associated contract
        const transaction = await uow.blockchainTransactions.findByHash(transactionHash);
        if (!transaction || !transaction.contractId) {
          console.warn(`No contract found for transaction: ${transactionHash}`);
          return;
        }

        // Create blockchain event record
        await uow.blockchainEvents.create({
          networkId: transaction.networkId,
          contractId: transaction.contractId,
          eventName: event,
          transactionHash,
          logIndex: logIndex || 0,
          blockNumber: BigInt(blockNumber),
          blockHash: payload.blockHash || '',
          eventData: data || {},
        });

        console.log(`Webhook processed: ${event} at ${transactionHash}`);
      } catch (error) {
        console.error('Error processing webhook:', error);
        throw error;
      }
    });
  }

  /**
   * Batch process pending blockchain events
   */
  async processPendingEvents(): Promise<void> {
    try {
      const pendingEvents = await this.uow.blockchainEvents.findByProcessed(false);

      for (const event of pendingEvents) {
        try {
          await this.processBlockchainEvent(event.id);
        } catch (error) {
          console.error(`Error processing event ${event.id}:`, error);

          // Update event with error
          await this.uow.blockchainEvents.update(event.id, {
            processingError: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      console.error('Error processing pending events:', error);
      throw error;
    }
  }

  /**
   * Process a single blockchain event
   * @param eventId Event ID
   */
  private async processBlockchainEvent(eventId: string): Promise<void> {
    const event = await this.uow.blockchainEvents.findById(eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    // Process based on event type
    switch (event.eventName) {
      case 'CashbackAllocated':
        await this.handleCashbackAllocated(event);
        break;
      case 'CashbackClaimed':
        await this.handleCashbackClaimed(event);
        break;
      case 'TokensDeposited':
        await this.handleTokensDeposited(event);
        break;
      case 'TokensWithdrawn':
        await this.handleTokensWithdrawn(event);
        break;
      default:
        console.log(`Unknown event type: ${event.eventName}`);
    }

    // Mark as processed
    await this.uow.blockchainEvents.update(eventId, {
      processed: true,
      processedAt: new Date(),
    });
  }

  /**
   * Handle CashbackAllocated event
   */
  private async handleCashbackAllocated(event: any): Promise<void> {
    try {
      const { eventData } = event;
      console.log('Processing CashbackAllocated event:', eventData);

      // Update related database records
      // This is where you would update user cashback balances, etc.
    } catch (error) {
      console.error('Error handling CashbackAllocated event:', error);
      throw error;
    }
  }

  /**
   * Handle CashbackClaimed event
   */
  private async handleCashbackClaimed(event: any): Promise<void> {
    try {
      const { eventData } = event;
      console.log('Processing CashbackClaimed event:', eventData);

      // Update related database records
      // This is where you would mark cashback as claimed, update user balance, etc.
    } catch (error) {
      console.error('Error handling CashbackClaimed event:', error);
      throw error;
    }
  }

  /**
   * Handle TokensDeposited event
   */
  private async handleTokensDeposited(event: any): Promise<void> {
    try {
      const { eventData } = event;
      console.log('Processing TokensDeposited event:', eventData);

      // Update pool balances
    } catch (error) {
      console.error('Error handling TokensDeposited event:', error);
      throw error;
    }
  }

  /**
   * Handle TokensWithdrawn event
   */
  private async handleTokensWithdrawn(event: any): Promise<void> {
    try {
      const { eventData } = event;
      console.log('Processing TokensWithdrawn event:', eventData);

      // Update pool balances
    } catch (error) {
      console.error('Error handling TokensWithdrawn event:', error);
      throw error;
    }
  }

  /**
   * Get unprocessed events count
   */
  async getUnprocessedEventCount(): Promise<number> {
    return this.uow.blockchainEvents.countByProcessed(false);
  }

  /**
   * Get event history for a contract
   * @param contractId Contract ID
   * @param limit Limit results
   */
  async getContractEventHistory(contractId: string, limit: number = 100) {
    return this.uow.blockchainEvents.findByContract(contractId, undefined, limit);
  }
}
