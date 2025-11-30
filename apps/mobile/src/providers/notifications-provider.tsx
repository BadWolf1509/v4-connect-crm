import { useEffect } from 'react';
import { useNotifications } from '../hooks/use-notifications';

interface NotificationsProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that initializes push notifications
 * Place this inside your QueryClientProvider and Auth context
 */
export function NotificationsProvider({ children }: NotificationsProviderProps) {
  const { isRegistered, error, expoPushToken } = useNotifications();

  useEffect(() => {
    if (isRegistered && expoPushToken) {
      console.log('Push notifications registered successfully');
    }

    if (error) {
      console.warn('Push notifications error:', error);
    }
  }, [isRegistered, error, expoPushToken]);

  return <>{children}</>;
}
