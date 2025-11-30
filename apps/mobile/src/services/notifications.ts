import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface PushTokenResult {
  success: boolean;
  token?: string;
  error?: string;
}

/**
 * Register for push notifications and get the Expo push token
 */
export async function registerForPushNotificationsAsync(): Promise<PushTokenResult> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return { success: false, error: 'Must use physical device for Push Notifications' };
  }

  // Check and request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token - permission not granted');
    return { success: false, error: 'Permission not granted' };
  }

  // Get the Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    if (!projectId) {
      console.log('Project ID not found');
      return { success: false, error: 'Project ID not configured' };
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const token = tokenData.data;
    console.log('Expo push token:', token);

    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#EF4444',
      });

      // Channel for messages
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Mensagens',
        description: 'Notificações de novas mensagens',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#EF4444',
      });
    }

    return { success: true, token };
  } catch (error) {
    console.error('Error getting push token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get push token',
    };
  }
}

/**
 * Save push token to the server
 */
export async function savePushTokenToServer(token: string): Promise<boolean> {
  try {
    await api.post('/users/push-token', {
      token,
      platform: Platform.OS,
      deviceId: Constants.deviceId,
    });
    console.log('Push token saved to server');
    return true;
  } catch (error) {
    console.error('Failed to save push token:', error);
    return false;
  }
}

/**
 * Remove push token from server (on logout)
 */
export async function removePushTokenFromServer(token: string): Promise<boolean> {
  try {
    await api.delete('/users/push-token', {
      params: { token },
    });
    console.log('Push token removed from server');
    return true;
  } catch (error) {
    console.error('Failed to remove push token:', error);
    return false;
  }
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  trigger?: Notifications.NotificationTriggerInput,
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
    },
    trigger: trigger || null, // null = immediate
  });
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear badge
 */
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

/**
 * Add notification received listener
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void,
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add notification response listener (when user taps notification)
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void,
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Remove notification listener subscription
 */
export function removeNotificationSubscription(subscription: Notifications.Subscription): void {
  Notifications.removeNotificationSubscription(subscription);
}
