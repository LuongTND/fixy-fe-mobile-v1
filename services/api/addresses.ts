import { apiClient } from './client';

export type Address = {
  id?: string;
  label: string;
  city: string;
  district: string;
  ward: string;
  detail: string;
  lat: number;
  lng: number;
  isDefault: boolean;
};

export type AddressResponse = {
  isSuccess: boolean;
  message: string | null;
  data: Address;
  errors: string[];
};

export type AddressListResponse = {
  isSuccess: boolean;
  message: string | null;
  data: Address[];
  errors: string[];
};

export async function getMyAddresses(): Promise<Address[]> {
  try {
    const response = await apiClient.get('/addresses/me');
    // Ensure we handle different backend response schemas gracefully
    const resData = response.data;
    if (resData && Array.isArray(resData)) {
      return resData;
    }
    if (resData && Array.isArray(resData.data)) {
      return resData.data;
    }
    if (resData && resData.isSuccess && Array.isArray(resData.data)) {
      return resData.data;
    }
    return [];
  } catch (error) {
    console.error('[addresses API] Error getting saved addresses:', error);
    throw error;
  }
}

export async function createAddress(address: Omit<Address, 'id'>): Promise<Address> {
  const response = await apiClient.post('/addresses', address);
  const resData = response.data;
  return resData?.data ?? resData;
}

export async function updateAddress(
  addressId: string,
  address: Omit<Address, 'id'>
): Promise<Address> {
  const response = await apiClient.put(`/addresses/${addressId}`, address);
  const resData = response.data;
  return resData?.data ?? resData;
}

export async function deleteAddress(addressId: string): Promise<void> {
  await apiClient.delete(`/addresses/${addressId}`);
}
