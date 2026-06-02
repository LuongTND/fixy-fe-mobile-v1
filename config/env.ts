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

export function getFptProxyBaseUrl() {
  const proxyUrl = Constants.expoConfig?.extra?.fptProxyUrl;

  if (typeof proxyUrl === 'string' && proxyUrl.trim().length > 0) {
    return normalizeBaseUrl(stripApiSuffix(proxyUrl.trim()));
  }

  const hostUri = Constants.expoConfig?.hostUri;
  const host = typeof hostUri === 'string' ? hostUri.split(':')[0] : '';
  if (host) return `http://${host}:3000`;

  throw new Error('Missing FPT_PROXY_URL. Add FPT_PROXY_URL to .env.local and restart Expo.');
}

export function getFptAiApiKey() {
  const apiKey = Constants.expoConfig?.extra?.fptAiApiKey;
  return typeof apiKey === 'string' ? apiKey.trim() : '';
}

function stripApiSuffix(url: string) {
  return url.replace(/\/api\/?$/, '');
}
