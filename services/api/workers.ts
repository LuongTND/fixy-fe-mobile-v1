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

// Rich mock database for local fallbacks
const MOCK_WORKERS: WorkerProfile[] = [
  {
    id: 'worker-thang-dien',
    fullName: 'Nguyễn Văn Thắng',
    avatarUrl: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150',
    phone: '0987111222',
    rating: 4.9,
    reviewsCount: 128,
    completedJobs: 256,
    distance: '1.2 km',
    basePrice: 150000,
    isPro: true,
    specialties: ['dien', 'dieuhoa'],
    bio: 'Kỹ sư cơ điện với hơn 10 năm kinh nghiệm. Chuyên khắc phục sự cố điện gia đình chập cháy, đi dây âm tường và bảo dưỡng điều hòa gia đình.',
    reviews: [
      {
        reviewerName: 'Trần Anh',
        rating: 5,
        comment: 'Anh Thắng nhiệt tình, sửa chữa tủ điện nhanh và dọn dẹp rất sạch sẽ.',
        date: '2026-05-24',
      },
      {
        reviewerName: 'Huyền My',
        rating: 4.8,
        comment: 'Dịch vụ rất tốt, giá cả hợp lý đúng như niêm yết.',
        date: '2026-05-20',
      },
    ],
  },
  {
    id: 'worker-duc-dieuhoa',
    fullName: 'Lê Minh Đức',
    avatarUrl: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150',
    phone: '0976333444',
    rating: 4.8,
    reviewsCount: 96,
    completedJobs: 189,
    distance: '2.5 km',
    basePrice: 140000,
    isPro: false,
    specialties: ['dieuhoa', 'maygiat'],
    bio: 'Chuyên gia điện lạnh tại Hà Nội. Nhận lắp đặt, vệ sinh điều hòa, sửa máy giặt không vắt, lỗi mạch các hãng Electrolux, LG, Samsung.',
    reviews: [
      {
        reviewerName: 'Phạm Minh',
        rating: 5,
        comment: 'Thợ tay nghề cao, nạp ga điều hòa chạy mát lạnh lập tức.',
        date: '2026-05-25',
      },
    ],
  },
  {
    id: 'worker-long-nuoc',
    fullName: 'Phạm Hoàng Long',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    phone: '0962444555',
    rating: 4.7,
    reviewsCount: 74,
    completedJobs: 142,
    distance: '3.1 km',
    basePrice: 120000,
    isPro: false,
    specialties: ['nuoc'],
    bio: 'Thợ sửa ống nước chuyên nghiệp. Xử lý đường ống rò rỉ âm tường, thông tắc cống bể phốt và thay thế lắp đặt thiết bị nhà vệ sinh nhanh gọn.',
    reviews: [
      {
        reviewerName: 'Lê Hoàng',
        rating: 4,
        comment: 'Sửa đường nước bồn rửa bát tốt. Điểm cộng là đến đúng giờ hẹn.',
        date: '2026-05-18',
      },
    ],
  },
  {
    id: 'worker-hai-moc',
    fullName: 'Vũ Văn Hải',
    avatarUrl: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150',
    phone: '0944666777',
    rating: 4.95,
    reviewsCount: 88,
    completedJobs: 198,
    distance: '1.8 km',
    basePrice: 180000,
    isPro: true,
    specialties: ['moc', 'son'],
    bio: 'Thợ mộc lành nghề gia truyền. Chuyên đóng mới, sửa chữa tủ bếp, giường ngủ, bàn ghế gỗ, tháo lắp đồ gỗ nội thất văn phòng và phun sơn PU.',
    reviews: [
      {
        reviewerName: 'Nguyễn Kiên',
        rating: 5,
        comment: 'Chú Hải sửa bản lề tủ bếp và sơn lại rất bóng đẹp. Rất hài lòng.',
        date: '2026-05-26',
      },
    ],
  },
  {
    id: 'worker-linh-vesinh',
    fullName: 'Hoàng Thùy Linh',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    phone: '0912888999',
    rating: 4.85,
    reviewsCount: 110,
    completedJobs: 215,
    distance: '2.0 km',
    basePrice: 100000,
    isPro: false,
    specialties: ['vesinh'],
    bio: 'Chuyên cung cấp dịch vụ dọn dẹp vệ sinh nhà cửa định kỳ, tổng vệ sinh sau xây dựng, giặt ghế sofa, thảm văn phòng sạch sẽ thơm tho.',
    reviews: [
      {
        reviewerName: 'Quỳnh Chi',
        rating: 5,
        comment: 'Chị Linh dọn nhà cực kỳ cẩn thận kẽ ngách, hóa chất dọn thơm dễ chịu.',
        date: '2026-05-27',
      },
    ],
  },
];

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
        : [
            {
              id: 'cert-mock-1',
              title: 'Chứng chỉ nghề Điện Lạnh chuyên nghiệp',
              issuedBy: 'Hiệp hội Điện Lạnh Việt Nam',
              issuedAt: '2023-05-12T00:00:00.000Z',
            },
            {
              id: 'cert-mock-2',
              title: 'Chứng nhận An toàn lao động chuyên ngành',
              issuedBy: 'Sở Lao động Thương binh & Xã hội',
              issuedAt: '2024-02-18T00:00:00.000Z',
            },
          ],
    portfolioImages:
      (w.portfolioImages || w.portfolioMedia || w.portfolio || []).length > 0
        ? (w.portfolioImages || w.portfolioMedia || w.portfolio || []).map(
            (img: any, index: number) => ({
              id: img.id || `portfolio-${w.id ?? w.userId ?? 'worker'}-${index}`,
              url: img.fileUrl || img.url || img || '',
            })
          )
        : [
            {
              id: 'port-mock-1',
              url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300',
            },
            {
              id: 'port-mock-2',
              url: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?w=300',
            },
            {
              id: 'port-mock-3',
              url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300',
            },
          ],
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
    return MOCK_WORKERS.filter((w) => w.specialties.includes(serviceId));
  } catch (error) {
    console.warn('[workers API] Error getting workers, using mock fallback', error);
    // Return mock workers specialized in this service
    return MOCK_WORKERS.filter((w) => w.specialties.includes(serviceId));
  }
}

export async function getWorkerDetails(id: string): Promise<WorkerProfile | null> {
  try {
    const response = await apiClient.get(`/worker-profiles/${id}/public`);
    const resData = response.data;
    const data = resData?.data ?? resData;
    if (data && (data.id || data.userId)) {
      return mapBackendWorkerToProfile(data);
    }
    return MOCK_WORKERS.find((w) => w.id === id) || null;
  } catch (error) {
    console.warn('[workers API] Error getting worker details, using mock fallback', error);
    return MOCK_WORKERS.find((w) => w.id === id) || null;
  }
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

// ================= Offline Databases =================

const offlineWeeklySchedules: Record<string, WorkerScheduleWeekly[]> = {};
const offlineExceptions: Record<string, WorkerScheduleException[]> = {};
const offlinePayoutAccounts: PayoutAccount[] = [
  {
    id: 'payout-1',
    bankName: 'VietinBank',
    bankCode: 'ICB',
    accountNumber: '10987654321',
    accountHolderName: 'NGUYEN VAN THANG',
    isDefault: true,
  },
];
const offlinePayoutRequests: PayoutRequest[] = [
  {
    id: 'payout-req-1',
    payoutAccountId: 'payout-1',
    amount: 300000,
    status: 1, // Approved
    createdDate: new Date(Date.now() - 86400000).toISOString(),
    payoutAccount: {
      id: 'payout-1',
      bankName: 'VietinBank',
      bankCode: 'ICB',
      accountNumber: '10987654321',
      accountHolderName: 'NGUYEN VAN THANG',
    },
  },
];

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
  try {
    const response = await apiClient.get('/worker-profiles/me');
    const data = response.data?.data ?? response.data;
    if (data) {
      return mapBackendWorkerToProfile(data);
    }
    return MOCK_WORKERS[0];
  } catch (error) {
    console.warn('[workers API] Error getting profile me, using mock', error);
    return MOCK_WORKERS[0];
  }
}

export async function updateWorkerProfile(profile: Partial<WorkerProfile>): Promise<WorkerProfile> {
  try {
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
  } catch (error) {
    console.warn('[workers API] Error updating profile, fallback to local', error);
    const existing = MOCK_WORKERS[0];
    const updated = { ...existing, ...profile };
    MOCK_WORKERS[0] = updated;
    return updated;
  }
}

export async function getWeeklySchedule(workerProfileId: string): Promise<WorkerScheduleWeekly[]> {
  try {
    const response = await apiClient.get(`/worker-schedules/${workerProfileId}/weekly`);
    const data = response.data?.data ?? response.data;
    return normalizeWeeklySchedule(workerProfileId, Array.isArray(data) ? data : []);
  } catch (error) {
    console.warn('[workers API] Error getting weekly schedule, fallback local', error);
    if (!offlineWeeklySchedules[workerProfileId]) {
      offlineWeeklySchedules[workerProfileId] = normalizeWeeklySchedule(workerProfileId, []);
    }
    return offlineWeeklySchedules[workerProfileId];
  }
}

export async function updateWeeklySchedule(
  workerProfileId: string,
  payload: WorkerScheduleWeekly
): Promise<WorkerScheduleWeekly> {
  try {
    const response = await apiClient.put(`/worker-schedules/${workerProfileId}/weekly`, {
      dayOfWeek: payload.dayOfWeek,
      startTime: payload.startTime,
      endTime: payload.endTime,
      isActive: payload.isActive,
    });
    const resData = response.data;
    const data = resData?.data ?? resData;
    if (data && typeof data === 'object') {
      if (!offlineWeeklySchedules[workerProfileId]) {
        offlineWeeklySchedules[workerProfileId] = normalizeWeeklySchedule(workerProfileId, []);
      }
      const normalizedSlot = normalizeWeeklySchedule(workerProfileId, [
        { ...payload, ...(data as object) },
      ])[payload.dayOfWeek];
      offlineWeeklySchedules[workerProfileId] = upsertWeeklyScheduleSlot(
        offlineWeeklySchedules[workerProfileId],
        normalizedSlot
      );
      return normalizedSlot;
    }
    throw new Error('Invalid response');
  } catch (error) {
    console.warn('[workers API] Error updating weekly schedule, fallback local', error);
    if (!offlineWeeklySchedules[workerProfileId]) {
      offlineWeeklySchedules[workerProfileId] = normalizeWeeklySchedule(workerProfileId, []);
    }
    const normalizedSlot = normalizeWeeklySchedule(workerProfileId, [payload])[payload.dayOfWeek];
    offlineWeeklySchedules[workerProfileId] = upsertWeeklyScheduleSlot(
      offlineWeeklySchedules[workerProfileId],
      normalizedSlot
    );
    return normalizedSlot;
  }
}

export async function getExceptions(workerProfileId: string): Promise<WorkerScheduleException[]> {
  try {
    const response = await apiClient.get(`/worker-schedules/${workerProfileId}/exceptions`);
    const data = response.data?.data ?? response.data;
    if (Array.isArray(data)) return normalizeScheduleExceptions(workerProfileId, data);
    throw new Error('No data');
  } catch (error) {
    console.warn('[workers API] Error getting exceptions, fallback local', error);
    if (!offlineExceptions[workerProfileId]) {
      offlineExceptions[workerProfileId] = [];
    }
    return offlineExceptions[workerProfileId];
  }
}

export async function addDayOff(
  payload: Omit<WorkerScheduleException, 'id'>
): Promise<WorkerScheduleException> {
  try {
    const response = await apiClient.post(`/worker-schedules/${payload.workerProfileId}/day-off`, {
      date: payload.date,
      reason: payload.reason,
    });
    const resData = response.data;
    const data = resData?.data ?? resData;
    const normalizedException = normalizeScheduleExceptions(payload.workerProfileId, [
      data && typeof data === 'object' ? { ...payload, ...(data as object) } : payload,
    ])[0];
    return normalizedException;
  } catch (error) {
    console.warn('[workers API] Error adding day off, fallback local', error);
    const newException: WorkerScheduleException = {
      ...payload,
      id: `ex-${Date.now()}`,
    };
    if (!offlineExceptions[payload.workerProfileId]) {
      offlineExceptions[payload.workerProfileId] = [];
    }
    offlineExceptions[payload.workerProfileId].push(newException);
    return newException;
  }
}

export async function deleteDayOff(workerProfileId: string, date: string): Promise<void> {
  try {
    await apiClient.delete(
      `/worker-schedules/${workerProfileId}/day-off?date=${encodeURIComponent(date)}`
    );
  } catch (error) {
    console.warn('[workers API] Error deleting day off, fallback local', error);
    if (offlineExceptions[workerProfileId]) {
      offlineExceptions[workerProfileId] = offlineExceptions[workerProfileId].filter(
        (ex) => ex.date !== date
      );
    }
  }
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
    return true;
  }
}

export async function getPayoutAccounts(): Promise<PayoutAccount[]> {
  try {
    const response = await apiClient.get('/payout-accounts');
    const accounts = unwrapCollection(response.data);
    if (accounts) return accounts.map(mapBackendPayoutAccount);
    return offlinePayoutAccounts;
  } catch (error) {
    console.warn('[workers API] Error getting payout accounts, fallback local', error);
    return offlinePayoutAccounts;
  }
}

export async function createPayoutAccount(
  account: Omit<PayoutAccount, 'id'>
): Promise<PayoutAccount> {
  try {
    const response = await apiClient.post('/payout-accounts', {
      accountNumber: account.accountNumber,
      accountName: account.accountHolderName,
      bankName: account.bankName,
      bankCode: account.bankCode,
    });
    const data = response.data?.data ?? response.data;
    return mapBackendPayoutAccount({ ...account, ...data });
  } catch (error) {
    console.warn('[workers API] Error creating payout account, fallback local', error);
    const newAccount: PayoutAccount = {
      ...account,
      id: `payout-${Date.now()}`,
    };
    offlinePayoutAccounts.push(newAccount);
    return newAccount;
  }
}

export async function deletePayoutAccount(accountId: string): Promise<void> {
  try {
    await apiClient.delete(`/payout-accounts/${accountId}`);
  } catch (error) {
    console.warn('[workers API] Error deleting payout account, fallback local', error);
    const index = offlinePayoutAccounts.findIndex((a) => a.id === accountId);
    if (index !== -1) offlinePayoutAccounts.splice(index, 1);
  }
}

export async function setDefaultPayoutAccount(accountId: string): Promise<void> {
  try {
    await apiClient.put(`/payout-accounts/${accountId}/default`);
  } catch (error) {
    console.warn('[workers API] Error setting default payout account, fallback local', error);
    offlinePayoutAccounts.forEach((account) => {
      account.isDefault = account.id === accountId;
    });
  }
}

export async function getPayoutRequests(): Promise<PayoutRequest[]> {
  try {
    const response = await apiClient.get('/payouts/me');
    const requests = unwrapCollection(response.data);
    if (requests) return requests.map(mapBackendPayoutRequest);
    return offlinePayoutRequests;
  } catch (error) {
    console.warn('[workers API] Error getting payout requests, fallback local', error);
    return offlinePayoutRequests;
  }
}

export async function requestPayout(payload: {
  payoutAccountId: string;
  amount: number;
}): Promise<PayoutRequest> {
  try {
    const response = await apiClient.post('/payouts', null, {
      params: {
        payoutAccountId: payload.payoutAccountId,
        amount: payload.amount,
      },
    });
    const data = response.data?.data ?? response.data;
    return mapBackendPayoutRequest(data);
  } catch (error) {
    console.warn('[workers API] Error requesting payout, fallback local', error);
    const account =
      offlinePayoutAccounts.find((a) => a.id === payload.payoutAccountId) ||
      offlinePayoutAccounts[0];
    const newRequest: PayoutRequest = {
      id: `payout-req-${Date.now()}`,
      payoutAccountId: payload.payoutAccountId,
      amount: payload.amount,
      status: 0, // Pending
      createdDate: new Date().toISOString(),
      payoutAccount: account,
    };
    offlinePayoutRequests.push(newRequest);
    return newRequest;
  }
}

export async function uploadPortfolioImages(
  workerProfileId: string,
  localUris: string[]
): Promise<any> {
  try {
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
  } catch (error) {
    console.warn('[workers API] Error uploading portfolio images, fallback local', error);
    return { isSuccess: true };
  }
}

export async function deletePortfolioImage(workerProfileId: string, mediaId: string): Promise<any> {
  try {
    const response = await apiClient.delete(`/worker-profiles/me/portfolio-images/${mediaId}`);
    return response.data;
  } catch (error) {
    console.warn('[workers API] Error deleting portfolio image, fallback local', error);
    return { isSuccess: true };
  }
}

export async function updateIdentificationImages(payload: {
  workerProfileId: string;
  citizenIdNumber: string;
  citizenIdIssueDate: string;
  citizenIdIssuePlace: string;
  localUris: string[];
}): Promise<any> {
  try {
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
  } catch (error) {
    console.warn('[workers API] Error updating ID images, fallback local', error);
    return { isSuccess: true };
  }
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
  try {
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
  } catch (error) {
    console.warn('[workers API] Error updating certificates, fallback local', error);
    return { isSuccess: true };
  }
}
