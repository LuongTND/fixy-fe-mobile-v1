import axios from 'axios';
import Constants from 'expo-constants';

const BASE_URL =
  Constants.expoConfig?.extra?.vietnamProvincesApiUrl || 'https://provinces.open-api.vn/api/v2';

export type ProvinceOption = {
  name: string;
  code: number;
  codename: string;
  division_type: string;
  phone_code: number;
};

export type WardOption = {
  name: string;
  code: number;
  codename: string;
  division_type: string;
  province_code: number;
};

export const vietnamProvincesApi = {
  getProvinces: async (): Promise<ProvinceOption[]> => {
    const response = await axios.get<ProvinceOption[]>(`${BASE_URL}/p/`);
    return response.data;
  },

  getWardsForProvince: async (provinceCode: number): Promise<WardOption[]> => {
    const response = await axios.get<WardOption[]>(`${BASE_URL}/w/`, {
      params: { province: provinceCode },
    });
    return response.data || [];
  },

  // Direct user-requested mapping methods
  getProvinceWithWards: async (code: number): Promise<any> => {
    const response = await axios.get<any>(`${BASE_URL}/p/${code}`, {
      params: { depth: 2 },
    });
    return response.data;
  },

  searchLegacyWards: async (legacyName: string): Promise<any> => {
    const response = await axios.get<any>(`${BASE_URL}/w/from-legacy/`, {
      params: { legacy_name: legacyName },
    });
    return response.data;
  },

  getLegacyWardsForNewWard: async (code: number): Promise<any> => {
    const response = await axios.get<any>(`${BASE_URL}/w/${code}/to-legacies/`);
    return response.data;
  },
};

export const cleanAddressName = (str: string, type: 'city' | 'district' | 'ward') => {
  if (!str) return '';
  let cleaned = str.toLowerCase();
  if (type === 'city') {
    cleaned = cleaned.replace(/^(tỉnh|thành phố|tp\.|tp)\s+/i, '');
  } else if (type === 'district') {
    cleaned = cleaned.replace(/^(quận|huyện|thành phố|thị xã)\s+/i, '');
  } else if (type === 'ward') {
    cleaned = cleaned.replace(/^(phường|xã|thị trấn|thị xã|đặc khu)\s+/i, '');
  }
  return cleaned.trim();
};

export const matchAddressOption = (
  list: any[],
  name: string,
  type: 'city' | 'district' | 'ward'
) => {
  if (!name) return null;
  const cleanedTarget = cleanAddressName(name, type);
  return list.find((item) => cleanAddressName(item.name, type) === cleanedTarget) || null;
};

export const cleanSearchText = (str: string) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('\u0111', 'd')
    .replaceAll('\u0110', 'D')
    .toLowerCase()
    .trim();
};
