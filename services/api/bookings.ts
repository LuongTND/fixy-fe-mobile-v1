import { apiClient } from './client';
import { getCategoryGuid, getCategorySlug } from './categories';

export enum BookingStatus {
  Pending = 0,
  Matching = 1,
  Confirmed = 2,
  Traveling = 3,
  Arrived = 4,
  InProgress = 5,
  Completed = 6,
  Cancelled = 7,
  Disputed = 8,
  PendingPayment = 9,
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
  description: string;
  mediaIds: string[];
  addressId?: string | null;
  address: string;
  lat: number;
  lng: number;
  scheduledType: BookingScheduledType | number;
  scheduledAt?: string;
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
  description: string;
  mediaIds: string[];
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
  workerProposedPrice?: number;
  workerProposedTime?: string;
  workerProposedNote?: string;
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

const offlineDrafts: Record<string, BookingDraft> = {};
const offlineBookings: Record<string, Booking> = {
  'booking-sample-1': {
    id: 'booking-sample-1',
    categoryId: 'dien',
    description: 'Sửa ổ cắm điện bị chập cháy ở phòng khách',
    mediaIds: [],
    address: '123 Nguyễn Trãi, Thanh Xuân, Hà Nội',
    lat: 21.0028,
    lng: 105.8056,
    scheduledType: BookingScheduledType.Now,
    autoMatch: false,
    status: BookingStatus.Completed,
    finalAmount: 180000,
    worker: {
      id: 'worker-thang-dien',
      fullName: 'Nguyễn Văn Thắng',
      avatarUrl: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150',
      phone: '0987111222',
      rating: 4.9,
    },
    createdDate: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
};

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
      source.scheduledType ?? fallback?.scheduledType ?? BookingScheduledType.Now
    ),
    autoMatch: Boolean(source.autoMatch ?? fallback?.autoMatch),
  };
}

function normalizeBooking(raw: any): Booking {
  const source = raw ?? {};
  const worker = source.worker;
  return {
    ...source,
    id: source.id ?? source.bookingId,
    categoryId: source.categoryId ? getCategorySlug(source.categoryId) : 'dien',
    mediaIds: source.mediaIds ?? [],
    address: source.address ?? '',
    lat: Number(source.lat ?? 0),
    lng: Number(source.lng ?? 0),
    scheduledType: normalizeScheduledType(source.scheduledType),
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
    description: draft.description,
    mediaIds: draft.mediaIds ?? [],
    addressId: draft.addressId ?? null,
    address: draft.address,
    lat: draft.lat,
    lng: draft.lng,
    scheduledType: draft.scheduledType,
    scheduledAt: draft.scheduledAt,
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
  try {
    const response = await apiClient.post(`${BOOKING_PATH}/drafts`, buildDraftPayload(draft));
    const data = unwrapData(response.data);
    const normalized = normalizeDraft(data, draft);

    if (normalized.id) offlineDrafts[normalized.id] = normalized;
    return normalized;
  } catch (error) {
    console.warn('[bookings API] Error creating draft, falling back offline', error);
    const draftId = `draft-${Date.now()}`;
    const newDraft = normalizeDraft(
      {
        ...draft,
        id: draftId,
        draftId,
        estimatedAmount: draft.workerProfileId ? 150000 : 120000,
      },
      draft
    );
    offlineDrafts[draftId] = newDraft;
    return newDraft;
  }
}

export async function listDrafts(): Promise<BookingDraft[]> {
  try {
    const response = await apiClient.get(`${BOOKING_PATH}/drafts`);
    const data = unwrapData(response.data);
    const items = Array.isArray(data?.items) ? data.items : data;
    if (Array.isArray(items)) return items.map((item) => normalizeDraft(item));
    return Object.values(offlineDrafts);
  } catch (error) {
    console.warn('[bookings API] Error listing drafts, falling back offline', error);
    return Object.values(offlineDrafts);
  }
}

export async function getDraftDetails(draftId: string): Promise<BookingDraft> {
  try {
    const response = await apiClient.get(`${BOOKING_PATH}/drafts/${draftId}`);
    const data = unwrapData(response.data);
    return normalizeDraft(data, offlineDrafts[draftId]);
  } catch (error) {
    console.warn('[bookings API] Error getting draft details, falling back offline', error);
    const localDraft = offlineDrafts[draftId];
    if (localDraft) return localDraft;
    throw new Error('Draft not found.');
  }
}

export async function updateDraft(
  draftId: string,
  draft: BookingDraftInput
): Promise<BookingDraft> {
  try {
    const response = await apiClient.put(
      `${BOOKING_PATH}/drafts/${draftId}`,
      buildDraftPayload(draft)
    );
    const normalized = normalizeDraft(unwrapData(response.data), draft);
    if (normalized.id) offlineDrafts[normalized.id] = normalized;
    return normalized;
  } catch (error) {
    console.warn('[bookings API] Error updating draft, falling back offline', error);
    const updatedDraft = normalizeDraft({ ...draft, id: draftId, draftId }, draft);
    offlineDrafts[draftId] = updatedDraft;
    return updatedDraft;
  }
}

export async function deleteDraft(draftId: string): Promise<void> {
  try {
    await apiClient.delete(`${BOOKING_PATH}/drafts/${draftId}`);
  } finally {
    delete offlineDrafts[draftId];
  }
}

export async function confirmDraft(
  draftId: string
): Promise<{ bookingId: string; booking?: Booking }> {
  try {
    const response = await apiClient.post(`${BOOKING_PATH}/drafts/${draftId}/confirm`);
    const data = unwrapData(response.data);
    const bookingId = data?.bookingId ?? data?.id ?? response.data?.bookingId ?? response.data?.id;
    const booking =
      data?.status !== undefined || data?.description ? normalizeBooking(data) : undefined;

    if (booking?.id) {
      offlineBookings[booking.id] = booking;
    } else if (bookingId) {
      const localDraft = offlineDrafts[draftId];
      offlineBookings[bookingId] = normalizeBooking({
        id: bookingId,
        categoryId: localDraft?.categoryId ?? 'dien',
        description: localDraft?.description ?? 'Yêu cầu sửa chữa',
        mediaIds: localDraft?.mediaIds ?? [],
        address: localDraft?.address ?? '',
        lat: localDraft?.lat ?? 0,
        lng: localDraft?.lng ?? 0,
        scheduledType: localDraft?.scheduledType ?? 0,
        scheduledAt: localDraft?.scheduledAt,
        workerProfileId: localDraft?.workerProfileId,
        autoMatch: localDraft?.autoMatch ?? false,
        status: BookingStatus.Pending,
        createdDate: new Date().toISOString(),
      });
    }

    if (bookingId) return { bookingId, booking: booking || offlineBookings[bookingId] };
    throw new Error('Confirm response does not include bookingId.');
  } catch (error) {
    console.warn('[bookings API] Error confirming draft, falling back offline', error);
    const localDraft = offlineDrafts[draftId];
    const bookingId = `booking-${Date.now()}`;

    if (localDraft) {
      const booking: Booking = normalizeBooking({
        id: bookingId,
        categoryId: localDraft.categoryId,
        description: localDraft.description,
        mediaIds: localDraft.mediaIds,
        addressId: localDraft.addressId,
        address: localDraft.address,
        lat: localDraft.lat,
        lng: localDraft.lng,
        scheduledType: localDraft.scheduledType,
        scheduledAt: localDraft.scheduledAt,
        workerProfileId: localDraft.workerProfileId,
        autoMatch: localDraft.autoMatch,
        status: localDraft.autoMatch ? BookingStatus.Matching : BookingStatus.Pending,
        finalAmount: localDraft.estimatedAmount ?? localDraft.estimatedPrice ?? 150000,
        worker: localDraft.workerProfileId
          ? {
              id: localDraft.workerProfileId,
              fullName: 'Nguyễn Văn Thắng',
              avatarUrl: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150',
              phone: '0987111222',
              rating: 4.9,
            }
          : undefined,
        createdDate: new Date().toISOString(),
      });

      offlineBookings[bookingId] = booking;
      delete offlineDrafts[draftId];
      return { bookingId, booking };
    }

    throw new Error('Draft details not found offline.');
  }
}

export async function getBookingDetails(bookingId: string): Promise<Booking> {
  if (bookingId.startsWith('booking-')) {
    const localBooking = offlineBookings[bookingId];
    if (localBooking) return localBooking;
    throw new Error('Booking not found offline.');
  }

  try {
    const response = await apiClient.get(`${BOOKING_PATH}/${bookingId}`);
    const data = unwrapData(response.data);
    const booking = normalizeBooking(data);
    if (booking.id) offlineBookings[booking.id] = booking;
    return booking;
  } catch (error) {
    console.warn('[bookings API] Error getting booking details, falling back offline', error);

    // Self-healing fallback: query active lists to retrieve this booking object
    try {
      const list = await getMyBookings();
      const found = list.find((b) => b.id === bookingId);
      if (found) {
        console.log('[bookings API] Recovered booking details from customer list:', bookingId);
        offlineBookings[bookingId] = found;
        return found;
      }
    } catch (listErr) {
      console.warn('[bookings API] Customer list recovery failed:', listErr);
    }

    try {
      const list = await getWorkerBookings();
      const found = list.find((b) => b.id === bookingId);
      if (found) {
        console.log('[bookings API] Recovered booking details from worker list:', bookingId);
        offlineBookings[bookingId] = found;
        return found;
      }
    } catch (listErr) {
      console.warn('[bookings API] Worker list recovery failed:', listErr);
    }

    const localBooking = offlineBookings[bookingId];
    if (localBooking) return localBooking;
    throw new Error('Booking not found.');
  }
}

export async function getMyBookings(params?: Record<string, unknown>): Promise<Booking[]> {
  try {
    const response = await apiClient.get(BOOKING_PATH, { params });
    const data = unwrapData(response.data);
    const items = Array.isArray(data?.items) ? data.items : data;
    if (Array.isArray(items)) return items.map((item) => normalizeBooking(item));
    return Object.values(offlineBookings);
  } catch (error) {
    console.warn('[bookings API] Error getting bookings, falling back offline', error);
    return Object.values(offlineBookings);
  }
}

export async function getWorkerBookings(params?: Record<string, unknown>): Promise<Booking[]> {
  try {
    const response = await apiClient.get(`${BOOKING_PATH}/worker`, { params });
    const data = unwrapData(response.data);
    const items = Array.isArray(data?.items) ? data.items : data;
    return Array.isArray(items) ? items.map((item) => normalizeBooking(item)) : [];
  } catch (error) {
    console.warn('[bookings API] Error getting worker bookings, falling back offline', error);
    return Object.values(offlineBookings).filter((b) => b.workerId || b.worker?.id);
  }
}

export async function acceptBooking(bookingId: string): Promise<Booking> {
  if (bookingId.startsWith('booking-')) {
    const booking = offlineBookings[bookingId];
    if (booking) {
      booking.status = BookingStatus.Confirmed;
      return booking;
    }
    throw new Error('Booking not found offline.');
  }
  try {
    const response = await apiClient.post(`${BOOKING_PATH}/${bookingId}/accept`);
    const booking = normalizeBooking(unwrapData(response.data));
    if (booking.id) offlineBookings[booking.id] = booking;
    return booking;
  } catch (error) {
    console.warn('[bookings API] Error accepting booking, falling back offline', error);
    const booking = offlineBookings[bookingId];
    if (booking) {
      booking.status = BookingStatus.Confirmed;
      return booking;
    }
    throw error;
  }
}

export async function declineBooking(bookingId: string, rejectReason: string): Promise<Booking> {
  if (bookingId.startsWith('booking-')) {
    const booking = offlineBookings[bookingId];
    if (booking) {
      booking.status = BookingStatus.Cancelled;
      return booking;
    }
    throw new Error('Booking not found offline.');
  }
  try {
    const response = await apiClient.post(`${BOOKING_PATH}/${bookingId}/decline`, { rejectReason });
    const booking = normalizeBooking(unwrapData(response.data));
    if (booking.id) offlineBookings[booking.id] = booking;
    return booking;
  } catch (error) {
    console.warn('[bookings API] Error declining booking, falling back offline', error);
    const booking = offlineBookings[bookingId];
    if (booking) {
      booking.status = BookingStatus.Cancelled;
      return booking;
    }
    throw error;
  }
}

export async function proposeBooking(
  bookingId: string,
  payload: { proposedPrice: number; proposedTime?: string; proposedNote?: string }
): Promise<Booking> {
  if (bookingId.startsWith('booking-')) {
    const booking = offlineBookings[bookingId];
    if (booking) {
      booking.status = BookingStatus.Pending;
      booking.workerProposedPrice = payload.proposedPrice;
      booking.workerProposedTime = payload.proposedTime;
      booking.workerProposedNote = payload.proposedNote;
      return booking;
    }
    throw new Error('Booking not found offline.');
  }
  try {
    const response = await apiClient.post(`${BOOKING_PATH}/${bookingId}/propose`, payload);
    const booking = normalizeBooking(unwrapData(response.data));
    if (booking.id) offlineBookings[booking.id] = booking;
    return booking;
  } catch (error) {
    console.warn('[bookings API] Error proposing booking, falling back offline', error);
    const booking = offlineBookings[bookingId];
    if (booking) {
      booking.workerProposedPrice = payload.proposedPrice;
      booking.workerProposedTime = payload.proposedTime;
      booking.workerProposedNote = payload.proposedNote;
      return booking;
    }
    throw error;
  }
}

export async function respondBookingProposal(
  bookingId: string,
  payload: { accept: boolean; rejectReason?: string }
): Promise<Booking> {
  if (bookingId.startsWith('booking-')) {
    const booking = offlineBookings[bookingId];
    if (booking) {
      booking.status = payload.accept ? BookingStatus.Confirmed : BookingStatus.Cancelled;
      return booking;
    }
    throw new Error('Booking not found offline.');
  }
  try {
    const response = await apiClient.post(`${BOOKING_PATH}/${bookingId}/respond-proposal`, payload);
    const booking = normalizeBooking(unwrapData(response.data));
    if (booking.id) offlineBookings[booking.id] = booking;
    return booking;
  } catch (error) {
    console.warn('[bookings API] Error responding proposal, falling back offline', error);
    const booking = offlineBookings[bookingId];
    if (booking) {
      booking.status = payload.accept ? BookingStatus.Confirmed : BookingStatus.Cancelled;
      return booking;
    }
    throw error;
  }
}

export async function startTravel(bookingId: string): Promise<Booking> {
  if (bookingId.startsWith('booking-')) {
    const booking = offlineBookings[bookingId];
    if (booking) {
      booking.status = BookingStatus.Traveling;
      return booking;
    }
    throw new Error('Booking not found offline.');
  }
  try {
    const response = await apiClient.post(`${BOOKING_PATH}/${bookingId}/start-travel`);
    const booking = normalizeBooking(unwrapData(response.data));
    if (booking.id) offlineBookings[booking.id] = booking;
    return booking;
  } catch (error) {
    console.warn('[bookings API] Error starting travel, falling back offline', error);
    const booking = offlineBookings[bookingId];
    if (booking) {
      booking.status = BookingStatus.Traveling;
      return booking;
    }
    throw error;
  }
}

export async function arriveBooking(bookingId: string): Promise<Booking> {
  if (bookingId.startsWith('booking-')) {
    const booking = offlineBookings[bookingId];
    if (booking) {
      booking.status = BookingStatus.Arrived;
      return booking;
    }
    throw new Error('Booking not found offline.');
  }
  try {
    const response = await apiClient.post(`${BOOKING_PATH}/${bookingId}/arrive`);
    const booking = normalizeBooking(unwrapData(response.data));
    if (booking.id) offlineBookings[booking.id] = booking;
    return booking;
  } catch (error) {
    console.warn('[bookings API] Error arriving booking, falling back offline', error);
    const booking = offlineBookings[bookingId];
    if (booking) {
      booking.status = BookingStatus.Arrived;
      return booking;
    }
    throw error;
  }
}

export async function startWork(bookingId: string): Promise<Booking> {
  if (bookingId.startsWith('booking-')) {
    const booking = offlineBookings[bookingId];
    if (booking) {
      booking.status = BookingStatus.InProgress;
      return booking;
    }
    throw new Error('Booking not found offline.');
  }
  try {
    const response = await apiClient.post(`${BOOKING_PATH}/${bookingId}/start-work`);
    const booking = normalizeBooking(unwrapData(response.data));
    if (booking.id) offlineBookings[booking.id] = booking;
    return booking;
  } catch (error) {
    console.warn('[bookings API] Error starting work, falling back offline', error);
    const booking = offlineBookings[bookingId];
    if (booking) {
      booking.status = BookingStatus.InProgress;
      return booking;
    }
    throw error;
  }
}

export async function completeBooking(
  bookingId: string,
  payload: CompleteBookingPayload
): Promise<Booking> {
  if (bookingId.startsWith('booking-')) {
    const booking = offlineBookings[bookingId];
    if (booking) {
      booking.status = BookingStatus.Completed;
      return booking;
    }
    throw new Error('Booking not found offline.');
  }
  try {
    const response = await apiClient.post(`${BOOKING_PATH}/${bookingId}/complete`, {
      mediaIds: payload.mediaIds,
    });
    const booking = normalizeBooking(unwrapData(response.data));
    if (booking.id) offlineBookings[booking.id] = booking;
    return booking;
  } catch (error) {
    console.warn('[bookings API] Error completing booking, falling back offline', error);
    const booking = offlineBookings[bookingId];
    if (booking) {
      booking.status = BookingStatus.Completed;
      return booking;
    }
    throw error;
  }
}

export async function getBookingTracking(bookingId: string): Promise<BookingTracking | null> {
  if (bookingId.startsWith('booking-')) {
    const booking = offlineBookings[bookingId];
    if (booking) {
      return {
        bookingId,
        status: booking.status,
        workerLat: 21.0028,
        workerLng: 105.8056,
        locationUpdatedAt: new Date().toISOString(),
        workerInfo: booking.worker
          ? {
              workerId: booking.worker.id,
              fullName: booking.worker.fullName,
              phone: booking.worker.phone,
              avatarUrl: booking.worker.avatarUrl,
              ratingAvg: booking.worker.rating,
            }
          : undefined,
      };
    }
    return null;
  }
  try {
    const response = await apiClient.get(`${BOOKING_PATH}/${bookingId}/tracking`);
    return unwrapData<BookingTracking>(response.data);
  } catch (error) {
    console.warn('[bookings API] Error getting tracking', error);
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
  if (bookingId.startsWith('booking-')) {
    return {
      bookingId,
      method,
      status: 'paid',
      transactionId: `tx-${Date.now()}`,
    };
  }
  try {
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
  } catch (error) {
    console.warn('[payment API] Error starting booking payment', error);
    if (method === PaymentMethod.Wallet) return payBookingWithWallet(bookingId);
    throw error;
  }
}

export async function payBookingWithWallet(bookingId: string): Promise<BookingPaymentResult> {
  if (bookingId.startsWith('booking-')) {
    return {
      bookingId,
      method: PaymentMethod.Wallet,
      status: 'paid',
      transactionId: `tx-${Date.now()}`,
    };
  }
  try {
    const response = await apiClient.post(`/wallet/booking/${bookingId}/wallet`);
    const data = unwrapData(response.data);
    return {
      bookingId,
      method: PaymentMethod.Wallet,
      transactionId: data?.transactionId ?? data?.id,
      status: data?.status ?? 'paid',
      raw: data,
    };
  } catch (error) {
    console.warn('[wallet API] Error paying booking with wallet, using offline success', error);
    const localBooking = offlineBookings[bookingId];
    if (localBooking) {
      offlineBookings[bookingId] = {
        ...localBooking,
        status: BookingStatus.Completed,
        updatedDate: new Date().toISOString(),
      };
      return {
        bookingId,
        method: PaymentMethod.Wallet,
        status: 'paid-offline',
      };
    }
    throw error;
  }
}

export async function getBookingChatMessages(bookingId: string): Promise<BookingChatMessage[]> {
  const response = await apiClient.get(`${BOOKING_PATH}/${bookingId}/chat/messages`);
  const data = unwrapData(response.data);
  const items = Array.isArray(data?.items) ? data.items : data;
  return Array.isArray(items) ? items : [];
}

export async function sendBookingChatMessage(
  bookingId: string,
  payload: { content?: string; type?: number; file?: unknown }
): Promise<BookingChatMessage> {
  if (payload.file) {
    const formData = new FormData();
    formData.append('Type', String(payload.type ?? 1));
    if (payload.content) formData.append('Content', payload.content);
    formData.append('File', payload.file as any);

    const response = await apiClient.post(`${BOOKING_PATH}/${bookingId}/chat/messages`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrapData(response.data);
  }

  const response = await apiClient.post(`${BOOKING_PATH}/${bookingId}/chat/messages`, {
    type: payload.type ?? 0,
    content: payload.content ?? '',
  });
  return unwrapData(response.data);
}

export async function markBookingChatRead(bookingId: string): Promise<void> {
  await apiClient.post(`${BOOKING_PATH}/${bookingId}/chat/mark-read`);
}
