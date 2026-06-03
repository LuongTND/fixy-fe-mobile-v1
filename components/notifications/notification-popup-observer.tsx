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
import { router } from 'expo-router';
import * as React from 'react';
import { AppState, Platform } from 'react-native';

import { getNotifications, Notification } from '@/services/api/notifications';
import { useAuthStore } from '@/store/store';
import { parseDeepLink } from '@/utils/navigation';

const NOTIFICATION_POLL_INTERVAL_MS = 30000;
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

function isNewerNotification(candidate: Notification, current?: Notification) {
  if (!current) return true;
  return new Date(candidate.createdDate).getTime() > new Date(current.createdDate).getTime();
}

function getLatestNotification(notifications: Notification[]) {
  return notifications.reduce<Notification | undefined>(
    (latest, item) => (isNewerNotification(item, latest) ? item : latest),
    undefined
  );
}

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
  const lastSeenNotificationIdRef = React.useRef<string | null>(null);
  const hasLoadedInitialSnapshotRef = React.useRef(false);
  const isPollingRef = React.useRef(false);

  React.useEffect(() => {
    const subscription = addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as PopupNotificationData;
      openNotificationTarget(data);
    });

    return () => subscription.remove();
  }, []);

  React.useEffect(() => {
    if (isHydrating || !isAuthenticated) {
      lastSeenNotificationIdRef.current = null;
      hasLoadedInitialSnapshotRef.current = false;
      return;
    }

    let cancelled = false;

    const pollNotifications = async () => {
      if (cancelled || isPollingRef.current || AppState.currentState !== 'active') return;

      isPollingRef.current = true;
      try {
        const notifications = await getNotifications({ PageNumber: 1, PageSize: 5 });
        const latest = getLatestNotification(notifications);

        if (!latest) {
          hasLoadedInitialSnapshotRef.current = true;
          return;
        }

        if (!hasLoadedInitialSnapshotRef.current) {
          lastSeenNotificationIdRef.current = latest.id;
          hasLoadedInitialSnapshotRef.current = true;
          return;
        }

        if (latest.id !== lastSeenNotificationIdRef.current) {
          lastSeenNotificationIdRef.current = latest.id;
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
          if (!latest.isRead) {
            await showNotificationPopup(latest);
          }
        }
      } catch (error) {
        console.warn('[notifications] Unable to poll latest notification', error);
      } finally {
        isPollingRef.current = false;
      }
    };

    pollNotifications();
    const interval = setInterval(pollNotifications, NOTIFICATION_POLL_INTERVAL_MS);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        pollNotifications();
      }
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [isAuthenticated, isHydrating, queryClient]);

  return null;
}
