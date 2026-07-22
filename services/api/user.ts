import { apiClient } from './client';

export type UserProfile = {
  fullName: string;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  avatarUrl: string | null;
};

export type UserProfileResponse = {
  isSuccess: boolean;
  message: string | null;
  data: UserProfile;
  errors: string[];
};

export async function getUserProfile(): Promise<UserProfileResponse> {
  const response = await apiClient.get('/user/profile');
  return response.data;
}

export async function updateUserProfile(data: {
  fullName?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: number;
  avatarFile?: any;
}): Promise<UserProfileResponse> {
  const formData = new FormData();
  if (data.fullName !== undefined) formData.append('FullName', data.fullName);
  if (data.phone !== undefined) formData.append('Phone', data.phone);
  if (data.dateOfBirth !== undefined) formData.append('DateOfBirth', data.dateOfBirth);
  if (data.gender !== undefined) formData.append('Gender', String(data.gender));
  if (data.avatarFile) formData.append('Avatar', data.avatarFile);

  const response = await apiClient.put('/user', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    transformRequest: (d) => d,
  });
  return response.data;
}
