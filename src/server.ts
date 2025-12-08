import http from 'http';
import { createApp } from './app';
import { testDatabaseConnection, disconnectDatabase } from './config/prisma';
import { redis } from './config/redis';
import { cashbackCronService, uow } from './config/container';
import { SocketGateway } from './gateway/socket.gateway';
import { SocketService } from './services/socket.service';
import { logger } from './services/logger';
import { cronJobsManager } from './cron-jobs';

let server: http.Server;
let socketGateway: SocketGateway;

export async function startServer(port: number) {
  // Kết nối phụ trợ trước khi lắng nghe
  await testDatabaseConnection();
  await redis.connect();

  const app = createApp();
  server = http.createServer(app);

  socketGateway = new SocketGateway(server, uow);
  SocketService.setGateway(socketGateway);

  server.listen(port, () => {
    logger.info(`Server chạy thành công`, { module: 'Server' });
    logger.info(`Port: ${port}`, { module: 'Server' });
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`, { module: 'Server' });
    logger.info(`Socket.IO is running`, { module: 'Socket.IO' });

    // Start cron jobs
    cronJobsManager.registerAll();
    cronJobsManager.startAll();

    // chạy cronjobcashbackCronService.start();
    
  });

  // Tuỳ chọn: nếu chạy sau proxy/CDN
  // app.set('trust proxy', 1);

  return server;
}

export async function stopServer() {
  logger.info('Đang dừng server...', { module: 'Server' });
  
  // Stop cron jobs
  cronJobsManager.stopAll();
  
  // cashbackCronService.stop();

  if (socketGateway) {
    socketGateway.getIO().close();
  }

  await new Promise<void>((resolve) =>
    server?.close(() => resolve())
  ).catch(() => { /* swallow */ });

  await disconnectDatabase();
  try { await redis.disconnect(); } catch {  }
  
  logger.info('Server đã dừng', { module: 'Server' });
}
  