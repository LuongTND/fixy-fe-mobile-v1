import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { apiClient } from './client';
import { getApiBaseUrl } from '@/config/env';

export enum MediaCategory {
  Avatar = 0,
  Identification = 1,
  Portfolio = 2,
  Request = 3, // Used for booking current situation images
  Completion = 4, // Used when completing booking
  Review = 5,
  Attachment = 6,
  Certificate = 7,
}

export enum MediaOwnerType {
  User = 0,
  WorkerProfile = 1,
  Booking = 2,
  Review = 3,
  SupportTicket = 4,
  Certificate = 5,
}

export type UploadedMediaResponse = {
  id: string;
  ownerId?: string;
  ownerType?: string;
  category?: string;
  fileUrl: string;
};

export function getMediaUrl(mediaId: string) {
  return `${getApiBaseUrl()}/Media/${mediaId}`;
}

/**
 * Uploads local image URIs to the backend media upload API
 * @param localUris Array of local image file URIs (e.g. from expo-image-picker)
 * @param category The MediaCategory enum value (default is Request = 3)
 * @param ownerType The MediaOwnerType enum value (default is Booking = 2)
 * @returns Array of uploaded media IDs (UUIDs)
 */
export async function preprocessImage(
  uri: string,
  options?: { compress?: boolean; resizeWidth?: number; quality?: number }
): Promise<string> {
  const shouldCompress = options?.compress ?? true;
  const resizeWidth = options?.resizeWidth ?? 1024;
  const quality = options?.quality ?? 0.5;

  let uploadUri = uri;
  if (shouldCompress) {
    try {
      if (uri.startsWith('file://') || uri.startsWith('content://') || !uri.startsWith('http')) {
        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: resizeWidth } }],
          { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
        );
        uploadUri = manipResult.uri;
      }
    } catch (err) {
      console.warn('[media API] Failed to compress image:', uri, err);
    }
  }

  if (Platform.OS === 'android') {
    try {
      uploadUri = decodeURIComponent(uploadUri);
      if (uploadUri.includes('%')) {
        uploadUri = decodeURIComponent(uploadUri);
      }
    } catch (decodeErr) {
      console.warn('[media API] Failed to decode URI:', uploadUri, decodeErr);
    }
  }
  return uploadUri;
}

export async function prepareUploadFile(
  uri: string,
  fallbackName: string,
  options?: { compress?: boolean; resizeWidth?: number; quality?: number }
): Promise<any> {
  if (!uri) {
    return null;
  }

  if (uri.startsWith('http')) {
    const filename = uri.split('/').pop() || fallbackName;
    const match = /\.(\w+)$/.exec(filename);
    const extension = match?.[1]?.toLowerCase();
    const type = extension
      ? `image/${extension === 'jpg' || extension === 'jpeg' ? 'jpeg' : extension}`
      : 'image/jpeg';
    return {
      uri,
      name: filename.includes('?') ? filename.split('?')[0] : filename,
      type,
    };
  }

  const processedUri = await preprocessImage(uri, options);
  const filename = processedUri.split('/').pop() || fallbackName;
  const match = /\.(\w+)$/.exec(filename);
  const extension = match?.[1]?.toLowerCase();
  const type = extension
    ? `image/${extension === 'jpg' || extension === 'jpeg' ? 'jpeg' : extension}`
    : 'image/jpeg';
  return {
    uri: processedUri,
    name: filename,
    type,
  };
}

export async function uploadMediaFiles(
  localUris: string[],
  category: MediaCategory = MediaCategory.Request,
  ownerType: MediaOwnerType = MediaOwnerType.Booking
): Promise<string[]> {
  if (!localUris || localUris.length === 0) return [];

  const formData = new FormData();
  formData.append('Category', category.toString());
  formData.append('OwnerType', ownerType.toString());

  for (let i = 0; i < localUris.length; i++) {
    const fileObj = await prepareUploadFile(localUris[i], `upload_${Date.now()}_${i}.jpg`);
    if (fileObj) {
      formData.append('Files', fileObj);
    }
  }

  try {
    const response = await apiClient.post('/Media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      transformRequest: (data) => data,
    });

    const resData = response.data;
    // Unwrap the envelope if backend follows standard format: { isSuccess: true, data: [...] }
    const items: UploadedMediaResponse[] = resData?.data ?? resData ?? [];

    if (Array.isArray(items)) {
      return items.map((item) => item.id);
    }

    return [];
  } catch (error) {
    console.error('[media API] Error uploading files:', error);
    throw error;
  }
}
