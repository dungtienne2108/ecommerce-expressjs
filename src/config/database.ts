import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../services/logger';

dotenv.config();

interface DatabaseConfig extends PoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

const databaseConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ecommerce',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '23102001',
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
};

class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool(databaseConfig);
    
    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client:', err as Error, { module: 'Database Pool' });
      process.exit(-1);
    });
  }

  // Get pool instance
  public getPool(): Pool {
    return this.pool;
  }

  // Test connection
  public async testConnection(): Promise<void> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      logger.info(`Kết nối PostgreSQL thành công: ${result.rows[0].now}`, { module: 'PostgreSQL' });
      client.release();
    } catch (error) {
      logger.error('Kết nối PostgreSQL thất bại:', error as Error, { module: 'PostgreSQL' });
      throw error;
    }
  }

  // Execute query
  public async query(text: string, params?: any[]): Promise<any> {
    const client = await this.pool.connect();
    const startTime = Date.now();
    try {
      const result = await client.query(text, params);
      const duration = Date.now() - startTime;
      logger.database('QUERY', 'postgresql', duration, { module: 'PostgreSQL' });
      return result;
    } catch (error) {
      logger.error('Lỗi truy vấn cơ sở dữ liệu:', error as Error, { module: 'PostgreSQL' });
      throw error;
    } finally {
      client.release();
    }
  }

  // Close all connections
  public async close(): Promise<void> {
    await this.pool.end();
    logger.info('Đã đóng kết nối PostgreSQL', { module: 'PostgreSQL' });
  }
}

export const database = new Database();
export default database;