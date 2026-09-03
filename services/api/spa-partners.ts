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
  SpaServiceCategoryId?: string;
  city?: string;
  City?: string;
  customerLat?: number;
  CustomerLat?: number;
  customerLng?: number;
  CustomerLng?: number;
  maxDistanceKm?: number;
  MaxDistanceKm?: number;
  minRating?: number;
  MinRating?: number;
  hasPromotion?: boolean;
  HasPromotion?: boolean;
  isOffPeakNow?: boolean;
  IsOffPeakNow?: boolean;
  searchTerm?: string;
  SearchTerm?: string;
  sortBy?: string;
  SortBy?: string;
  sortDescending?: boolean;
  SortDescending?: boolean;
  pageNumber?: number;
  PageNumber?: number;
  pageSize?: number;
  PageSize?: number;
};

export type FileUploadPayload =
  | any
  | Blob
  | {
      uri: string;
      name?: string;
      type?: string;
    };

export type CreateSpaPartnerInput = {
  name: string;
  description?: string | null;
  logoFile?: FileUploadPayload | null;
  coverImageFile?: FileUploadPayload | null;
  address: string;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  email?: string | null;
  openingHours?: string | null;
  sortOrder?: number;
};

export type UpdateSpaPartnerInput = Partial<CreateSpaPartnerInput> & {
  isActive?: boolean;
};

export type GetSpaPartnerReviewsParams = {
  pageNumber?: number;
  PageNumber?: number;
  pageSize?: number;
  PageSize?: number;
  searchTerm?: string;
  SearchTerm?: string;
  sortBy?: string;
  SortBy?: string;
  sortDescending?: boolean;
  SortDescending?: boolean;
  minRating?: number;
};

export type CreateSpaPartnerReviewInput = {
  rating: number;
  comment?: string;
};

export type PagedResponse<T> = {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

// ──────────────────────────────────────
// Helper: Build FormData for Partner
// ──────────────────────────────────────

function buildSpaPartnerFormData(input: CreateSpaPartnerInput | UpdateSpaPartnerInput): FormData {
  const formData = new FormData();

  if (input.name !== undefined && input.name !== null) {
    formData.append('Name', input.name);
  }
  if (input.description !== undefined && input.description !== null) {
    formData.append('Description', input.description);
  }
  if (input.address !== undefined && input.address !== null) {
    formData.append('Address', input.address);
  }
  if (input.city !== undefined && input.city !== null) {
    formData.append('City', input.city);
  }
  if (input.lat !== undefined && input.lat !== null) {
    formData.append('Lat', String(input.lat));
  }
  if (input.lng !== undefined && input.lng !== null) {
    formData.append('Lng', String(input.lng));
  }
  if (input.phone !== undefined && input.phone !== null) {
    formData.append('Phone', input.phone);
  }
  if (input.email !== undefined && input.email !== null) {
    formData.append('Email', input.email);
  }
  if (input.openingHours !== undefined && input.openingHours !== null) {
    formData.append('OpeningHours', input.openingHours);
  }
  if (input.sortOrder !== undefined && input.sortOrder !== null) {
    formData.append('SortOrder', String(input.sortOrder));
  }
  if ('isActive' in input && input.isActive !== undefined && input.isActive !== null) {
    formData.append('IsActive', String(input.isActive));
  }

  if (input.logoFile) {
    if (typeof input.logoFile === 'object' && 'uri' in input.logoFile) {
      formData.append('LogoFile', {
        uri: input.logoFile.uri,
        name: input.logoFile.name || 'logo.jpg',
        type: input.logoFile.type || 'image/jpeg',
      } as any);
    } else {
      formData.append('LogoFile', input.logoFile);
    }
  }

  if (input.coverImageFile) {
    if (typeof input.coverImageFile === 'object' && 'uri' in input.coverImageFile) {
      formData.append('CoverImageFile', {
        uri: input.coverImageFile.uri,
        name: input.coverImageFile.name || 'cover.jpg',
        type: input.coverImageFile.type || 'image/jpeg',
      } as any);
    } else {
      formData.append('CoverImageFile', input.coverImageFile as any);
    }
  }

  return formData;
}

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
 * GET /api/spa-partners
 * Search spa partners with filters
 */
export async function searchSpaPartners(
  params: SearchSpaPartnerParams
): Promise<PagedResponse<SpaPartner>> {
  try {
    const queryParams: Record<string, any> = {};

    const catId = params.SpaServiceCategoryId ?? params.spaServiceCategoryId;
    if (catId) queryParams.SpaServiceCategoryId = catId;

    const city = params.City ?? params.city;
    if (city) queryParams.City = city;

    const cLat = params.CustomerLat ?? params.customerLat;
    if (cLat !== undefined && cLat !== null) queryParams.CustomerLat = cLat;

    const cLng = params.CustomerLng ?? params.customerLng;
    if (cLng !== undefined && cLng !== null) queryParams.CustomerLng = cLng;

    const maxDist = params.MaxDistanceKm ?? params.maxDistanceKm;
    if (maxDist !== undefined && maxDist !== null) queryParams.MaxDistanceKm = maxDist;

    const minRating = params.MinRating ?? params.minRating;
    if (minRating !== undefined && minRating !== null) queryParams.MinRating = minRating;

    const hasPromo = params.HasPromotion ?? params.hasPromotion;
    if (hasPromo !== undefined && hasPromo !== null) queryParams.HasPromotion = hasPromo;

    const isOffPeak = params.IsOffPeakNow ?? params.isOffPeakNow;
    if (isOffPeak !== undefined && isOffPeak !== null) queryParams.IsOffPeakNow = isOffPeak;

    const search = params.SearchTerm ?? params.searchTerm;
    if (search) queryParams.SearchTerm = search;

    const sortBy = params.SortBy ?? params.sortBy;
    if (sortBy) queryParams.SortBy = sortBy;

    const sortDesc = params.SortDescending ?? params.sortDescending;
    if (sortDesc !== undefined && sortDesc !== null) queryParams.SortDescending = sortDesc;

    const page = params.PageNumber ?? params.pageNumber;
    if (page !== undefined && page !== null) queryParams.PageNumber = page;

    const pageSize = params.PageSize ?? params.pageSize;
    if (pageSize !== undefined && pageSize !== null) queryParams.PageSize = pageSize;

    const response = await apiClient.get('/spa-partners', { params: queryParams });
    const resData = response.data;
    const pagedData = resData?.data ?? resData;
    const items = pagedData?.items ?? [];

    return {
      items: Array.isArray(items) ? items : [],
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
 * POST /api/spa-partners
 * Create a new spa partner (multipart/form-data)
 */
export async function createSpaPartner(
  data: CreateSpaPartnerInput | FormData
): Promise<SpaPartnerDetail | null> {
  try {
    const formData = data instanceof FormData ? data : buildSpaPartnerFormData(data);
    const response = await apiClient.post('/spa-partners', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      transformRequest: (d) => d,
      timeout: 60000,
    });
    const resData = response.data;
    return resData?.data ?? resData ?? null;
  } catch (error) {
    console.warn('[spa-partners API] Error creating spa partner', error);
    throw error;
  }
}

/**
 * GET /api/spa-partners/{id}
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
 * PUT /api/spa-partners/{id}
 * Update a spa partner (multipart/form-data)
 */
export async function updateSpaPartner(
  id: string,
  data: UpdateSpaPartnerInput | FormData
): Promise<SpaPartnerDetail | null> {
  try {
    const formData = data instanceof FormData ? data : buildSpaPartnerFormData(data);
    const response = await apiClient.put(`/spa-partners/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      transformRequest: (d) => d,
      timeout: 60000,
    });
    const resData = response.data;
    return resData?.data ?? resData ?? null;
  } catch (error) {
    console.warn('[spa-partners API] Error updating spa partner', error);
    throw error;
  }
}

/**
 * DELETE /api/spa-partners/{id}
 * Delete a spa partner
 */
export async function deleteSpaPartner(id: string): Promise<boolean> {
  try {
    const response = await apiClient.delete(`/spa-partners/${id}`);
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    console.warn('[spa-partners API] Error deleting spa partner', error);
    return false;
  }
}

/**
 * GET /api/spa-partners/nearby
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
 * GET /api/spa-partners/{id}/reviews
 * Get reviews for a spa partner (supports pagination, search, sort, minRating)
 */
export async function getSpaPartnerReviews(
  spaId: string,
  paramsOrPageNumber: number | GetSpaPartnerReviewsParams = 1,
  pageSizeArg: number = 10
): Promise<PagedResponse<SpaPartnerReviewDto>> {
  try {
    let queryParams: Record<string, any> = {};

    if (typeof paramsOrPageNumber === 'number') {
      queryParams = {
        PageNumber: paramsOrPageNumber,
        PageSize: pageSizeArg,
      };
    } else {
      const p = paramsOrPageNumber;
      const page = p.PageNumber ?? p.pageNumber ?? 1;
      const size = p.PageSize ?? p.pageSize ?? 10;
      const search = p.SearchTerm ?? p.searchTerm;
      const sortBy = p.SortBy ?? p.sortBy;
      const sortDesc = p.SortDescending ?? p.sortDescending;

      queryParams.PageNumber = page;
      queryParams.PageSize = size;
      if (search) queryParams.SearchTerm = search;
      if (sortBy) queryParams.SortBy = sortBy;
      if (sortDesc !== undefined && sortDesc !== null) queryParams.SortDescending = sortDesc;
      if (p.minRating) queryParams.MinRating = p.minRating;
    }

    const response = await apiClient.get(`/spa-partners/${spaId}/reviews`, {
      params: queryParams,
    });
    const resData = response.data;
    const pagedData = resData?.data ?? resData;
    const items = pagedData?.items ?? [];

    return {
      items: Array.isArray(items) ? items : [],
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
 * POST /api/spa-partners/{id}/reviews
 * Submit a review for a spa partner
 */
export async function createSpaPartnerReview(
  spaId: string,
  ratingOrPayload: number | CreateSpaPartnerReviewInput,
  comment?: string
): Promise<SpaPartnerReviewDto | null> {
  try {
    const payload =
      typeof ratingOrPayload === 'number'
        ? { rating: ratingOrPayload, comment }
        : ratingOrPayload;

    const response = await apiClient.post(`/spa-partners/${spaId}/reviews`, payload);
    const resData = response.data;
    return resData?.data ?? resData ?? null;
  } catch (error) {
    console.warn('[spa-partners API] Error creating review', error);
    throw error;
  }
}
