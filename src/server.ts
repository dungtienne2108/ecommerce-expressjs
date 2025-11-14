import http from 'http';
import { createApp } from './app';
import { testDatabaseConnection, disconnectDatabase } from './config/prisma';
import { redis } from './config/redis';
import { cashbackCronService } from './config/container';
import { createSocketServer, setSocketServer } from './config/socket';
import { initializeSocketHandlers } from './socket';

let server: http.Server;

export async function startServer(port: number) {
  // Kết nối phụ trợ trước khi lắng nghe
  await testDatabaseConnection();
  await redis.connect();

  const app = createApp();

  // Tạo HTTP server
  server = http.createServer(app);

  // Khởi tạo Socket.IO
  const io = createSocketServer(server);
  setSocketServer(io);

  // Khởi tạo Socket handlers
  initializeSocketHandlers(io);

  // Lắng nghe kết nối
  server.listen(port, () => {
    console.log(`🚀 Server chạy ở cổng :${port}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💬 Socket.IO đã sẵn sàng`);

    // chạy cronjob
    cashbackCronService.start();

  });

  // Tuỳ chọn: nếu chạy sau proxy/CDN
  // app.set('trust proxy', 1);

  return server;
}

export async function stopServer() {
  console.log('Dừng...');
  
 // cashbackCronService.stop();

  await new Promise<void>((resolve) =>
    server?.close(() => resolve())
  ).catch(() => { /* swallow */ });

  await disconnectDatabase();
  try { await redis.disconnect(); } catch {  }
}
  