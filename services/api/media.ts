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
export async function uploadMediaFiles(
  localUris: string[],
  category: MediaCategory = MediaCategory.Request,
  ownerType: MediaOwnerType = MediaOwnerType.Booking
): Promise<string[]> {
  if (!localUris || localUris.length === 0) return [];

  const formData = new FormData();
  formData.append('Category', category.toString());
  formData.append('OwnerType', ownerType.toString());

  // Automatically compress/resize images to prevent "Network Error" on large files
  const processedUris = await Promise.all(
    localUris.map(async (uri) => {
      try {
        if (uri.startsWith('file://') || uri.startsWith('content://') || !uri.startsWith('http')) {
          const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1024 } }],
            { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
          );
          return manipResult.uri;
        }
        return uri;
      } catch (err) {
        console.warn('[media API] Failed to compress image, uploading original:', uri, err);
        return uri;
      }
    })
  );

  processedUris.forEach((uri, index) => {
    // Generate a file name
    const filename = uri.split('/').pop() || `upload_${Date.now()}_${index}.jpg`;

    // Determine type from extension
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    // Decode URI for Android to resolve double encoding in expo caching directory
    let uploadUri = uri;
    if (Platform.OS === 'android') {
      try {
        uploadUri = decodeURIComponent(uri);
        if (uploadUri.includes('%')) {
          uploadUri = decodeURIComponent(uploadUri);
        }
      } catch (decodeErr) {
        console.warn('[media API] Failed to decode URI:', uri, decodeErr);
      }
    }

    formData.append('Files', {
      uri: uploadUri,
      name: filename,
      type,
    } as any);
  });

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
