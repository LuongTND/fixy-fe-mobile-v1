import { useQueryClient } from '@tanstack/react-query';
import { PermissionStatus } from 'expo-modules-core';
import {
  getPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-notifications/build/NotificationPermissions';
import {
  IosAuthorizationStatus,
  NotificationPermissionsStatus,
} from 'expo-notifications/build/NotificationPermissions.types';
import { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
import { addNotificationResponseReceivedListener } from 'expo-notifications/build/NotificationsEmitter';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import scheduleNotificationAsync from 'expo-notifications/build/scheduleNotificationAsync';
import setNotificationChannelAsync from 'expo-notifications/build/setNotificationChannelAsync';
import { HubConnectionBuilder, LogLevel, HubConnection } from '@microsoft/signalr';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as React from 'react';
import { AppState, Platform } from 'react-native';

import { Notification } from '@/services/api/notifications';
import { useAuthStore } from '@/store/store';
import { parseDeepLink } from '@/utils/navigation';

const POPUP_CHANNEL_ID = 'fixy-notifications';

type PopupNotificationData = {
  notificationId?: string;
  deepLink?: string | null;
  bookingId?: string;
};

setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});



function openNotificationTarget(data: PopupNotificationData) {
  const parsedRoute = parseDeepLink(data.deepLink);
  if (parsedRoute) {
    router.push({
      pathname: parsedRoute.pathname,
      params: parsedRoute.params,
    } as any);
    return;
  }

  if (data.bookingId) {
    router.push(`/booking-detail?bookingId=${data.bookingId}` as any);
    return;
  }

  router.push('/(customer)/notifications' as any);
}

function canShowIosNotification(permissions: NotificationPermissionsStatus) {
  const status = permissions.ios?.status;
  return (
    status === IosAuthorizationStatus.AUTHORIZED ||
    status === IosAuthorizationStatus.PROVISIONAL ||
    status === IosAuthorizationStatus.EPHEMERAL
  );
}

async function requestNotificationPermissions() {
  return requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
}

async function ensureNotificationPresentationReady() {
  const permissions = await getPermissionsAsync();
  let canShowNotification =
    Platform.OS === 'ios'
      ? canShowIosNotification(permissions)
      : permissions.status === PermissionStatus.GRANTED;

  if (!canShowNotification) {
    const requested = await requestNotificationPermissions();
    canShowNotification =
      Platform.OS === 'ios'
        ? canShowIosNotification(requested)
        : requested.status === PermissionStatus.GRANTED;
  }

  if (!canShowNotification) return false;

  if (Platform.OS === 'android') {
    await setNotificationChannelAsync(POPUP_CHANNEL_ID, {
      name: 'Fixy notifications',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF8228',
      sound: 'default',
    });
  }

  return true;
}

async function showNotificationPopup(notification: Notification) {
  const canShow = await ensureNotificationPresentationReady();
  if (!canShow) return;

  await scheduleNotificationAsync({
    identifier: `fixy-${notification.id}`,
    content: {
      title: notification.title,
      body: notification.body,
      sound: true,
      data: {
        notificationId: notification.id,
        deepLink: notification.deepLink,
        bookingId: notification.meta?.bookingId,
      },
    },
    trigger: Platform.OS === 'android' ? { channelId: POPUP_CHANNEL_ID } : null,
  });
}

export function NotificationPopupObserver() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const accessToken = useAuthStore((state) => state.accessToken);
  const notificationHubUrl = Constants.expoConfig?.extra?.notificationHubUrl;

  React.useEffect(() => {
    const subscription = addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as PopupNotificationData;
      openNotificationTarget(data);
    });

    return () => subscription.remove();
  }, []);

  React.useEffect(() => {
    if (isHydrating || !isAuthenticated || !accessToken || !notificationHubUrl) {
      return;
    }

    let connection: HubConnection | null = null;
    let isConnected = true;

    async function startSignalR() {
      try {
        connection = new HubConnectionBuilder()
          .withUrl(notificationHubUrl, {
            accessTokenFactory: () => accessToken || '',
          })
          .withAutomaticReconnect()
          .configureLogging(LogLevel.Warning)
          .build();

        // Listen for new notifications
        const handleNewNotification = async (notification: any) => {
          if (!isConnected) return;

          // Invalidate cache to refresh UI lists and unread count badges
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });

          // Show local popup notification when app is active
          if (AppState.currentState === 'active' && !notification.isRead) {
            await showNotificationPopup(notification);
          }
        };

        connection.on('ReceiveNotification', handleNewNotification);
        connection.on('ReceiveSystemNotification', handleNewNotification);

        await connection.start();

        // Initial cache invalidation on hub connect to fetch missed alerts
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });

        console.log('[notifications] Connected to SignalR Notification Hub.');
      } catch (err) {
        console.warn('[notifications] SignalR Hub connection failed:', err);
      }
    }

    startSignalR();

    return () => {
      isConnected = false;
      if (connection) {
        connection.stop().catch((err) => console.warn('[notifications] Error stopping hub:', err));
      }
    };
  }, [isAuthenticated, isHydrating, accessToken, notificationHubUrl, queryClient]);

  return null;
}
