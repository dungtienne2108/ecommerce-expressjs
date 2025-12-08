import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { logger } from '../services/logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({connectionString});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: logger.getPrismaLogConfig() as any,
  adapter: adapter,
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Test connection
export const testDatabaseConnection = async (): Promise<void> => {
  try {
    await prisma.$connect();
    await prisma.$executeRaw`SELECT 1`;
    logger.info('Kết nối cơ sở dữ liệu thành công', { module: 'Database' });
  } catch (error) {
    logger.error('Kết nối cơ sở dữ liệu thất bại:', error as Error, { module: 'Database' });
    throw error;
  }
};

// Graceful shutdown
export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
  logger.info('Đã ngắt kết nối cơ sở dữ liệu', { module: 'Database' });
};