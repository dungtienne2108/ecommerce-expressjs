import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  database: number;
}

const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD ?? '',
  database: parseInt(process.env.REDIS_DB || '0', 10),
};

class Redis {
  private client: RedisClientType;

  constructor() {
    const options = {
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
      },
      database: redisConfig.database,
      ...(redisConfig.password ? { password: redisConfig.password } : {}),
    };

    this.client = createClient(options);

    // Event: error
    this.client.on('error', (err) => {
      console.error('❌ Lỗi kết nối redis:', err);
    });

    // Event: ready (client sẵn sàng)
    this.client.on('ready', () => {
      console.log('✅ Kết nối redis thành công');
    });

    // Event: end (ngắt kết nối)
    this.client.on('end', () => {
      console.log('✅ Kết nối redis đã ngắt');
    });
  }

  // Connect to Redis
  public async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      console.error('❌ Redis kết nối thất bại:', error);
      throw error;
    }
  }

  // Get Redis client
  public getClient(): RedisClientType {
    return this.client;
  }

  // Set key-value with optional expiration
  public async set(
    key: string,
    value: string,
    expireInSeconds?: number
  ): Promise<void> {
    try {
      if (expireInSeconds) {
        await this.client.setEx(key, expireInSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.error('❌ Redis lỗi SET:', error);
      throw error;
    }
  }

  // Get value by key
  public async get(key: string): Promise<string | null> {
    try {
      const result = await this.client.get(key);
      return result;
    } catch (error) {
      console.error('❌ Redis lỗi GET:', error);
      throw error;
    }
  }

  // Delete key
  public async del(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      console.error('❌ Redis lỗi DEL:', error);
      throw error;
    }
  }

  // Check if key exists
  public async exists(key: string): Promise<number> {
    try {
      return await this.client.exists(key);
    } catch (error) {
      console.error('❌ Redis lỗi exists:', error);
      throw error;
    }
  }

  // Set expiration for key
  public async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      console.error('❌ Redis lỗi expire:', error);
      throw error;
    }
  }

  public async keys(pattern: string): Promise<string[]> {
    try {
      const keys = await this.client.keys(pattern);
      return keys;
    } catch (error) {
      console.error('❌ Redis lỗi keys:', error);
      throw error;
    }
  }

  public async flushAll(): Promise<void> {
  try {
    await this.client.flushAll();
    console.log('✅ Redis: Đã xóa toàn bộ dữ liệu');
  } catch (error) {
    console.error('❌ Redis lỗi flushAll:', error);
    throw error;
  }
}


  // Close Redis connection
  public async disconnect(): Promise<void> {
    await this.client.quit();
    console.log('Đã ngắt kết nối redis');
  }
}

export const redis = new Redis();
export default redis;
