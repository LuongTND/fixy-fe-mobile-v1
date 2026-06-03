import { apiClient } from './client';

export enum SupportStatus {
  Open = 'Open',
  InProgress = 'InProgress',
  Resolved = 'Resolved',
  Closed = 'Closed',
}

export enum SupportReporterType {
  Customer = 'Customer',
  Worker = 'Worker',
}

export enum SupportPriority {
  Low = 'Low',
  Normal = 'Normal',
  High = 'High',
  Urgent = 'Urgent',
}

export enum SupportCategory {
  Dispute = 'Dispute',
  Payment = 'Payment',
  Technical = 'Technical',
  Other = 'Other',
}

export interface SupportTicket {
  id: string;
  bookingId?: string | null;
  category: SupportCategory;
  subject: string;
  description: string;
  priority: SupportPriority;
  status: SupportStatus;
  reporterType?: SupportReporterType;
  reporterName?: string;
  reporterPhone?: string;
  reporterAvatarUrl?: string | null;
  assignedToName?: string | null;
  createdDate: string;
  updatedDate: string;
  messages?: SupportMessage[];
}

export interface SupportMessage {
  id: string;
  content: string;
  createdDate: string;
  senderId?: string;
  senderName?: string;
  senderRole?: string;
  isAdmin?: boolean;
}

function unwrapData<T = any>(responseData: any): T {
  return responseData?.data ?? responseData;
}

/** POST /support/tickets — Create a support ticket */
export async function createSupportTicket(payload: {
  bookingId?: string | null;
  category: SupportCategory;
  subject: string;
  description: string;
  priority: SupportPriority;
}): Promise<SupportTicket> {
  const categoryMap: Record<SupportCategory, number> = {
    [SupportCategory.Dispute]: 0,
    [SupportCategory.Payment]: 1,
    [SupportCategory.Technical]: 2,
    [SupportCategory.Other]: 3,
  };

  const priorityMap: Record<SupportPriority, number> = {
    [SupportPriority.Low]: 0,
    [SupportPriority.Normal]: 1,
    [SupportPriority.High]: 2,
    [SupportPriority.Urgent]: 3,
  };

  const body = {
    ...payload,
    category: categoryMap[payload.category],
    priority: priorityMap[payload.priority],
  };

  const response = await apiClient.post('/support/tickets', body);
  return unwrapData<SupportTicket>(response.data);
}

/** GET /support/tickets — List support tickets (paged query) */
export async function getSupportTickets(params?: {
  PageNumber?: number;
  PageSize?: number;
}): Promise<SupportTicket[]> {
  const response = await apiClient.get('/support/tickets', { params });
  const data = unwrapData<any>(response.data);
  return Array.isArray(data) ? data : data?.items ?? [];
}

/** GET /support/tickets/{id} — Get ticket details */
export async function getSupportTicket(id: string): Promise<SupportTicket> {
  const response = await apiClient.get(`/support/tickets/${id}`);
  return unwrapData<SupportTicket>(response.data);
}

/** GET /support/tickets/{id}/messages — Get ticket messages (paged query) */
export async function getSupportTicketMessages(
  id: string,
  params?: {
    PageNumber?: number;
    PageSize?: number;
  }
): Promise<SupportMessage[]> {
  const response = await apiClient.get(`/support/tickets/${id}/messages`, { params });
  const data = unwrapData<any>(response.data);
  return Array.isArray(data) ? data : data?.items ?? [];
}

/** POST /support/tickets/{id}/messages — Send a ticket message */
export async function sendSupportTicketMessage(
  id: string,
  payload: {
    content: string;
  }
): Promise<SupportMessage> {
  const response = await apiClient.post(`/support/tickets/${id}/messages`, payload);
  return unwrapData<SupportMessage>(response.data);
}
