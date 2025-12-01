'use client';

import { useInboxStore } from '@/stores/inbox-store';
import type { Conversation, Message } from '@/stores/inbox-store';
import { type NotificationItem, useNotificationsStore } from '@/stores/notifications-store';
import { useSession } from 'next-auth/react';
import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import { type Socket, io } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3003';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const {
    addConversation,
    updateConversation,
    addMessage,
    updateMessage,
    addTypingUser,
    removeTypingUser,
  } = useInboxStore();
  const { addNotification } = useNotificationsStore();

  useEffect(() => {
    if (!session?.user) return;

    // Send session as JSON token for WebSocket authentication
    const newSocket = io(WS_URL, {
      auth: {
        token: JSON.stringify(session),
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    // Listen for new conversations
    newSocket.on('conversation:new', (conversation: Conversation) => {
      addConversation(conversation);
    });

    // Listen for conversation updates
    newSocket.on('conversation:update', (data: { id: string } & Partial<Conversation>) => {
      updateConversation(data.id, data);
    });

    // Listen for new messages
    newSocket.on('message:new', (message: Message) => {
      addMessage(message.conversationId, message);
      // Update conversation's last message
      updateConversation(message.conversationId, {
        lastMessage: message.content,
        lastMessageAt: message.timestamp,
        unreadCount: message.sender === 'contact' ? 1 : 0, // Increment if from contact
      });
    });

    // Listen for message updates (status changes)
    newSocket.on(
      'message:update',
      (data: { conversationId: string; messageId: string } & Partial<Message>) => {
        updateMessage(data.conversationId, data.messageId, data);
      },
    );

    // Listen for typing indicators
    newSocket.on(
      'typing:start',
      (data: { conversationId: string; userId: string; userName?: string }) => {
        addTypingUser({
          conversationId: data.conversationId,
          userId: data.userId,
          userName: data.userName || 'Alguem',
        });

        // Auto-remove after 3 seconds
        setTimeout(() => {
          removeTypingUser(data.conversationId, data.userId);
        }, 3000);
      },
    );

    newSocket.on('typing:stop', (data: { conversationId: string; userId: string }) => {
      removeTypingUser(data.conversationId, data.userId);
    });

    // Notifications
    newSocket.on('notification', (data: NotificationItem) => {
      addNotification({
        id: data.id || crypto.randomUUID(),
        title: data.title || 'Notificação',
        body: data.body,
        createdAt: data.createdAt || new Date().toISOString(),
        link: data.link,
        read: false,
        type: data.type,
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [
    session,
    addConversation,
    updateConversation,
    addMessage,
    updateMessage,
    addTypingUser,
    removeTypingUser,
    addNotification,
  ]);

  const joinConversation = useCallback(
    (conversationId: string) => {
      socket?.emit('conversation:join', conversationId);
    },
    [socket],
  );

  const leaveConversation = useCallback(
    (conversationId: string) => {
      socket?.emit('conversation:leave', conversationId);
    },
    [socket],
  );

  const startTyping = useCallback(
    (conversationId: string) => {
      socket?.emit('typing:start', { conversationId });
    },
    [socket],
  );

  const stopTyping = useCallback(
    (conversationId: string) => {
      socket?.emit('typing:stop', { conversationId });
    },
    [socket],
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinConversation,
        leaveConversation,
        startTyping,
        stopTyping,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
}
