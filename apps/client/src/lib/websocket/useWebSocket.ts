import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useStore } from '@/store';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui/toast';

interface WebSocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export const useWebSocket = (options: WebSocketOptions = {}) => {
  const socketRef = useRef<Socket | null>(null);
  const { getToken } = useAuth();
  const { setConnectionStatus } = useStore();

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const token = getToken();
    if (!token) {
      console.error('No auth token available');
      return;
    }

    socketRef.current = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL!, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', () => {
      setConnectionStatus('connected');
      options.onConnect?.();
    });

    socketRef.current.on('disconnect', () => {
      setConnectionStatus('disconnected');
      options.onDisconnect?.();
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to real-time services',
        variant: 'destructive',
      });
      options.onError?.(error);
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [getToken, options, setConnectionStatus]);

  useEffect(() => {
    const cleanup = connect();
    return () => cleanup?.();
  }, [connect]);

  const subscribe = useCallback(<T>(
    event: string,
    callback: (data: T) => void
  ) => {
    socketRef.current?.on(event, callback);
    return () => {
      socketRef.current?.off(event, callback);
    };
  }, []);

  const emit = useCallback(<T>(event: string, data: T) => {
    if (!socketRef.current?.connected) {
      console.warn('Socket not connected. Attempting to reconnect...');
      connect();
    }
    socketRef.current?.emit(event, data);
  }, [connect]);

  const joinRoom = useCallback((room: string) => {
    emit('join_room', room);
  }, [emit]);

  const leaveRoom = useCallback((room: string) => {
    emit('leave_room', room);
  }, [emit]);

  return {
    socket: socketRef.current,
    subscribe,
    emit,
    joinRoom,
    leaveRoom,
    connect,
  };
};
