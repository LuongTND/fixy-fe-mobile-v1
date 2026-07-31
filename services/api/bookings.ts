import { apiClient } from './client';
import { getCategoryGuid, getCategorySlug } from './categories';

export enum BookingStatus {
  Pending = 0,
  PendingPayment = 1,
  Matching = 2,
  Confirmed = 3,
  Traveling = 4,
  Arrived = 5,
  InProgress = 6,
  Completed = 7,
  Cancelled = 8,
  Disputed = 9,
}

export enum BookingScheduledType {
  Now = 0,
  Scheduled = 1,
}

export enum PaymentMethod {
  Wallet = 0,
  Vnpay = 1,
  Momo = 2,
  PayOS = 3,
  Card = 4,
  Cash = 5,
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.Wallet]: 'Ví Fixy',
  [PaymentMethod.Vnpay]: 'VNPay',
  [PaymentMethod.Momo]: 'MoMo',
  [PaymentMethod.PayOS]: 'PayOS',
  [PaymentMethod.Card]: 'Thẻ ngân hàng',
  [PaymentMethod.Cash]: 'Tiền mặt',
};

export type BookingDraftInput = {
  categoryId: string;
  addressId?: string | null;
  address: string;
  lat: number;
  lng: number;
  scheduledType: BookingScheduledType | number;
  scheduledAt?: string;
  totalDurationMinutes?: number;
  workerProfileId?: string | null;
  autoMatch: boolean;
};

export type BookingDraft = BookingDraftInput & {
  id?: string;
  draftId?: string;
  expiresAt?: string;
  estimatedAmount?: number;
  estimatedPrice?: number;
};

export type BookingWorkerInfo = {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  phone?: string | null;
  rating?: number;
};

export type Booking = {
  id: string;
  categoryId: string;
  addressId?: string | null;
  address: string;
  lat: number;
  lng: number;
  scheduledType: BookingScheduledType | number;
  scheduledAt?: string;
  workerProfileId?: string | null;
  workerId?: string | null;
  workerName?: string | null;
  workerPhone?: string | null;
  workerAvatarUrl?: string | null;
  autoMatch: boolean;
  status: BookingStatus | number;
  estimatedPrice?: number;
  estimatedAmount?: number;
  finalAmount?: number;
  finalPrice?: number;
  description?: string | null;
  mediaIds?: string[] | null;
  requestImages?: { id: string; fileUrl: string }[];
  completeImages?: { id: string; fileUrl: string }[];
  worker?: BookingWorkerInfo;
  createdDate: string;
  updatedDate?: string;
};

export type WalletOverview = {
  balance: number;
  lifetimeEarned?: number;
  lifetimeSpent?: number;
  recentTransactions?: WalletTransaction[];
};

export type WalletTransaction = {
  id: string;
  type: string;
  direction: 'Credit' | 'Debit' | string;
  amount: number;
  balanceBefore?: number;
  balanceAfter?: number;
  status?: string;
  createdDate?: string;
};

export type BookingPaymentResult = {
  bookingId: string;
  method: PaymentMethod | number;
  paymentUrl?: string;
  redirectUrl?: string;
  transactionId?: string;
  status?: string;
  raw?: unknown;
};

export type BookingTracking = {
  bookingId: string;
  status: string | BookingStatus | number;
  workerLat?: number;
  workerLng?: number;
  locationUpdatedAt?: string;
  workerInfo?: {
    workerId: string;
    fullName: string;
    phone?: string | null;
    avatarUrl?: string | null;
    ratingAvg?: number;
  };
};

export type BookingChatMessage = {
  id: string;
  bookingId?: string;
  senderId?: string;
  senderName?: string;
  type?: number | string;
  content?: string;
  mediaUrl?: string;
  createdDate?: string;
  isRead?: boolean;
};

export type CompleteBookingPayload = {
  mediaIds: string[];
};

const BOOKING_PATH = '/bookings';

function unwrapData<T = any>(responseData: any): T {
  return responseData?.data ?? responseData;
}

function normalizeStatus(status: unknown): BookingStatus | number {
  if (typeof status === 'number') return status;
  if (typeof status !== 'string') return BookingStatus.Pending;

  const numeric = Number(status);
  if (Number.isFinite(numeric)) return numeric;

  const key = status.toLowerCase().replace(/[\s_-]/g, '');
  const statusMap: Record<string, BookingStatus> = {
    pending: BookingStatus.Pending,
    matching: BookingStatus.Matching,
    confirmed: BookingStatus.Confirmed,
    traveling: BookingStatus.Traveling,
    arrived: BookingStatus.Arrived,
    inprogress: BookingStatus.InProgress,
    completed: BookingStatus.Completed,
    cancelled: BookingStatus.Cancelled,
    canceled: BookingStatus.Cancelled,
    disputed: BookingStatus.Disputed,
    pendingpayment: BookingStatus.PendingPayment,
  };

  return statusMap[key] ?? BookingStatus.Pending;
}

function normalizeScheduledType(type: unknown): BookingScheduledType | number {
  if (typeof type === 'number') return type;
  if (typeof type !== 'string') return BookingScheduledType.Now;

  const numeric = Number(type);
  if (Number.isFinite(numeric)) return numeric;

  const key = type.toLowerCase();
  if (key === 'now') return BookingScheduledType.Now;
  if (key === 'scheduled') return BookingScheduledType.Scheduled;
  return BookingScheduledType.Now;
}

function normalizeDraft(raw: any, fallback?: Partial<BookingDraft>): BookingDraft {
  const source = raw ?? {};
  const rawScheduledType =
    source.scheduledType ?? source.ScheduledType ?? source.scheduleType ?? source.ScheduleType;
  const rawScheduledAt =
    source.scheduledAt ?? source.ScheduledAt ?? source.scheduleAt ?? source.ScheduleAt;

  return {
    ...fallback,
    ...source,
    id: source.id ?? source.draftId ?? fallback?.id,
    draftId: source.draftId ?? source.id ?? fallback?.draftId,
    categoryId: source.categoryId
      ? getCategorySlug(source.categoryId)
      : (fallback?.categoryId ?? 'dien'),
    mediaIds: source.mediaIds ?? [],
    addressId: source.addressId ?? fallback?.addressId,
    address: source.address ?? fallback?.address ?? '',
    lat: Number(source.lat ?? fallback?.lat ?? 0),
    lng: Number(source.lng ?? fallback?.lng ?? 0),
    scheduledType: normalizeScheduledType(
      rawScheduledType ?? fallback?.scheduledType ?? BookingScheduledType.Now
    ),
    scheduledAt: rawScheduledAt ?? fallback?.scheduledAt,
    autoMatch: Boolean(source.autoMatch ?? fallback?.autoMatch),
  };
}

function normalizeBooking(raw: any): Booking {
  const source = raw ?? {};
  const worker = source.worker;
  const rawScheduledType =
    source.scheduledType ?? source.ScheduledType ?? source.scheduleType ?? source.ScheduleType;
  const rawScheduledAt =
    source.scheduledAt ?? source.ScheduledAt ?? source.scheduleAt ?? source.ScheduleAt;

  return {
    ...source,
    id: source.id ?? source.bookingId,
    categoryId: source.categoryId ? getCategorySlug(source.categoryId) : 'dien',
    mediaIds: source.mediaIds ?? [],
    address: source.address ?? '',
    lat: Number(source.lat ?? 0),
    lng: Number(source.lng ?? 0),
    scheduledType: normalizeScheduledType(rawScheduledType),
    scheduledAt: rawScheduledAt,
    autoMatch: Boolean(source.autoMatch),
    status: normalizeStatus(source.status),
    finalAmount: source.finalAmount ?? source.finalPrice,
    estimatedAmount: source.estimatedAmount ?? source.estimatedPrice,
    worker:
      worker || source.workerProfileId || source.workerName || source.workerPhone
        ? {
            id:
              worker?.id ??
              worker?.workerId ??
              worker?.workerProfileId ??
              source.workerProfileId ??
              '',
            fullName: worker?.fullName ?? worker?.name ?? source.workerName ?? 'Kỹ thuật viên',
            avatarUrl: worker?.avatarUrl ?? source.workerAvatarUrl ?? null,
            phone: worker?.phone ?? source.workerPhone ?? null,
            rating: worker?.rating ?? worker?.ratingAvg ?? 5,
          }
        : undefined,
    createdDate: source.createdDate ?? source.createdAt ?? new Date().toISOString(),
  };
}

function buildDraftPayload(draft: BookingDraftInput) {
  return {
    categoryId: getCategoryGuid(draft.categoryId),
    addressId: draft.addressId ?? null,
    address: draft.address,
    lat: draft.lat,
    lng: draft.lng,
    scheduledType: draft.scheduledType,
    scheduledAt: draft.scheduledAt,
    totalDurationMinutes: draft.totalDurationMinutes ?? null,
    workerProfileId: draft.workerProfileId ?? null,
    autoMatch: draft.autoMatch,
  };
}

function extractPaymentUrl(raw: any) {
  if (typeof raw === 'string') return raw;
  return (
    raw?.paymentUrl ?? raw?.redirectUrl ?? raw?.checkoutUrl ?? raw?.url ?? raw?.data?.paymentUrl
  );
}

export function isTerminalBookingStatus(status: number) {
  return (
    status === BookingStatus.Completed ||
    status === BookingStatus.Cancelled ||
    status === BookingStatus.Disputed
  );
}

export async function createDraft(draft: BookingDraftInput): Promise<BookingDraft> {
  const response = await apiClient.post(`${BOOKING_PATH}/drafts`, buildDraftPayload(draft));
  const data = unwrapData(response.data);
  return normalizeDraft(data, draft);
}

export async function listDrafts(): Promise<BookingDraft[]> {
  try {
    const response = await apiClient.get(`${BOOKING_PATH}/drafts`);
    const data = unwrapData(response.data);
    const items = Array.isArray(data?.items) ? data.items : data;
    if (Array.isArray(items)) return items.map((item) => normalizeDraft(item));
    return [];
  } catch (error) {
    console.warn('[bookings API] Error listing drafts', error);
    return [];
  }
}

export async function getDraftDetails(draftId: string): Promise<BookingDraft> {
  const response = await apiClient.get(`${BOOKING_PATH}/drafts/${draftId}`);
  const data = unwrapData(response.data);
  return normalizeDraft(data);
}

export async function updateDraft(
  draftId: string,
  draft: BookingDraftInput
): Promise<BookingDraft> {
  const response = await apiClient.put(
    `${BOOKING_PATH}/drafts/${draftId}`,
    buildDraftPayload(draft)
  );
  return normalizeDraft(unwrapData(response.data), draft);
}

export async function deleteDraft(draftId: string): Promise<void> {
  await apiClient.delete(`${BOOKING_PATH}/drafts/${draftId}`);
}

export async function confirmDraft(
  draftId: string
): Promise<{ bookingId: string; booking?: Booking }> {
  const response = await apiClient.post(`${BOOKING_PATH}/drafts/${draftId}/confirm`);
  const data = unwrapData(response.data);
  const bookingId = data?.bookingId ?? data?.id ?? response.data?.bookingId ?? response.data?.id;
  const booking =
    data?.status !== undefined || data?.description ? normalizeBooking(data) : undefined;

  if (bookingId) return { bookingId, booking };
  throw new Error('Confirm response does not include bookingId.');
}

export async function getBookingDetails(bookingId: string): Promise<Booking> {
  const response = await apiClient.get(`${BOOKING_PATH}/${bookingId}`);
  const data = unwrapData(response.data);
  return normalizeBooking(data);
}

export async function getMyBookings(params?: Record<string, unknown>): Promise<Booking[]> {
  try {
    const response = await apiClient.get(`${BOOKING_PATH}/customer`, { params });
    const data = unwrapData(response.data);
    const items = Array.isArray(data?.items) ? data.items : data;
    if (Array.isArray(items)) return items.map((item) => normalizeBooking(item));
    return [];
  } catch (error) {
    console.warn('[bookings API] Error getting bookings', error);
    return [];
  }
}

export async function getWorkerBookings(params?: Record<string, unknown>): Promise<Booking[]> {
  try {
    const response = await apiClient.get(`${BOOKING_PATH}/worker`, { params });
    const data = unwrapData(response.data);
    const items = Array.isArray(data?.items) ? data.items : data;
    return Array.isArray(items) ? items.map((item) => normalizeBooking(item)) : [];
  } catch (error) {
    console.warn('[bookings API] Error getting worker bookings', error);
    return [];
  }
}

export async function acceptBooking(bookingId: string): Promise<Booking> {
  const response = await apiClient.post(`${BOOKING_PATH}/${bookingId}/accept`);
  return normalizeBooking(unwrapData(response.data));
}

export async function declineBooking(bookingId: string, rejectReason: string): Promise<Booking> {
  const response = await apiClient.post(`${BOOKING_PATH}/${bookingId}/decline`, { rejectReason });
  return normalizeBooking(unwrapData(response.data));
}

export async function proposeBooking(
  bookingId: string,
  payload: { proposedPrice: number; proposedTime?: string; proposedNote?: string }
): Promise<Booking> {
  const response = await apiClient.post(`${BOOKING_PATH}/${bookingId}/propose`, payload);
  return normalizeBooking(unwrapData(response.data));
}

export async function respondBookingProposal(
  bookingId: string,
  payload: { accept: boolean; rejectReason?: string }
): Promise<Booking> {
  const response = await apiClient.post(`${BOOKING_PATH}/${bookingId}/respond-proposal`, payload);
  return normalizeBooking(unwrapData(response.data));
}

export async function startTravel(bookingId: string): Promise<Booking> {
  const response = await apiClient.post(`${BOOKING_PATH}/${bookingId}/start-travel`);
  return normalizeBooking(unwrapData(response.data));
}

export async function arriveBooking(bookingId: string): Promise<Booking> {
  const response = await apiClient.post(`${BOOKING_PATH}/${bookingId}/arrive`);
  return normalizeBooking(unwrapData(response.data));
}

export async function startWork(bookingId: string): Promise<Booking> {
  const response = await apiClient.post(`${BOOKING_PATH}/${bookingId}/start-work`);
  return normalizeBooking(unwrapData(response.data));
}

export async function completeBooking(
  bookingId: string,
  payload: CompleteBookingPayload
): Promise<Booking> {
  const response = await apiClient.post(`${BOOKING_PATH}/${bookingId}/complete`, {
    mediaIds: payload.mediaIds,
  });
  return normalizeBooking(unwrapData(response.data));
}

export async function cancelBooking(bookingId: string, reason?: string): Promise<Booking> {
  const response = await apiClient.post(`${BOOKING_PATH}/${bookingId}/cancel`, {
    reason: reason || 'Khách hàng hủy đơn',
  });
  return normalizeBooking(unwrapData(response.data));
}

export async function reorderBooking(bookingId: string): Promise<BookingDraft> {
  const response = await apiClient.post(`${BOOKING_PATH}/${bookingId}/reorder`);
  return normalizeDraft(unwrapData(response.data));
}

export async function reportBookingIssue(
  bookingId: string,
  payload: { category: number; subject: string; description: string; priority: number }
): Promise<any> {
  const response = await apiClient.post(`${BOOKING_PATH}/${bookingId}/report-issue`, payload);
  return unwrapData(response.data);
}

export async function getMatchingQueue(bookingId: string): Promise<any> {
  const response = await apiClient.get(`${BOOKING_PATH}/${bookingId}/matching-queue`);
  return unwrapData(response.data);
}

export async function getBookingTracking(bookingId: string): Promise<BookingTracking | null> {
  try {
    const response = await apiClient.get(`${BOOKING_PATH}/${bookingId}/tracking`);
    const data = unwrapData(response.data);
    if (!data) return null;

    const rawLat =
      data.workerLat ?? data.WorkerLat ?? data.lat ?? data.Lat ?? data.latitude ?? data.Latitude;
    const rawLng =
      data.workerLng ?? data.WorkerLng ?? data.lng ?? data.Lng ?? data.longitude ?? data.Longitude;

    return {
      ...data,
      bookingId: data.bookingId ?? data.BookingId ?? bookingId,
      status: data.status ?? data.Status,
      workerLat: rawLat !== undefined && rawLat !== null && !isNaN(Number(rawLat)) ? Number(rawLat) : undefined,
      workerLng: rawLng !== undefined && rawLng !== null && !isNaN(Number(rawLng)) ? Number(rawLng) : undefined,
      locationUpdatedAt: data.locationUpdatedAt ?? data.LocationUpdatedAt,
      workerInfo: data.workerInfo ?? data.WorkerInfo,
    };
  } catch (error) {
    console.warn('[bookings API] Error getting booking tracking', error);
    return null;
  }
}

export async function updateWorkerLocation(lat: number, lng: number): Promise<void> {
  await apiClient.post('/workers/location', { lat, lng });
}

export async function getWallet(): Promise<WalletOverview | null> {
  try {
    const response = await apiClient.get('/wallet');
    const data = unwrapData(response.data);
    return {
      balance: Number(data?.balance ?? 0),
      lifetimeEarned: data?.lifetimeEarned,
      lifetimeSpent: data?.lifetimeSpent,
      recentTransactions: data?.recentTransactions ?? [],
    };
  } catch (error) {
    console.warn('[wallet API] Error getting wallet overview', error);
    return null;
  }
}

export async function startBookingPayment(
  bookingId: string,
  method: PaymentMethod | number
): Promise<BookingPaymentResult> {
  const response = await apiClient.post(`/payment/booking/${bookingId}`, { method });
  const data = unwrapData(response.data);
  return {
    bookingId,
    method,
    paymentUrl: extractPaymentUrl(data),
    redirectUrl: data?.redirectUrl,
    transactionId: data?.transactionId ?? data?.id,
    status: data?.status,
    raw: data,
  };
}

export async function payBookingWithWallet(bookingId: string): Promise<BookingPaymentResult> {
  const response = await apiClient.post(`/wallet/booking/${bookingId}/wallet`);
  const data = unwrapData(response.data);
  return {
    bookingId,
    method: PaymentMethod.Wallet,
    transactionId: data?.transactionId ?? data?.id,
    status: data?.status ?? 'paid',
    raw: data,
  };
}

export function normalizeChatMessage(msg: any): BookingChatMessage {
  if (!msg) return msg;

  let data = msg;
  if (typeof msg === 'string') {
    try {
      data = JSON.parse(msg);
    } catch {
      // ignore
    }
  }

  // Normalize type: 0 = Text, 1 = Image
  let normalizedType = 0;
  const rawType = data.type !== undefined ? data.type : data.Type;
  if (rawType === 1 || String(rawType).toLowerCase() === 'image') {
    normalizedType = 1;
  }

  return {
    id: String(data.id ?? data.Id ?? data.messageId ?? data.MessageId ?? `msg-${Date.now()}`),
    bookingId: data.bookingId ?? data.BookingId,
    senderId: data.senderId ?? data.SenderId,
    senderName: data.senderName ?? data.SenderName,
    type: normalizedType,
    content: data.content ?? data.Content ?? '',
    mediaUrl: data.mediaUrl ?? data.MediaUrl ?? data.fileUrl ?? data.FileUrl,
    createdDate: data.createdDate ?? data.CreatedDate ?? new Date().toISOString(),
    isRead: data.isRead !== undefined ? data.isRead : data.IsRead,
  };
}

export async function getBookingChatMessages(bookingId: string): Promise<BookingChatMessage[]> {
  const response = await apiClient.get(`${BOOKING_PATH}/${bookingId}/chat/messages`);
  const data = unwrapData(response.data);
  const items = Array.isArray(data?.items) ? data.items : data;
  if (Array.isArray(items)) {
    return items.map((item) => normalizeChatMessage(item));
  }
  return [];
}

export async function sendBookingChatMessage(
  bookingId: string,
  payload: { content?: string; type?: number; file?: unknown }
): Promise<BookingChatMessage> {
  const formData = new FormData();
  formData.append('Type', String(payload.type ?? 0));

  if (payload.content) {
    formData.append('Content', payload.content);
  }

  if (payload.file) {
    formData.append('File', payload.file as any);
  }

  const response = await apiClient.post(`${BOOKING_PATH}/${bookingId}/chat/messages`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return normalizeChatMessage(unwrapData(response.data));
}

export async function markBookingChatRead(bookingId: string): Promise<void> {
  await apiClient.post(`${BOOKING_PATH}/${bookingId}/chat/mark-read`);
}

export type ApiPaymentMethodOption = {
  name: string;
  value: number;
  description?: string;
};

/** GET /enums/PaymentMethod — Fetch available payment methods from BE */
export async function fetchPaymentMethodsApi(): Promise<ApiPaymentMethodOption[]> {
  try {
    const response = await apiClient.get('/enums/PaymentMethod');
    const data = unwrapData(response.data);
    const items = Array.isArray(data) ? data : (data?.items ?? []);
    if (Array.isArray(items) && items.length > 0) {
      return items.map((item: any) => {
        const val = typeof item.value === 'number' ? item.value : (item.Value ?? 5);
        const label = item.displayName ?? item.DisplayName ?? item.description ?? item.Description ?? PAYMENT_METHOD_LABELS[val as PaymentMethod] ?? item.name;
        return {
          name: item.name ?? item.Name ?? String(val),
          value: val,
          description: label,
        };
      });
    }
  } catch (err) {
    // Silent catch if offline or fallback
  }
  return [
    { name: 'Cash', value: PaymentMethod.Cash, description: 'Tiền mặt' },
    { name: 'Wallet', value: PaymentMethod.Wallet, description: 'Ví Fixy' },
    { name: 'Vnpay', value: PaymentMethod.Vnpay, description: 'VNPay' },
    { name: 'Momo', value: PaymentMethod.Momo, description: 'MoMo' },
    { name: 'PayOS', value: PaymentMethod.PayOS, description: 'PayOS' },
    { name: 'Card', value: PaymentMethod.Card, description: 'Thẻ ngân hàng' },
  ];
}
