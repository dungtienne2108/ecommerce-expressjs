/**
 * Comprehensive Logger Service
 * Cung cấp logging toàn diện cho ứng dụng
 */

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

interface LogContext {
  module?: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

class Logger {
  private logLevel: LogLevel = LogLevel.DEBUG;
  private isDevelopment: boolean = process.env.NODE_ENV === 'development';
  private enableConsole: boolean = process.env.ENABLE_CONSOLE_LOGS !== 'false';
  private enablePrismaLogs: boolean = process.env.ENABLE_PRISMA_LOGS !== 'false';

  constructor() {
    const levelStr = (process.env.LOG_LEVEL || 'debug').toUpperCase();
    this.logLevel = LogLevel[levelStr as keyof typeof LogLevel] ?? LogLevel.DEBUG;
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = this.formatTimestamp();
    const module = context?.module ? `[${context.module}]` : '';
    const userId = context?.userId ? `[User:${context.userId}]` : '';
    const requestId = context?.requestId ? `[Request:${context.requestId}]` : '';
    
    return `${timestamp} ${level} ${module}${userId}${requestId} ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  /**
   * Debug level - Chi tiết nhất, thường dùng trong development
   */
  public debug(message: string, context?: LogContext, metadata?: any): void {
    if (!this.shouldLog(LogLevel.DEBUG) || !this.enableConsole) return;

    const formatted = this.formatMessage('[DEBUG]', message, context);
    console.log(`\x1b[36m${formatted}\x1b[0m`); // Cyan
    
    if (metadata) {
      console.log(`\x1b[36m${JSON.stringify(metadata, null, 2)}\x1b[0m`);
    }
  }

  /**
   * Info level - Thông tin chung
   */
  public info(message: string, context?: LogContext, metadata?: any): void {
    if (!this.shouldLog(LogLevel.INFO) || !this.enableConsole) return;

    const formatted = this.formatMessage('[INFO]', message, context);
    console.log(`\x1b[32m${formatted}\x1b[0m`); // Green
    
    if (metadata) {
      console.log(`\x1b[32m${JSON.stringify(metadata, null, 2)}\x1b[0m`);
    }
  }

  /**
   * Warn level - Cảnh báo
   */
  public warn(message: string, context?: LogContext, metadata?: any): void {
    if (!this.shouldLog(LogLevel.WARN) || !this.enableConsole) return;

    const formatted = this.formatMessage('[WARN]', message, context);
    console.warn(`\x1b[33m${formatted}\x1b[0m`); // Yellow
    
    if (metadata) {
      console.warn(`\x1b[33m${JSON.stringify(metadata, null, 2)}\x1b[0m`);
    }
  }

  /**
   * Error level - Lỗi
   */
  public error(message: string, error?: Error | any, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.ERROR) || !this.enableConsole) return;

    const formatted = this.formatMessage('[ERROR]', message, context);
    console.error(`\x1b[31m${formatted}\x1b[0m`); // Red
    
    if (error) {
      if (error instanceof Error) {
        console.error(`\x1b[31m${error.stack}\x1b[0m`);
      } else {
        console.error(`\x1b[31m${JSON.stringify(error, null, 2)}\x1b[0m`);
      }
    }
  }

  /**
   * Fatal level - Lỗi nghiêm trọng
   */
  public fatal(message: string, error?: Error | any, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.FATAL) || !this.enableConsole) return;

    const formatted = this.formatMessage('[FATAL]', message, context);
    console.error(`\x1b[35m${formatted}\x1b[0m`); // Magenta
    
    if (error) {
      if (error instanceof Error) {
        console.error(`\x1b[35m${error.stack}\x1b[0m`);
      } else {
        console.error(`\x1b[35m${JSON.stringify(error, null, 2)}\x1b[0m`);
      }
    }
  }

  /**
   * Log HTTP requests
   */
  public httpRequest(method: string, path: string, statusCode: number, duration: number, context?: LogContext): void {
    if (!this.enableConsole) return;

    const statusEmoji = statusCode < 300 ? '✅' : statusCode < 400 ? '⚠️' : '❌';
    const message = `${statusEmoji} ${method} ${path} - ${statusCode} (${duration}ms)`;
    
    if (statusCode < 400) {
      this.info(message, context);
    } else {
      this.warn(message, context);
    }
  }

  /**
   * Log database operations
   */
  public database(operation: string, table: string, duration: number, context?: LogContext): void {
    if (!this.enableConsole) return;

    const message = `📊 DB ${operation} ${table} (${duration}ms)`;
    this.debug(message, context);
  }

  /**
   * Log cache operations
   */
  public cache(operation: string, key: string, hit: boolean, context?: LogContext): void {
    if (!this.enableConsole) return;

    const cacheEmoji = hit ? '✅' : '❌';
    const message = `💾 Cache ${cacheEmoji} ${operation} ${key}`;
    this.debug(message, context);
  }

  /**
   * Kiểm soát Prisma logging
   */
  public getPrismaLogConfig(): Array<'query' | 'info' | 'warn' | 'error'> {
    if (!this.enablePrismaLogs) {
      return ['error']; // Chỉ log lỗi từ Prisma
    }

    if (this.isDevelopment) {
      return ['query', 'info', 'warn', 'error'];
    }

    return ['warn', 'error']; // Production
  }
}

// Singleton instance
export const logger = new Logger();

// Exports
export { LogLevel, LogContext };

