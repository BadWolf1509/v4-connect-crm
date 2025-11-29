'use client';

import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef } from 'react';
import { type Socket, io } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3003';

interface UseSocketOptions {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);

  useEffect(() => {
    if (!session?.user) return;

    // Create socket connection with session data as token
    // The WebSocket server accepts both JWT tokens and JSON session data
    const socket = io(WS_URL, {
      auth: {
        token: JSON.stringify(session),
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      reconnectAttempts.current = 0;
      options.onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      options.onDisconnect?.(reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      reconnectAttempts.current++;
      options.onError?.(error);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session, options.onConnect, options.onDisconnect, options.onError]);

  // Join a conversation room
  const joinConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('conversation:join', conversationId);
  }, []);

  // Leave a conversation room
  const leaveConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('conversation:leave', conversationId);
  }, []);

  // Start typing indicator
  const startTyping = useCallback((conversationId: string) => {
    socketRef.current?.emit('typing:start', { conversationId });
  }, []);

  // Stop typing indicator
  const stopTyping = useCallback((conversationId: string) => {
    socketRef.current?.emit('typing:stop', { conversationId });
  }, []);

  // Update presence status
  const updatePresence = useCallback((status: 'online' | 'away' | 'busy') => {
    socketRef.current?.emit('presence:update', status);
  }, []);

  // Subscribe to an event
  const on = useCallback(<T = unknown>(event: string, callback: (data: T) => void) => {
    socketRef.current?.on(event, callback);
    return () => {
      socketRef.current?.off(event, callback);
    };
  }, []);

  // Emit an event
  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected ?? false,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    updatePresence,
    on,
    emit,
  };
}
