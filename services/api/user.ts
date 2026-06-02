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
