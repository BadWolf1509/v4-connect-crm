import type * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addNotificationReceivedListener,
  addNotificationResponseListener,
  clearBadge,
  registerForPushNotificationsAsync,
  removeNotificationSubscription,
  removePushTokenFromServer,
  savePushTokenToServer,
} from '../services/notifications';
import { useAuth } from './use-auth';

interface NotificationData {
  type?: 'message' | 'conversation' | 'deal' | 'campaign';
  conversationId?: string;
  dealId?: string;
  campaignId?: string;
  [key: string]: unknown;
}

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // Handle notification navigation
  const handleNotificationResponse = useCallback((response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data as NotificationData;

    if (data?.type === 'message' && data?.conversationId) {
      // Navigate to conversation
      router.push(`/conversation/${data.conversationId}`);
    } else if (data?.type === 'deal' && data?.dealId) {
      // Navigate to CRM (deals not directly navigable yet)
      router.push('/crm');
    }

    // Clear badge when user opens app from notification
    clearBadge();
  }, []);

  // Register for push notifications when authenticated
  // biome-ignore lint/correctness/useExhaustiveDependencies: expoPushToken only used for cleanup on logout
  useEffect(() => {
    if (!isAuthenticated) {
      // Clean up if logged out
      if (expoPushToken) {
        removePushTokenFromServer(expoPushToken);
        setExpoPushToken(null);
        setIsRegistered(false);
      }
      return;
    }

    const register = async () => {
      const result = await registerForPushNotificationsAsync();

      if (result.success && result.token) {
        setExpoPushToken(result.token);
        const saved = await savePushTokenToServer(result.token);
        setIsRegistered(saved);
        setError(null);
      } else {
        setError(result.error || 'Failed to register for notifications');
      }
    };

    register();
  }, [isAuthenticated]);

  // Set up notification listeners
  useEffect(() => {
    // Listen for notifications received while app is foregrounded
    notificationListener.current = addNotificationReceivedListener((notification) => {
      setNotification(notification);
      console.log('Notification received:', notification.request.content);
    });

    // Listen for notification interactions
    responseListener.current = addNotificationResponseListener(handleNotificationResponse);

    return () => {
      if (notificationListener.current) {
        removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        removeNotificationSubscription(responseListener.current);
      }
    };
  }, [handleNotificationResponse]);

  return {
    expoPushToken,
    notification,
    isRegistered,
    error,
  };
}
