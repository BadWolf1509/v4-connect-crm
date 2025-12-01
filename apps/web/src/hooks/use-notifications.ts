import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { type NotificationItem, useNotificationsStore } from '../stores/notifications-store';
import { useApi } from './use-api';

type NotificationsResponse = {
  notifications: NotificationItem[];
};

export function useNotifications() {
  const { api, isAuthenticated } = useApi();
  const queryClient = useQueryClient();
  const {
    setNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
    unreadCount,
    notifications,
  } = useNotificationsStore();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<NotificationsResponse>('/notifications'),
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (data?.notifications) {
      setNotifications(data.notifications);
    }
  }, [data, setNotifications]);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.post('/notifications/read', { id }),
    onSuccess: (_res, id) => {
      markAsRead(id);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.post('/notifications/read-all', {}),
    onSuccess: () => {
      markAllAsRead();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    addNotification,
    markAsRead: (id: string) => markReadMutation.mutate(id),
    markAllAsRead: () => markAllMutation.mutate(),
  };
}
