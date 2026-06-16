import { apiClient } from './client';

export type ServiceCategory = {
  id: string;
  parentId: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  code: string;
  sortOrder: number;
  isActive: boolean;
};

let categoriesCache: ServiceCategory[] = [];

// Fetch dynamic categories fetched from backend
export async function fetchCategories(): Promise<ServiceCategory[]> {
  try {
    const response = await apiClient.get('/service-categories');
    const resData = response.data;
    const categories = resData?.data ?? resData ?? [];
    if (Array.isArray(categories)) {
      categoriesCache = categories;
      return categories;
    }
    return [];
  } catch (error) {
    console.warn('[categories API] Error fetching service categories', error);
    return [];
  }
}

/**
 * Returns the backend GUID corresponding to a slug (e.g. 'dien')
 * If it's already a GUID format, returns it as-is.
 */
export function getCategoryGuid(slugOrGuid: string): string {
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (guidRegex.test(slugOrGuid)) {
    return slugOrGuid;
  }
  const category = categoriesCache.find((c) => c.code === slugOrGuid);
  return category?.id || slugOrGuid;
}

/**
 * Returns the frontend slug (e.g. 'dien') corresponding to a backend GUID
 */
export function getCategorySlug(guidOrSlug: string): string {
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!guidRegex.test(guidOrSlug)) {
    return guidOrSlug;
  }
  const category = categoriesCache.find((c) => c.id === guidOrSlug);
  return category?.code || guidOrSlug;
}
