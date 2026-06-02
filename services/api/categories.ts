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

// Fallback mapping in case API call is slow/fails or we are offline
const STATIC_SLUG_TO_GUID: Record<string, string> = {
  dien: 'a02824bd-868b-442a-4d54-08deb6eb4031', // "Điện"
  nuoc: '6c727a78-4a39-42a2-4d55-08deb6eb4031', // "Nước"
  dieuhoa: '86803525-2390-4e81-4d56-08deb6eb4031', // "Sửa điện dân dụng" as fallback
  maygiat: '6c727a78-4a39-42a2-4d55-08deb6eb4031',
  xemay: 'a02824bd-868b-442a-4d54-08deb6eb4031',
  moc: 'a02824bd-868b-442a-4d54-08deb6eb4031',
  son: 'a02824bd-868b-442a-4d54-08deb6eb4031',
  vesinh: '6c727a78-4a39-42a2-4d55-08deb6eb4031',
};

const STATIC_GUID_TO_SLUG: Record<string, string> = {
  'a02824bd-868b-442a-4d54-08deb6eb4031': 'dien',
  '6c727a78-4a39-42a2-4d55-08deb6eb4031': 'nuoc',
  '86803525-2390-4e81-4d56-08deb6eb4031': 'dieuhoa',
};

// In-memory cache for dynamic categories fetched from backend
let cachedCategories: ServiceCategory[] = [];

export async function fetchCategories(): Promise<ServiceCategory[]> {
  try {
    const response = await apiClient.get('/service-categories');
    const resData = response.data;
    const categories = resData?.data ?? resData ?? [];
    if (Array.isArray(categories)) {
      cachedCategories = categories;
      return categories;
    }
    return [];
  } catch (error) {
    console.warn(
      '[categories API] Error fetching service categories, using offline mapping',
      error
    );
    return [];
  }
}

/**
 * Returns the backend GUID corresponding to a slug (e.g. 'dien')
 * If it's already a GUID format, returns it as-is.
 */
export function getCategoryGuid(slugOrGuid: string): string {
  // Validate if it is already a UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(slugOrGuid)) {
    return slugOrGuid;
  }

  // Check cached categories from API first
  const found = cachedCategories.find((c) => {
    const nameLower = c.name.toLowerCase();
    if (slugOrGuid === 'dien' && nameLower.includes('điện')) return true;
    if (slugOrGuid === 'nuoc' && nameLower.includes('nước')) return true;
    if (
      slugOrGuid === 'dieuhoa' &&
      (nameLower.includes('điều hòa') || nameLower.includes('điện lạnh'))
    )
      return true;
    return false;
  });

  if (found) {
    return found.id;
  }

  // Fallback to static mapping
  return STATIC_SLUG_TO_GUID[slugOrGuid] || slugOrGuid;
}

/**
 * Returns the frontend slug (e.g. 'dien') corresponding to a backend GUID
 */
export function getCategorySlug(guidOrSlug: string): string {
  // If it's already mapped statically
  if (STATIC_GUID_TO_SLUG[guidOrSlug]) {
    return STATIC_GUID_TO_SLUG[guidOrSlug];
  }

  // Check cached categories
  const found = cachedCategories.find((c) => c.id === guidOrSlug);
  if (found) {
    const nameLower = found.name.toLowerCase();
    if (nameLower.includes('điện')) return 'dien';
    if (nameLower.includes('nước')) return 'nuoc';
    if (nameLower.includes('điều hòa') || nameLower.includes('điện lạnh')) return 'dieuhoa';
  }

  // If not a UUID, return as-is (might be slug already)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(guidOrSlug)) {
    return guidOrSlug;
  }

  return 'dien'; // default fallback slug
}
