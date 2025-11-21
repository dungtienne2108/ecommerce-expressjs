/**
 * useSocket Hook
 * Quản lý socket connection lifecycle
 */

import { useEffect, useState } from 'react';
import { socketService } from '../services/socketService';

interface UseSocketProps {
  token: string | null;
  autoConnect?: boolean;
  serverUrl?: string;
}

export const useSocket = ({ token, autoConnect = true, serverUrl }: UseSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | undefined>();

  useEffect(() => {
    if (!token || !autoConnect) return;

    // Connect to socket
    socketService.connect(token, serverUrl);

    // Setup connection status listeners
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleConnect = () => {
      setIsConnected(true);
      setSocketId(socketService.getSocketId());
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setSocketId(undefined);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Check initial connection state
    if (socket.connected) {
      handleConnect();
    }

    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socketService.disconnect();
    };
  }, [token, autoConnect, serverUrl]);

  const connect = (newToken?: string) => {
    const tokenToUse = newToken || token;
    if (!tokenToUse) {
      console.error('No token provided for socket connection');
      return;
    }
    socketService.connect(tokenToUse, serverUrl);
  };

  const disconnect = () => {
    socketService.disconnect();
  };

  return {
    isConnected,
    socketId,
    connect,
    disconnect,
    socket: socketService.getSocket(),
  };
};
