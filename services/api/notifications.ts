import { apiClient } from './client';

export interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdDate: string;
  type?: string;
  referenceId?: string;
}

export interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
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
  return Array.isArray(data) ? data : data?.items ?? [];
}

/** GET /Notification/unread-count — Get unread badge count */
export async function getUnreadCount(): Promise<number> {
  const response = await apiClient.get('/Notification/unread-count');
  const data = unwrapData<any>(response.data);
  return typeof data === 'number' ? data : data?.count ?? 0;
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
