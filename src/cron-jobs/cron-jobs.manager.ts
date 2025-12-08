/**
 * Cron Jobs Manager
 * Centralized manager for all cron jobs in the application
 */

import { BaseCronJob } from './base.cron';
import { UpdateProductSoldCountCronJob } from './update-product-sold-count.cron';
import { logger } from '../services/logger';

class CronJobsManager {
  private jobs: Map<string, BaseCronJob> = new Map();
  private isRunning: boolean = false;

  /**
   * Register a cron job
   */
  register(job: BaseCronJob): void {
    this.jobs.set(job.name, job);
    logger.debug(`Registered cron job: ${job.name}`);
  }

  /**
   * Register all default cron jobs
   */
  registerAll(): void {
    // Register all cron jobs here
    this.register(new UpdateProductSoldCountCronJob());

    logger.info(`Registered ${this.jobs.size} cron jobs`);
  }

  /**
   * Start all registered cron jobs
   */
  startAll(): void {
    if (this.isRunning) {
      logger.warn('Cron jobs are already running');
      return;
    }

    logger.info('Starting all cron jobs...');

    this.jobs.forEach((job) => {
      job.start();
    });

    this.isRunning = true;
    logger.info(`✅ All cron jobs started (${this.jobs.size} jobs)`);
  }

  /**
   * Stop all running cron jobs
   */
  stopAll(): void {
    if (!this.isRunning) {
      logger.warn('Cron jobs are not running');
      return;
    }

    logger.info('Stopping all cron jobs...');

    this.jobs.forEach((job) => {
      job.stop();
    });

    this.isRunning = false;
    logger.info('✅ All cron jobs stopped');
  }

  /**
   * Start a specific cron job by name
   */
  start(jobName: string): void {
    const job = this.jobs.get(jobName);
    if (!job) {
      logger.warn(`Cron job not found: ${jobName}`);
      return;
    }
    job.start();
  }

  /**
   * Stop a specific cron job by name
   */
  stop(jobName: string): void {
    const job = this.jobs.get(jobName);
    if (!job) {
      logger.warn(`Cron job not found: ${jobName}`);
      return;
    }
    job.stop();
  }

  /**
   * Get all registered jobs info
   */
  getJobsInfo(): Array<{
    name: string;
    schedule: string;
    enabled: boolean;
  }> {
    return Array.from(this.jobs.values()).map((job) => ({
      name: job.name,
      schedule: job.schedule,
      enabled: job.enabled,
    }));
  }

  /**
   * Check if cron jobs are running
   */
  isJobsRunning(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const cronJobsManager = new CronJobsManager();

// Export class for testing
export { CronJobsManager };

