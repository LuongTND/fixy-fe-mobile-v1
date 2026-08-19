import { apiClient } from './client';
import { prepareUploadFile } from './media';
import { getCategoryGuid, getCategorySlug } from './categories';
import { formatToIsoDateTime } from '@/utils/format';
import {
  normalizeAvailabilityResponse,
  normalizeScheduleExceptions,
  normalizeWeeklySchedule,
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
  avatarUrl?: string;
  avatarFile?: any;
  phone: string;
  badge: number; // 0: NewArrival, 1: Updated, 2: Quality, 3: Gold
  rating: number;
  reviewsCount: number;
  completedJobs: number;
  distance: string;
  distanceKm?: number | null;
  city?: string;
  estimatedArrivalMinutes?: number | null;
  basePrice: number;
  isOnline?: boolean;
  isAcceptingJobs?: boolean;
  isBusy?: boolean;
  isPro: boolean;
  specialties: string[];
  bio: string;
  status?: number;
  rejectReason?: string;
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
  experienceYears?: number;
  maxDistanceKm?: number;
  citizenIdNumber?: string;
  citizenIdIssueDate?: string;
  citizenIdIssuePlace?: string;
  faceImageUrl?: string;
  isFaceMatched?: boolean;
  faceMatchScore?: number;
  faceVerifiedAt?: string;
  user?: {
    id?: string;
    fullName?: string;
    phone?: string;
    faceImageUrl?: string;
    isFaceMatched?: boolean;
    faceMatchScore?: number;
    faceVerifiedAt?: string;
  };
  identificationImages?: {
    id: string;
    url: string;
  }[];
  services?: {
    categoryId: string;
    basePrice: number;
    isPrimary?: boolean;
    options?: {
      id?: string;
      workerServiceId?: string;
      durationMinutes: number;
      price: number;
      sortOrder?: number;
      isActive?: boolean;
    }[];
  }[];
};

export type WorkerSearchParams = {
  CategoryId?: string;
  CustomerLat?: number;
  CustomerLng?: number;
  RadiusKm?: number;
  City?: string;
  District?: string;
  Ward?: string;
  MinPrice?: number;
  MaxPrice?: number;
  MinRating?: number;
  IsOnline?: boolean;
  PageNumber?: number;
  PageSize?: number;
  SearchTerm?: string;
  SortBy?: string;
  SortDescending?: boolean;
};

function getWorkerBasePrice(w: any, categoryId?: string) {
  const matchingService = categoryId
    ? w.services?.find((service: any) => service.categoryId === categoryId)
    : undefined;
  return matchingService?.basePrice || w.services?.[0]?.basePrice || w.basePrice || 150000;
}

function mapBackendWorkerToProfile(w: any, categoryId?: string): WorkerProfile {
  let status: number | undefined;
  if (w.status !== undefined && w.status !== null) {
    if (typeof w.status === 'number') {
      status = w.status;
    } else {
      const parsed = parseInt(String(w.status), 10);
      if (!isNaN(parsed)) {
        status = parsed;
      } else {
        const statusMap: Record<string, number> = {
          pending: 0,
          approved: 1,
          rejected: 2,
          suspended: 3,
        };
        status = statusMap[String(w.status).toLowerCase().trim()] ?? 0;
      }
    }
  } else if (w.approvalStatus !== undefined && w.approvalStatus !== null) {
    if (typeof w.approvalStatus === 'number') {
      status = w.approvalStatus;
    } else {
      const parsed = parseInt(String(w.approvalStatus), 10);
      if (!isNaN(parsed)) {
        status = parsed;
      } else {
        const statusMap: Record<string, number> = {
          pending: 0,
          approved: 1,
          rejected: 2,
          suspended: 3,
        };
        status = statusMap[String(w.approvalStatus).toLowerCase().trim()] ?? 0;
      }
    }
  }

  // Format distance label from distanceKm
  const distanceKm = typeof w.distanceKm === 'number' ? w.distanceKm : null;
  const distanceLabel = distanceKm != null
    ? (distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)} km`)
    : '';

  return {
    id: w.userId || w.id,
    workerProfileId: w.id || w.workerProfileId,
    fullName: w.fullName || 'Kỹ thuật viên',
    avatarUrl: w.avatarUrl || w.AvatarUrl || w.avatar || w.Avatar || w.user?.avatarUrl || w.user?.AvatarUrl || undefined,
    phone: w.phone || '',
    badge: typeof w.badge === 'number' ? w.badge : (typeof w.badge === 'string' ? ({'NewArrival': 0, 'Updated': 1, 'Quality': 2, 'Gold': 3} as Record<string, number>)[w.badge] ?? 0 : 0),
    rating: typeof w.ratingAvg === 'number' && w.ratingAvg > 0 ? w.ratingAvg : 5.0,
    reviewsCount: typeof w.totalReviews === 'number' ? w.totalReviews : 0,
    completedJobs: typeof w.totalOrders === 'number' ? w.totalOrders : 0,
    distance: distanceLabel,
    distanceKm,
    city: w.city || w.address?.city || '',
    estimatedArrivalMinutes: typeof w.estimatedArrivalMinutes === 'number' ? w.estimatedArrivalMinutes : null,
    basePrice: getWorkerBasePrice(w, categoryId),
    isOnline: w.isOnline ?? w.online ?? w.isAvailableOnline ?? true,
    isAcceptingJobs: w.isAcceptingJobs ?? w.isOnline ?? true,
    isBusy: w.isBusy ?? w.IsBusy ?? false,
    isPro: w.experienceYears >= 5 || w.isPro || false,
    specialties: w.services?.map((s: any) => getCategorySlug(s.categoryId)) || w.specialties || [],
    bio: w.bio || 'Kỹ thuật viên chuyên nghiệp đã được xác thực bởi Fixy.',
    status,
    rejectReason: w.rejectReason || w.reject_reason || '',
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
    experienceYears: w.experienceYears || 0,
    maxDistanceKm: w.maxDistanceKm || 15,
    citizenIdNumber: w.citizenIdNumber || '',
    citizenIdIssueDate: w.citizenIdIssueDate || '',
    citizenIdIssuePlace: w.citizenIdIssuePlace || '',
    faceImageUrl: w.faceImageUrl || w.user?.faceImageUrl || undefined,
    isFaceMatched: w.isFaceMatched ?? w.user?.isFaceMatched ?? false,
    faceMatchScore: w.faceMatchScore ?? w.user?.faceMatchScore ?? undefined,
    faceVerifiedAt: w.faceVerifiedAt || w.user?.faceVerifiedAt || undefined,
    user: w.user
      ? {
          id: w.user.id,
          fullName: w.user.fullName,
          phone: w.user.phone,
          faceImageUrl: w.user.faceImageUrl,
          isFaceMatched: w.user.isFaceMatched,
          faceMatchScore: w.user.faceMatchScore,
          faceVerifiedAt: w.user.faceVerifiedAt,
        }
      : undefined,
    identificationImages:
      (w.identificationImages || w.identificationMedia || []).map(
        (img: any, index: number) => ({
          id: img.id || `id-${w.id ?? w.userId ?? 'worker'}-${index}`,
          url: img.fileUrl || img.url || img || '',
        })
      ),
    services:
      (w.services || w.Services || [])?.map((s: any) => {
        const rawOpts = s.options || s.Options || [];
        return {
          categoryId: s.categoryId || s.CategoryId,
          basePrice: s.basePrice ?? s.BasePrice,
          isPrimary: s.isPrimary ?? s.IsPrimary,
          options: rawOpts.map((opt: any) => ({
            id: opt.id || opt.Id,
            workerServiceId: opt.workerServiceId || opt.WorkerServiceId,
            durationMinutes: typeof opt.durationMinutes === 'number' ? opt.durationMinutes : (typeof opt.DurationMinutes === 'number' ? opt.DurationMinutes : 60),
            price: typeof opt.price === 'number' ? opt.price : (typeof opt.Price === 'number' ? opt.Price : (s.basePrice ?? 0)),
            sortOrder: opt.sortOrder ?? opt.SortOrder ?? 1,
            isActive: opt.isActive ?? opt.IsActive ?? true,
          })),
        };
      }) || [],
  };
}

export async function getWorkersByService(serviceId: string): Promise<WorkerProfile[]> {
  return searchWorkers({
    CategoryId: getCategoryGuid(serviceId),
    PageNumber: 1,
    PageSize: 20,
  });
}

export async function searchWorkers(params: WorkerSearchParams): Promise<WorkerProfile[]> {
  try {
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let resolvedCategoryId = params.CategoryId;
    if (resolvedCategoryId && !guidRegex.test(resolvedCategoryId)) {
      resolvedCategoryId = getCategoryGuid(resolvedCategoryId);
    }

    const queryParams: Record<string, any> = {};
    if (resolvedCategoryId && guidRegex.test(resolvedCategoryId)) {
      queryParams.CategoryId = resolvedCategoryId;
    }
    if (params.PageNumber) queryParams.PageNumber = params.PageNumber;
    if (params.PageSize) queryParams.PageSize = params.PageSize;
    if (params.SearchTerm) queryParams.SearchTerm = params.SearchTerm;
    if (params.MinPrice) queryParams.MinPrice = params.MinPrice;
    if (params.MaxPrice) queryParams.MaxPrice = params.MaxPrice;
    if (params.MinRating) queryParams.MinRating = params.MinRating;
    if (params.City) queryParams.City = params.City;
    if (params.IsOnline !== undefined) queryParams.IsOnline = params.IsOnline;
    if (params.CustomerLat !== undefined) queryParams.CustomerLat = params.CustomerLat;
    if (params.CustomerLng !== undefined) queryParams.CustomerLng = params.CustomerLng;
    if (params.RadiusKm !== undefined) queryParams.RadiusKm = params.RadiusKm;
    if (params.SortBy) queryParams.SortBy = params.SortBy;
    if (params.SortDescending !== undefined) queryParams.SortDescending = params.SortDescending;

    const response = await apiClient.get('/worker-profiles/search', {
      params: queryParams,
    });
    const resData = response.data;
    const items = resData?.data?.items ?? resData?.data ?? resData;
    if (items && Array.isArray(items)) {
      return items.map((w: any) => mapBackendWorkerToProfile(w, resolvedCategoryId));
    }
    return [];
  } catch (error) {
    console.warn('[workers API] Error getting workers', error);
    return [];
  }
}

export async function getWorkerDetails(id: string): Promise<WorkerProfile | null> {
  try {
    if (!id) return null;
    try {
      const response = await apiClient.get(`/worker-profiles/${id}/public`);
      const resData = response.data;
      const data = resData?.data ?? resData;
      if (data && (data.id || data.userId)) {
        return mapBackendWorkerToProfile(data);
      }
    } catch {
      // Fallback: look up in search if endpoint by GUID failed
      const searchRes = await apiClient.get('/worker-profiles/search', { params: { PageSize: 50 } });
      const searchData = searchRes.data?.data?.items ?? searchRes.data?.items ?? [];
      const match = searchData.find((w: any) => w.id === id || w.userId === id);
      if (match) {
        return mapBackendWorkerToProfile(match);
      }
    }
    return null;
  } catch (error) {
    console.warn('[workers API] Error getting worker details:', error);
    return null;
  }
}

// ================= Worker Types =================

export type WorkerScheduleWeekly = {
  id?: string;
  workerProfileId: string;
  dayOfWeek: number; // 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
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
  payoutCode: string;
  amount: number;
  status: number; // 0 = Pending, 1 = Approved, 2 = Rejected, 3 = Transferred
  createdDate: string;
  payoutAccount?: PayoutAccount;
  transferredAt?: string | null;
  rejectReason?: string | null;
  gatewayTransactionRef?: string | null;
  vietQrUrl?: string | null;
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  bankCode?: string;
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
    payoutCode: String(raw?.payoutCode ?? ''),
    amount: Number(raw?.amount ?? 0),
    status: statusNum,
    createdDate: String(
      raw?.createdDate ?? raw?.createdAt ?? raw?.requestedAt ?? new Date().toISOString()
    ),
    payoutAccount: payoutAccountRaw ? mapBackendPayoutAccount(payoutAccountRaw) : undefined,
    transferredAt: raw?.transferredAt ?? raw?.transferred_at ?? null,
    rejectReason: raw?.rejectReason ?? raw?.reject_reason ?? null,
    gatewayTransactionRef: raw?.gatewayTransactionRef ?? null,
    vietQrUrl: raw?.vietQrUrl ?? null,
    accountNumber:
      raw?.accountNumber ?? raw?.account_number ?? payoutAccountRaw?.accountNumber ?? undefined,
    accountName:
      raw?.accountName ?? raw?.account_name ?? payoutAccountRaw?.accountHolderName ?? undefined,
    bankName: raw?.bankName ?? raw?.bank_name ?? payoutAccountRaw?.bankName ?? undefined,
    bankCode: raw?.bankCode ?? raw?.bank_code ?? payoutAccountRaw?.bankCode ?? undefined,
  };
}

export async function registerWorkerProfile(formData: FormData): Promise<WorkerProfile> {
  const response = await apiClient.post('/worker-profiles/register', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    transformRequest: (data) => data,
    timeout: 60000,
  });
  const data = response.data?.data ?? response.data;
  return mapBackendWorkerToProfile(data);
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
  if (profile.avatarFile) {
    const file = profile.avatarFile;
    formData.append('Avatar', {
      uri: file.uri,
      type: file.type || 'image/jpeg',
      name: file.name || 'avatar.jpg',
    } as any);
  }
  if (profile.phone) {
    formData.append('Phone', profile.phone);
  }
  if (profile.bio !== undefined) {
    formData.append('Bio', profile.bio);
  }
  if (profile.maxDistanceKm !== undefined) {
    formData.append('MaxDistanceKm', String(profile.maxDistanceKm));
  }
  if (profile.experienceYears !== undefined) {
    formData.append('ExperienceYears', String(profile.experienceYears));
  }

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

  if (profile.services) {
    profile.services.forEach((s, index) => {
      formData.append(`Services[${index}].CategoryId`, s.categoryId);
      formData.append(`Services[${index}].BasePrice`, String(s.basePrice));
      formData.append(`Services[${index}].IsPrimary`, s.isPrimary ? 'true' : 'false');
      if (s.options && s.options.length > 0) {
        s.options.forEach((opt, optIndex) => {
          formData.append(`Services[${index}].Options[${optIndex}].DurationMinutes`, String(opt.durationMinutes));
          formData.append(`Services[${index}].Options[${optIndex}].Price`, String(opt.price));
          if (opt.sortOrder !== undefined) {
            formData.append(`Services[${index}].Options[${optIndex}].SortOrder`, String(opt.sortOrder));
          }
          if (opt.isActive !== undefined) {
            formData.append(`Services[${index}].Options[${optIndex}].IsActive`, String(opt.isActive ? 'true' : 'false'));
          }
        });
      }
    });
  }

  const response = await apiClient.patch('/worker-profiles/me', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    transformRequest: (data) => data,
    timeout: 60000,
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
    return normalizeWeeklySchedule(workerProfileId, [{ ...payload, ...(data as object) }])[
      payload.dayOfWeek
    ];
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
  const fileObjs = await Promise.all(
    localUris.map((uri, index) => prepareUploadFile(uri, `portfolio_${Date.now()}_${index}.jpg`))
  );
  fileObjs.forEach((fileObj) => {
    if (fileObj) {
      formData.append('images', fileObj);
    }
  });

  const response = await apiClient.post('/worker-profiles/me/portfolio-images', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    transformRequest: (data) => data,
    timeout: 60000,
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
  faceSelfieUri?: string | null;
  faceMatchScore?: number | null;
}): Promise<any> {
  const formData = new FormData();
  formData.append('CitizenIdNumber', payload.citizenIdNumber);
  formData.append('CitizenIdIssueDate', formatToIsoDateTime(payload.citizenIdIssueDate));
  formData.append('CitizenIdIssuePlace', payload.citizenIdIssuePlace);
  if (payload.faceMatchScore !== undefined && payload.faceMatchScore !== null) {
    formData.append('FaceMatchScore', String(payload.faceMatchScore));
  }
  if (payload.faceSelfieUri) {
    const selfieObj = await prepareUploadFile(payload.faceSelfieUri, `selfie_${Date.now()}.jpg`, {
      compress: true,
      resizeWidth: 1024,
      quality: 0.8,
    });
    if (selfieObj) {
      formData.append('FaceSelfie', selfieObj);
    }
  }
  const fileObjs = await Promise.all(
    payload.localUris.map((uri, index) =>
      prepareUploadFile(uri, `id_${Date.now()}_${index}.jpg`, { compress: true, resizeWidth: 1600, quality: 0.7 })
    )
  );
  fileObjs.forEach((fileObj) => {
    if (fileObj) {
      formData.append('Images', fileObj);
    }
  });

  const response = await apiClient.put('/worker-profiles/me/identification-images', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    transformRequest: (data) => data,
    timeout: 60000,
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
  for (let index = 0; index < payload.dtos.length; index++) {
    const dto = payload.dtos[index];
    formData.append(`dtos[${index}].title`, dto.title);
    formData.append(`dtos[${index}].issuedBy`, dto.issuedBy);
    formData.append(`dtos[${index}].issuedAt`, dto.issuedAt);
    const fileObjs = await Promise.all(
      dto.localUris.map((uri, fIndex) =>
        prepareUploadFile(uri, `cert_${Date.now()}_${index}_${fIndex}.jpg`)
      )
    );
    fileObjs.forEach((fileObj) => {
      if (fileObj) {
        formData.append(`dtos[${index}].mediaUploads`, fileObj);
      }
    });
  }

  // preservation of C# API typo: centificates
  const response = await apiClient.put('/worker-profiles/me/centificates', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    transformRequest: (data) => data,
    timeout: 60000,
  });
  return response.data;
}

export interface SearchWorkersParams {
  CategoryId?: string;
  CustomerLat?: number;
  CustomerLng?: number;
  RadiusKm?: number;
  City?: string;
  District?: string;
  Ward?: string;
  MinPrice?: number;
  MaxPrice?: number;
  MinRating?: number;
  IsOnline?: boolean;
  PageNumber?: number;
  PageSize?: number;
  SearchTerm?: string;
  SortBy?: string;
  SortDescending?: boolean;
}

export interface SearchWorkersResponse {
  items: WorkerProfile[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/** GET /worker-profiles/search — Search worker profiles with query filters */
export async function searchWorkerProfiles(
  params: SearchWorkersParams
): Promise<SearchWorkersResponse> {
  const queryParams = { ...params };
  if (params.CategoryId) {
    queryParams.CategoryId = getCategoryGuid(params.CategoryId);
  }

  const response = await apiClient.get('/worker-profiles/search', { params: queryParams });
  const resData = response.data;
  const data = resData?.data ?? resData;
  const items = data?.items ?? [];

  return {
    items: Array.isArray(items) ? items.map((w: any) => mapBackendWorkerToProfile(w)) : [],
    pageNumber: data?.pageNumber ?? 1,
    pageSize: data?.pageSize ?? 10,
    totalCount: data?.totalCount ?? 0,
    totalPages: data?.totalPages ?? 1,
    hasPreviousPage: data?.hasPreviousPage ?? false,
    hasNextPage: data?.hasNextPage ?? false,
  };
}

/** PATCH /worker-profiles/me/working-status — Update worker online & job accepting status */
export async function updateWorkingStatus(isAcceptingJobs: boolean, isOnline?: boolean): Promise<void> {
  await apiClient.patch('/worker-profiles/me/working-status', {
    isAcceptingJobs,
    isOnline: isOnline ?? isAcceptingJobs,
  });
}
