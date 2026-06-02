import { apiClient } from './client';
import { getCategoryGuid, getCategorySlug } from './categories';
import {
  normalizeAvailabilityResponse,
  normalizeScheduleExceptions,
  normalizeWeeklySchedule,
  upsertWeeklyScheduleSlot,
} from './worker-schedules-utils';

export type Review = {
  id?: string;
  reviewerName: string;
  rating: number;
  comment: string;
  date: string;
};

export type WorkerProfile = {
  id: string;
  workerProfileId?: string;
  fullName: string;
  avatarUrl: string;
  phone: string;
  rating: number;
  reviewsCount: number;
  completedJobs: number;
  distance: string;
  basePrice: number;
  isPro: boolean;
  specialties: string[];
  bio: string;
  reviews?: Review[];
  address?: {
    label: string;
    city: string;
    district: string;
    ward: string;
    detail: string;
    lat: number;
    lng: number;
  } | null;
  certificates?: {
    id: string;
    title: string;
    issuedBy: string;
    issuedAt: string;
    imageUrl?: string;
  }[];
  portfolioImages?: {
    id: string;
    url: string;
  }[];
};

function mapBackendWorkerToProfile(w: any): WorkerProfile {
  return {
    id: w.userId || w.id,
    workerProfileId: w.id,
    fullName: w.fullName || 'Kỹ thuật viên',
    avatarUrl: w.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    phone: w.phone || '0987654321',
    rating: w.ratingAvg || 5,
    reviewsCount: w.totalReviews || 0,
    completedJobs: w.totalOrders || 0,
    distance: '1.5 km',
    basePrice: w.services?.[0]?.basePrice || w.basePrice || 150000,
    isPro: w.experienceYears >= 5 || w.isPro || false,
    specialties: w.services?.map((s: any) => getCategorySlug(s.categoryId)) || w.specialties || [],
    bio: w.bio || 'Kỹ thuật viên chuyên nghiệp đã được xác thực bởi Fixy.',
    address: w.address
      ? {
          label: w.address.label || 'Địa chỉ làm việc',
          city: w.address.city || '',
          district: w.address.district || '',
          ward: w.address.ward || '',
          detail: w.address.detail || '',
          lat: w.address.lat ?? 16,
          lng: w.address.lng ?? 108,
        }
      : null,
    certificates:
      (w.certificates || w.centificates || []).length > 0
        ? (w.certificates || w.centificates || []).map((c: any, index: number) => ({
            id: c.id || `cert-${w.id ?? w.userId ?? 'worker'}-${index}`,
            title: c.title || 'Chứng chỉ nghề',
            issuedBy: c.issuedBy || 'Cơ quan có thẩm quyền',
            issuedAt: c.issuedAt || new Date().toISOString(),
            imageUrl: c.certificateImage?.[0]?.fileUrl || c.fileUrl || c.imageUrl || '',
          }))
        : [],
    portfolioImages:
      (w.portfolioImages || w.portfolioMedia || w.portfolio || []).length > 0
        ? (w.portfolioImages || w.portfolioMedia || w.portfolio || []).map(
            (img: any, index: number) => ({
              id: img.id || `portfolio-${w.id ?? w.userId ?? 'worker'}-${index}`,
              url: img.fileUrl || img.url || img || '',
            })
          )
        : [],
  };
}

export async function getWorkersByService(serviceId: string): Promise<WorkerProfile[]> {
  try {
    const categoryGuid = getCategoryGuid(serviceId);
    const response = await apiClient.get(`/worker-profiles?categoryId=${categoryGuid}`);
    const resData = response.data;
    const items = resData?.data?.items ?? resData?.data ?? resData;
    if (items && Array.isArray(items)) {
      return items.map((w: any) => mapBackendWorkerToProfile(w));
    }
    return [];
  } catch (error) {
    console.warn('[workers API] Error getting workers', error);
    return [];
  }
}

export async function getWorkerDetails(id: string): Promise<WorkerProfile | null> {
  const response = await apiClient.get(`/worker-profiles/${id}/public`);
  const resData = response.data;
  const data = resData?.data ?? resData;
  if (data && (data.id || data.userId)) {
    return mapBackendWorkerToProfile(data);
  }
  return null;
}

// ================= Worker Types =================

export type WorkerScheduleWeekly = {
  id?: string;
  workerProfileId: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // "HH:MM:ss"
  endTime: string; // "HH:MM:ss"
  isActive: boolean;
};

export type WorkerScheduleException = {
  id?: string;
  workerProfileId: string;
  date: string; // "yyyy-MM-dd"
  isDayOff: boolean;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string;
};

export type PayoutAccount = {
  id: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountHolderName: string;
  isDefault?: boolean;
  isVerified?: boolean;
};

export type PayoutRequest = {
  id: string;
  payoutAccountId: string;
  amount: number;
  status: number; // 0 = Pending, 1 = Approved, 2 = Rejected, 3 = Transferred
  createdDate: string;
  payoutAccount?: PayoutAccount;
  transferredAt?: string | null;
  rejectReason?: string | null;
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
};

// ================= API Services =================

function unwrapCollection<T = unknown>(payload: unknown): T[] | null {
  const payloadRecord = payload as { data?: unknown } | null | undefined;
  const data = payloadRecord?.data ?? payload;
  const dataRecord = data as { items?: unknown } | null | undefined;
  const items = dataRecord?.items ?? data;
  return Array.isArray(items) ? items : null;
}

function mapBackendPayoutAccount(raw: any): PayoutAccount {
  const backendAccountName =
    typeof raw?.accountName === 'string' && raw.accountName.trim() ? raw.accountName : undefined;
  return {
    id: String(raw?.id ?? `payout-${Date.now()}`),
    bankName: String(raw?.bankName ?? ''),
    bankCode: String(raw?.bankCode ?? ''),
    accountNumber: String(raw?.accountNumber ?? ''),
    accountHolderName: String(backendAccountName ?? raw?.accountHolderName ?? ''),
    isDefault: Boolean(raw?.isDefault),
    isVerified: Boolean(raw?.isVerified),
  };
}

function normalizePayoutStatus(status: unknown): number {
  if (typeof status === 'number') return status;
  if (typeof status !== 'string') return 0;

  const statusMap: Record<string, number> = {
    pending: 0,
    approved: 1,
    rejected: 2,
    transferred: 3,
  };

  return statusMap[status.trim().toLowerCase()] ?? 0;
}

function mapBackendPayoutRequest(raw: any): PayoutRequest {
  const payoutAccountRaw = raw?.payoutAccount ?? raw?.payoutAccountInfo ?? raw?.account;
  // normalize status: accept numeric or string from backend
  const statusNum = normalizePayoutStatus(raw?.status);

  return {
    id: String(raw?.id ?? `payout-req-${Date.now()}`),
    payoutAccountId: String(raw?.payoutAccountId ?? payoutAccountRaw?.id ?? ''),
    amount: Number(raw?.amount ?? 0),
    status: statusNum,
    createdDate: String(
      raw?.createdDate ?? raw?.createdAt ?? raw?.requestedAt ?? new Date().toISOString()
    ),
    payoutAccount: payoutAccountRaw ? mapBackendPayoutAccount(payoutAccountRaw) : undefined,
    transferredAt: raw?.transferredAt ?? raw?.transferred_at ?? null,
    rejectReason: raw?.rejectReason ?? raw?.reject_reason ?? null,
    accountNumber:
      raw?.accountNumber ?? raw?.account_number ?? payoutAccountRaw?.accountNumber ?? undefined,
    accountName:
      raw?.accountName ?? raw?.account_name ?? payoutAccountRaw?.accountHolderName ?? undefined,
    bankName: raw?.bankName ?? raw?.bank_name ?? payoutAccountRaw?.bankName ?? undefined,
  };
}

export async function getWorkerProfileMe(): Promise<WorkerProfile | null> {
  const response = await apiClient.get('/worker-profiles/me');
  const data = response.data?.data ?? response.data;
  if (data) {
    return mapBackendWorkerToProfile(data);
  }
  return null;
}

export async function updateWorkerProfile(profile: Partial<WorkerProfile>): Promise<WorkerProfile> {
  const formData = new FormData();
  if (profile.phone !== undefined) {
    formData.append('Phone', profile.phone);
  }
  if (profile.bio !== undefined) {
    formData.append('Bio', profile.bio);
  }
  formData.append('MaxDistanceKm', '15');
  const exp = profile.completedJobs ? Math.round(profile.completedJobs / 30) : 5;
  formData.append('ExperienceYears', String(exp));

  if (profile.address) {
    formData.append('Address.Label', profile.address.label || 'Địa chỉ làm việc');
    formData.append('Address.City', profile.address.city || '');
    formData.append('Address.District', profile.address.district || '');
    formData.append('Address.Ward', profile.address.ward || '');
    formData.append('Address.Detail', profile.address.detail || '');
    formData.append('Address.Lat', String(profile.address.lat ?? 16));
    formData.append('Address.Lng', String(profile.address.lng ?? 108));
    formData.append('Address.IsDefault', 'true');
  }

  const response = await apiClient.put('/worker-profiles/me', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    transformRequest: (data) => data,
  });
  const data = response.data?.data ?? response.data;
  return mapBackendWorkerToProfile(data);
}

export async function getWeeklySchedule(workerProfileId: string): Promise<WorkerScheduleWeekly[]> {
  try {
    const response = await apiClient.get(`/worker-schedules/${workerProfileId}/weekly`);
    const data = response.data?.data ?? response.data;
    return normalizeWeeklySchedule(workerProfileId, Array.isArray(data) ? data : []);
  } catch (error) {
    console.warn('[workers API] Error getting weekly schedule', error);
    return [];
  }
}

export async function updateWeeklySchedule(
  workerProfileId: string,
  payload: WorkerScheduleWeekly
): Promise<WorkerScheduleWeekly> {
  const response = await apiClient.put(`/worker-schedules/${workerProfileId}/weekly`, {
    dayOfWeek: payload.dayOfWeek,
    startTime: payload.startTime,
    endTime: payload.endTime,
    isActive: payload.isActive,
  });
  const resData = response.data;
  const data = resData?.data ?? resData;
  if (data && typeof data === 'object') {
    return normalizeWeeklySchedule(workerProfileId, [
      { ...payload, ...(data as object) },
    ])[payload.dayOfWeek];
  }
  throw new Error('Invalid response');
}

export async function getExceptions(workerProfileId: string): Promise<WorkerScheduleException[]> {
  try {
    const response = await apiClient.get(`/worker-schedules/${workerProfileId}/exceptions`);
    const data = response.data?.data ?? response.data;
    if (Array.isArray(data)) return normalizeScheduleExceptions(workerProfileId, data);
    throw new Error('No data');
  } catch (error) {
    console.warn('[workers API] Error getting exceptions', error);
    return [];
  }
}

export async function addDayOff(
  payload: Omit<WorkerScheduleException, 'id'>
): Promise<WorkerScheduleException> {
  const response = await apiClient.post(`/worker-schedules/${payload.workerProfileId}/day-off`, {
    date: payload.date,
    reason: payload.reason,
  });
  const resData = response.data;
  const data = resData?.data ?? resData;
  return normalizeScheduleExceptions(payload.workerProfileId, [
    data && typeof data === 'object' ? { ...payload, ...(data as object) } : payload,
  ])[0];
}

export async function deleteDayOff(workerProfileId: string, date: string): Promise<void> {
  await apiClient.delete(
    `/worker-schedules/${workerProfileId}/day-off?date=${encodeURIComponent(date)}`
  );
}

export async function checkAvailability(
  workerProfileId: string,
  bookingTime: string
): Promise<boolean> {
  try {
    const response = await apiClient.post(
      `/worker-schedules/${workerProfileId}/check-availability`,
      {
        bookingTime,
      }
    );
    return normalizeAvailabilityResponse(response.data);
  } catch (error) {
    console.warn('[workers API] Error checking availability', error);
    return false;
  }
}

export async function getPayoutAccounts(): Promise<PayoutAccount[]> {
  try {
    const response = await apiClient.get('/payout-accounts');
    const accounts = unwrapCollection(response.data);
    if (accounts) return accounts.map(mapBackendPayoutAccount);
    return [];
  } catch (error) {
    console.warn('[workers API] Error getting payout accounts', error);
    return [];
  }
}

export async function createPayoutAccount(
  account: Omit<PayoutAccount, 'id'>
): Promise<PayoutAccount> {
  const response = await apiClient.post('/payout-accounts', {
    accountNumber: account.accountNumber,
    accountName: account.accountHolderName,
    bankName: account.bankName,
    bankCode: account.bankCode,
  });
  const data = response.data?.data ?? response.data;
  return mapBackendPayoutAccount({ ...account, ...data });
}

export async function deletePayoutAccount(accountId: string): Promise<void> {
  await apiClient.delete(`/payout-accounts/${accountId}`);
}

export async function setDefaultPayoutAccount(accountId: string): Promise<void> {
  await apiClient.put(`/payout-accounts/${accountId}/default`);
}

export async function getPayoutRequests(): Promise<PayoutRequest[]> {
  try {
    const response = await apiClient.get('/payouts/me');
    const requests = unwrapCollection(response.data);
    if (requests) return requests.map(mapBackendPayoutRequest);
    return [];
  } catch (error) {
    console.warn('[workers API] Error getting payout requests', error);
    return [];
  }
}

export async function requestPayout(payload: {
  payoutAccountId: string;
  amount: number;
}): Promise<PayoutRequest> {
  const response = await apiClient.post('/payouts', null, {
    params: {
      payoutAccountId: payload.payoutAccountId,
      amount: payload.amount,
    },
  });
  const data = response.data?.data ?? response.data;
  return mapBackendPayoutRequest(data);
}

export async function uploadPortfolioImages(
  workerProfileId: string,
  localUris: string[]
): Promise<any> {
  const formData = new FormData();
  localUris.forEach((uri, index) => {
    const filename = uri.split('/').pop() || `portfolio_${Date.now()}_${index}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append('images', {
      uri,
      name: filename,
      type,
    } as any);
  });

  const response = await apiClient.post('/worker-profiles/me/portfolio-images', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    transformRequest: (data) => data,
  });
  return response.data;
}

export async function deletePortfolioImage(workerProfileId: string, mediaId: string): Promise<any> {
  const response = await apiClient.delete(`/worker-profiles/me/portfolio-images/${mediaId}`);
  return response.data;
}

export async function updateIdentificationImages(payload: {
  workerProfileId: string;
  citizenIdNumber: string;
  citizenIdIssueDate: string;
  citizenIdIssuePlace: string;
  localUris: string[];
}): Promise<any> {
  const formData = new FormData();
  formData.append('CitizenIdNumber', payload.citizenIdNumber);
  formData.append('CitizenIdIssueDate', payload.citizenIdIssueDate);
  formData.append('CitizenIdIssuePlace', payload.citizenIdIssuePlace);
  payload.localUris.forEach((uri, index) => {
    const filename = uri.split('/').pop() || `id_${Date.now()}_${index}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append('Images', {
      uri,
      name: filename,
      type,
    } as any);
  });

  const response = await apiClient.put('/worker-profiles/me/identification-images', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    transformRequest: (data) => data,
  });
  return response.data;
}

export async function updateCertificates(payload: {
  workerProfileId: string;
  dtos: {
    title: string;
    issuedBy: string;
    issuedAt: string;
    localUris: string[];
  }[];
}): Promise<any> {
  const formData = new FormData();
  payload.dtos.forEach((dto, index) => {
    formData.append(`dtos[${index}].title`, dto.title);
    formData.append(`dtos[${index}].issuedBy`, dto.issuedBy);
    formData.append(`dtos[${index}].issuedAt`, dto.issuedAt);
    dto.localUris.forEach((uri, fIndex) => {
      const filename = uri.split('/').pop() || `cert_${Date.now()}_${index}_${fIndex}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append(`dtos[${index}].mediaUploads`, {
        uri,
        name: filename,
        type,
      } as any);
    });
  });

  // preservation of C# API typo: centificates
  const response = await apiClient.put('/worker-profiles/me/centificates', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    transformRequest: (data) => data,
  });
  return response.data;
}
