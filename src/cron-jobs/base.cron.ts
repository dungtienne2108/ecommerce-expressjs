/**
 * Base Cron Job Class
 * Provides common functionality for all cron jobs
 */

import cron, { ScheduledTask } from 'node-cron';
import { logger } from '../services/logger';

export interface ICronJob {
  name: string;
  schedule: string;
  enabled?: boolean;
  runOnStart?: boolean;
}

export abstract class BaseCronJob implements ICronJob {
  name: string;
  schedule: string;
  enabled: boolean;
  runOnStart: boolean;
  protected task?: ScheduledTask;

  constructor(options: ICronJob) {
    this.name = options.name;
    this.schedule = options.schedule;
    this.enabled = options.enabled ?? true;
    this.runOnStart = options.runOnStart ?? false;
  }

  /**
   * Abstract method to implement job logic
   */
  abstract execute(): Promise<void>;

  /**
   * Start the cron job
   */
  start(): void {
    if (!this.enabled) {
      logger.info(`Cron job "${this.name}" is disabled`);
      return;
    }

    try {
      this.task = cron.schedule(this.schedule, async () => {
        await this.run();
      });

      logger.info(`✅ Cron job "${this.name}" started with schedule: ${this.schedule}`);

      if (this.runOnStart) {
        logger.info(`Running "${this.name}" on startup...`);
        this.run().catch((err) => {
          logger.error(`Error running "${this.name}" on startup:`, err);
        });
      }
    } catch (error) {
      logger.error(`Failed to start cron job "${this.name}":`, error);
    }
  }

  /**
   * Stop the cron job
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      logger.info(`⏹️  Cron job "${this.name}" stopped`);
    }
  }

  /**
   * Execute the job with error handling
   */
  protected async run(): Promise<void> {
    try {
      logger.debug(`Running cron job: ${this.name}`);
      const startTime = Date.now();

      await this.execute();

      const duration = Date.now() - startTime;
      logger.info(`✅ Cron job "${this.name}" completed in ${duration}ms`);
    } catch (error) {
      logger.error(`❌ Cron job "${this.name}" failed:`, error);
      await this.handleError(error);
    }
  }

  /**
   * Handle errors - can be overridden by subclasses
   */
  protected async handleError(error: unknown): Promise<void> {
    // Default error handling - can be overridden
    // You can implement retry logic, notifications, etc.
  }
}

