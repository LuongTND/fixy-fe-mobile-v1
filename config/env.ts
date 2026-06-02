import Constants from 'expo-constants';

export function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, '');
}

export function getApiBaseUrl() {
  const apiUrl = Constants.expoConfig?.extra?.apiUrl;

  if (typeof apiUrl !== 'string' || apiUrl.trim().length === 0) {
    throw new Error('Missing API_URL. Add API_URL to .env.local and restart Expo.');
  }

  return normalizeBaseUrl(apiUrl.trim());
}
