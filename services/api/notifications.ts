import { apiClient } from './client';

export interface Notification {
  id: string;
  type: number; // 0: Booking, 1: Payment, 2: Review, 3: Promo, 4: System
  code: string | null;
  title: string;
  body: string;
  deepLink: string | null;
  meta: {
    bookingId?: string;
    status?: string;
  } | null;
  isRead: boolean;
  readAt: string | null;
  createdDate: string;
}

export interface NotificationSettings {
  newBooking: boolean;
  payment: boolean;
  statusUpdate: boolean;
  promotions: boolean;
  viaPush: boolean;
  viaSms: boolean;
  viaEmail: boolean;
  viaInApp: boolean;
}

function unwrapData<T = any>(responseData: any): T {
  return responseData?.data ?? responseData;
}

/** GET /Notification — List notifications */
export async function getNotifications(params?: {
  PageNumber?: number;
  PageSize?: number;
}): Promise<Notification[]> {
  const response = await apiClient.get('/Notification', { params });
  const data = unwrapData<any>(response.data);
  return Array.isArray(data) ? data : (data?.items ?? []);
}

/** GET /Notification/unread-count — Get unread badge count */
export async function getUnreadCount(): Promise<number> {
  const response = await apiClient.get('/Notification/unread-count');
  const data = unwrapData<any>(response.data);
  return typeof data === 'number' ? data : (data?.count ?? 0);
}

/** PATCH /Notification/{id}/read — Mark one notification as read */
export async function markAsRead(id: string): Promise<void> {
  await apiClient.patch(`/Notification/${id}/read`);
}

/** PATCH /Notification/read-all — Mark all notifications as read */
export async function markAllAsRead(): Promise<void> {
  await apiClient.patch('/Notification/read-all');
}

/** GET /Notification/settings — Get notification settings */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const response = await apiClient.get('/Notification/settings');
  return unwrapData<NotificationSettings>(response.data);
}

/** PUT /Notification/settings — Update notification settings */
export async function updateNotificationSettings(
  settings: Partial<NotificationSettings>
): Promise<void> {
  await apiClient.put('/Notification/settings', settings);
}
