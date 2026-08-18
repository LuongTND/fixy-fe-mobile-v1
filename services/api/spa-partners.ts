import { apiClient } from './client';

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

export type SpaServiceCategory = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  code: string;
  sortOrder: number;
  isActive: boolean;
  spaCount: number;
};

export type SpaPartnerServiceDto = {
  id: string;
  spaPartnerId: string;
  spaServiceCategoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  price: number;
  discountedPrice: number | null;
  durationMinutes: number;
  sortOrder: number;
  isActive: boolean;
};

export type SpaPartnerPromotionDto = {
  id: string;
  spaPartnerId: string;
  title: string;
  description: string | null;
  discountPercent: number;
  offPeakStartTime: string | null;
  offPeakEndTime: string | null;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
  isCurrentlyOffPeak: boolean;
};

export type SpaPartnerGalleryDto = {
  id: string;
  spaPartnerId: string;
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
};

export type SpaPartnerReviewDto = {
  id: string;
  spaPartnerId: string;
  customerProfileId: string;
  rating: number;
  comment: string | null;
  createdDate: string;
  customerName: string;
  customerAvatar: string | null;
};

export type SpaPartner = {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  address: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  openingHours: string | null;
  ratingAvg: number;
  totalReviews: number;
  isActive: boolean;
  distanceKm: number | null;
  activePromotions: SpaPartnerPromotionDto[];
  matchedServices: SpaPartnerServiceDto[];
};

export type SpaPartnerDetail = SpaPartner & {
  email: string | null;
  allServices: SpaPartnerServiceDto[];
  gallery: SpaPartnerGalleryDto[];
  recentReviews: SpaPartnerReviewDto[];
};

export type SearchSpaPartnerParams = {
  spaServiceCategoryId?: string;
  city?: string;
  customerLat?: number;
  customerLng?: number;
  maxDistanceKm?: number;
  minRating?: number;
  hasPromotion?: boolean;
  isOffPeakNow?: boolean;
  searchTerm?: string;
  sortBy?: string;
  sortDescending?: boolean;
  pageNumber?: number;
  pageSize?: number;
};

export type PagedResponse<T> = {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

// ──────────────────────────────────────
// API Functions
// ──────────────────────────────────────

/**
 * Fetch all active spa service categories
 */
export async function fetchSpaServiceCategories(): Promise<SpaServiceCategory[]> {
  try {
    const response = await apiClient.get('/spa-service-categories');
    const resData = response.data;
    const categories = resData?.data ?? resData ?? [];
    return Array.isArray(categories) ? categories : [];
  } catch (error) {
    console.warn('[spa-partners API] Error fetching spa service categories', error);
    return [];
  }
}

/**
 * Search spa partners with filters
 */
export async function searchSpaPartners(params: SearchSpaPartnerParams): Promise<PagedResponse<SpaPartner>> {
  try {
    const response = await apiClient.get('/spa-partners', { params });
    const resData = response.data;
    const pagedData = resData?.data ?? resData;
    return {
      items: pagedData?.items ?? [],
      pageNumber: pagedData?.pageNumber ?? 1,
      pageSize: pagedData?.pageSize ?? 10,
      totalCount: pagedData?.totalCount ?? 0,
      totalPages: pagedData?.totalPages ?? 0,
    };
  } catch (error) {
    console.warn('[spa-partners API] Error searching spa partners', error);
    return { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 0 };
  }
}

/**
 * Get detailed info for a specific spa partner
 */
export async function getSpaPartnerDetail(
  id: string,
  customerLat?: number,
  customerLng?: number
): Promise<SpaPartnerDetail | null> {
  try {
    const params: any = {};
    if (customerLat !== undefined) params.customerLat = customerLat;
    if (customerLng !== undefined) params.customerLng = customerLng;

    const response = await apiClient.get(`/spa-partners/${id}`, { params });
    const resData = response.data;
    return resData?.data ?? resData ?? null;
  } catch (error) {
    console.warn('[spa-partners API] Error getting spa partner detail', error);
    return null;
  }
}

/**
 * Get nearby spa partners
 */
export async function getNearbySpaPartners(
  lat: number,
  lng: number,
  radiusKm: number = 10,
  limit: number = 10
): Promise<SpaPartner[]> {
  try {
    const response = await apiClient.get('/spa-partners/nearby', {
      params: { lat, lng, radiusKm, limit },
    });
    const resData = response.data;
    const items = resData?.data ?? resData ?? [];
    return Array.isArray(items) ? items : [];
  } catch (error) {
    console.warn('[spa-partners API] Error fetching nearby spa partners', error);
    return [];
  }
}

/**
 * Get reviews for a spa partner
 */
export async function getSpaPartnerReviews(
  spaId: string,
  pageNumber: number = 1,
  pageSize: number = 10
): Promise<PagedResponse<SpaPartnerReviewDto>> {
  try {
    const response = await apiClient.get(`/spa-partners/${spaId}/reviews`, {
      params: { pageNumber, pageSize },
    });
    const resData = response.data;
    const pagedData = resData?.data ?? resData;
    return {
      items: pagedData?.items ?? [],
      pageNumber: pagedData?.pageNumber ?? 1,
      pageSize: pagedData?.pageSize ?? 10,
      totalCount: pagedData?.totalCount ?? 0,
      totalPages: pagedData?.totalPages ?? 0,
    };
  } catch (error) {
    console.warn('[spa-partners API] Error fetching reviews', error);
    return { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 0 };
  }
}

/**
 * Submit a review for a spa partner
 */
export async function createSpaPartnerReview(
  spaId: string,
  rating: number,
  comment?: string
): Promise<SpaPartnerReviewDto | null> {
  try {
    const response = await apiClient.post(`/spa-partners/${spaId}/reviews`, {
      rating,
      comment,
    });
    const resData = response.data;
    return resData?.data ?? resData ?? null;
  } catch (error) {
    console.warn('[spa-partners API] Error creating review', error);
    return null;
  }
}
