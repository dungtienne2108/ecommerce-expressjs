/**
 * Socket Service
 * Quản lý kết nối Socket.IO với backend
 */

import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Khởi tạo kết nối socket
   */
  connect(token: string, serverUrl?: string) {
    this.token = token;
    const url = serverUrl || process.env.REACT_APP_API_URL || 'http://localhost:3000';

    console.log('🔌 Connecting to socket server:', url);

    this.socket = io(url, {
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupBaseListeners();
  }

  /**
   * Setup các listener cơ bản
   */
  private setupBaseListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Connected to chat server. Socket ID:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from chat server. Reason:', reason);

      if (reason === 'io server disconnect') {
        // Server chủ động disconnect, cần reconnect thủ công
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Listen to user status changes globally
    this.socket.on('chat:user_status_changed', (data) => {
      console.log('User status changed:', data);
    });
  }

  /**
   * Disconnect khỏi server
   */
  disconnect() {
    if (this.socket) {
      console.log('Disconnecting from socket server...');
      this.socket.disconnect();
      this.socket = null;
      this.token = null;
    }
  }

  /**
   * Emit event với callback promise
   */
  emit<T = any>(event: string, data?: any): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Socket timeout'));
      }, 10000); // 10 second timeout

      this.socket.emit(event, data, (response: any) => {
        clearTimeout(timeout);

        if (response && response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Unknown error'));
        }
      });
    });
  }

  /**
   * Listen to events
   */
  on(event: string, callback: (data: any) => void) {
    this.socket?.on(event, callback);
  }

  /**
   * Remove listener
   */
  off(event: string, callback?: (data: any) => void) {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }

  /**
   * Kiểm tra trạng thái kết nối
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Lấy socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

// Export singleton instance
export const socketService = new SocketService();
