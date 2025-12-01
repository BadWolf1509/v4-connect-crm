import { create } from 'zustand';

export type NotificationType = 'message' | 'assignment' | 'system';

export interface NotificationItem {
  id: string;
  title: string;
  body?: string;
  link?: string;
  createdAt: string;
  read: boolean;
  type?: NotificationType;
}

interface NotificationState {
  notifications: NotificationItem[];
  setNotifications: (items: NotificationItem[]) => void;
  addNotification: (notification: NotificationItem) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  unreadCount: number;
}

export const useNotificationsStore = create<NotificationState>((set, _get) => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (items) =>
    set({
      notifications: items.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
      unreadCount: items.filter((n) => !n.read).length,
    }),

  addNotification: (notification) =>
    set((state) => {
      const next = [notification, ...state.notifications];
      return {
        notifications: next,
        unreadCount: next.filter((n) => !n.read).length,
      };
    }),

  markAsRead: (id) =>
    set((state) => {
      const next = state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      return {
        notifications: next,
        unreadCount: next.filter((n) => !n.read).length,
      };
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
}));
