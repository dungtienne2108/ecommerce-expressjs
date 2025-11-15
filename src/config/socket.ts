import { Server as HTTPServer } from 'http';
import { Server, ServerOptions } from 'socket.io';
import { corsConfig } from '../middleware/cors';
import { instrument } from '@socket.io/admin-ui';

/**
 * Khởi tạo Socket.IO server
 * @param httpServer HTTP Server từ Express
 * @returns Socket.IO Server instance
 */
export function createSocketServer(httpServer: HTTPServer): Server {
  const socketOptions: Partial<ServerOptions> = {
    cors: {
      origin: corsConfig.origin,
      credentials: corsConfig.credentials,
      methods: ['GET', 'POST'],
    },
    // Cấu hình transports
    transports: ['websocket', 'polling'],
    // Ping timeout & interval
    pingTimeout: 60000,
    pingInterval: 25000,
    // Max HTTP buffer size
    maxHttpBufferSize: 1e6, // 1MB
    // Allow upgrades
    allowUpgrades: true,
  };

  const io = new Server(httpServer, socketOptions);

  instrument(io, {
    auth: false,
  })

  console.log('✅ Socket.IO server initialized');

  return io;
}

/**
 * Export socket.io instance để sử dụng ở nơi khác
 */
let io: Server | null = null;

export function setSocketServer(socketServer: Server): void {
  io = socketServer;
}

export function getSocketServer(): Server {
  if (!io) {
    throw new Error('Socket.IO server chưa được khởi tạo');
  }
  return io;
}