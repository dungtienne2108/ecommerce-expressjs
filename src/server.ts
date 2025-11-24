import http from 'http';
import { createApp } from './app';
import { testDatabaseConnection, disconnectDatabase } from './config/prisma';
import { redis } from './config/redis';
import { cashbackCronService, uow } from './config/container';
import { SocketGateway } from './gateway/socket.gateway';
import { SocketService } from './services/socket.service';

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
    console.log(`🚀 Server chạy ở cổng :${port}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Socket.IO is running`);

    // chạy cronjobcashbackCronService.start();
    
  });

  // Tuỳ chọn: nếu chạy sau proxy/CDN
  // app.set('trust proxy', 1);

  return server;
}

export async function stopServer() {
  console.log('Dừng...');
  
 // cashbackCronService.stop();

  if (socketGateway) {
    socketGateway.getIO().close();
  }

  await new Promise<void>((resolve) =>
    server?.close(() => resolve())
  ).catch(() => { /* swallow */ });

  await disconnectDatabase();
  try { await redis.disconnect(); } catch {  }
}
  