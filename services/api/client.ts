import axios, { AxiosError, create, isAxiosError } from 'axios';

import { useAuthStore } from '@/store/store';
import { getApiBaseUrl } from '@/config/env';
import { extractAuthTokens } from '@/features/auth/tokens';

export const apiClient = create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    logApiRequest(config.method, config.url);

    return config;
  },
  (error) => {
    console.error('[API REQUEST ERROR]', { message: error?.message });
    throw error;
  }
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

function logApiRequest(method?: string, url?: string) {
  console.log(`[API REQUEST] ${method?.toUpperCase()} ${url}`);
}

function logApiResponse(status: number, url?: string) {
  console.log(`[API RESPONSE] ${status} ${url}`);
}

function logApiResponseError(error: any) {
  const originalRequest = error.config;
  const status = error.response?.status ?? 'NETWORK_ERROR';

  // Suppress error logs for expected/normal business states, e.g., checking for a review that hasn't been submitted yet.
  if (originalRequest?.url?.includes('/reviews/booking/') && status === 400) {
    console.log(`[API RESPONSE INFO] 400 ${originalRequest.url} - Review not yet submitted.`);
    return;
  }

  // Suppress expected 404 when checking profile status of a first-time logged-in worker.
  if (originalRequest?.url?.includes('/worker-profiles/me') && status === 404) {
    console.log(`[API RESPONSE INFO] 404 ${originalRequest.url} - Profile not yet created (needs setup).`);
    return;
  }

  // Suppress expected 404/400 when fetching enums with fallback
  if (originalRequest?.url?.includes('/enums/') && (status === 404 || status === 400)) {
    console.log(`[API RESPONSE INFO] ${status} ${originalRequest.url} - Enum fallback used.`);
    return;
  }

  console.warn(`[API RESPONSE ERROR] ${status} ${originalRequest?.url}`, {
    message: error.message,
    data: error.response?.data,
  });
}

function isRefreshRequest(url?: string) {
  return url?.includes('/auth/token/refresh') ?? false;
}

function shouldAttemptRefresh(error: any) {
  const originalRequest = error.config;
  return error.response?.status === 401 && originalRequest && !originalRequest._retry;
}

function retryQueuedRequest(originalRequest: any) {
  return new Promise((resolve, reject) => {
    failedQueue.push({ resolve, reject });
  }).then((token) => {
    originalRequest.headers.Authorization = `Bearer ${token}`;
    return apiClient(originalRequest);
  });
}

async function refreshAccessToken(refreshToken: string) {
  const refreshResponse = await axios.post(
    `${getApiBaseUrl()}/auth/token/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } }
  );

  const newTokens = extractAuthTokens(refreshResponse.data);
  if (!newTokens?.accessToken) {
    throw new Error('Failed to extract new tokens');
  }

  await useAuthStore.getState().saveAuth(newTokens);
  return newTokens.accessToken;
}

async function retryWithFreshToken(originalRequest: any) {
  originalRequest._retry = true;
  isRefreshing = true;

  try {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      console.warn('[API CLIENT] No refresh token found, logging out user');
      await useAuthStore.getState().logout();
      throw new Error('Missing refresh token');
    }

    const accessToken = await refreshAccessToken(refreshToken);
    processQueue(null, accessToken);
    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
    return apiClient(originalRequest);
  } catch (refreshError) {
    processQueue(refreshError, null);
    console.error('[API CLIENT] Token refresh failed, logging out user:', refreshError);
    await useAuthStore.getState().logout();
    throw refreshError;
  } finally {
    isRefreshing = false;
  }
}

apiClient.interceptors.response.use(
  (response) => {
    logApiResponse(response.status, response.config.url);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (!shouldAttemptRefresh(error) || isRefreshRequest(originalRequest?.url)) {
      logApiResponseError(error);
      throw error;
    }

    if (isRefreshing) {
      return retryQueuedRequest(originalRequest);
    }

    return retryWithFreshToken(originalRequest);
  }
);

export function getApiErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    return getAxiosMessage(error);
  }

  if (error instanceof Error) return error.message;

  return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

function getAxiosMessage(error: AxiosError) {
  const responseData = error.response?.data;

  if (responseData && typeof responseData === 'object') {
    const record = responseData as Record<string, unknown>;
    let message = record.message ?? record.error;

    if (!message && record.data && typeof record.data === 'object') {
      const innerData = record.data as Record<string, unknown>;
      message = innerData.message ?? innerData.error;
    }

    if (!message && Array.isArray(record.errors) && record.errors.length > 0) {
      const firstErr = record.errors[0];
      if (typeof firstErr === 'string') {
        message = firstErr;
      } else if (firstErr && typeof firstErr === 'object') {
        message = (firstErr as any).message ?? (firstErr as any).errorMessage;
      }
    }

    if (!message && record.errors && typeof record.errors === 'object' && !Array.isArray(record.errors)) {
      const errorValues = Object.values(record.errors);
      if (errorValues.length > 0 && Array.isArray(errorValues[0]) && errorValues[0].length > 0) {
        message = String(errorValues[0][0]);
      }
    }

    if (!message && typeof record.title === 'string' && record.title.trim()) {
      message = record.title;
    }

    if (typeof message === 'string' && message.trim()) {
      const msgLower = message.toLowerCase();
      if (msgLower.includes('invalid credentials') || msgLower.includes('incorrect password')) {
        return 'Tên đăng nhập hoặc mật khẩu không chính xác.';
      }
      if (msgLower.includes('worker profile not found')) {
        return 'Không tìm thấy hồ sơ kỹ thuật viên.';
      }
      if (msgLower.includes('outside working hours') || msgLower.includes('outside custom working hours')) {
        return 'Kỹ thuật viên đang ngoài khung giờ làm việc.';
      }
      if (msgLower.includes('not working this day') || msgLower.includes('is on day off')) {
        return 'Kỹ thuật viên không làm việc hoặc đang nghỉ làm vào ngày này.';
      }
      if (msgLower.includes('schedule not found') || msgLower.includes('schedule time is invalid')) {
        return 'Lịch làm việc của Kỹ thuật viên không hợp lệ hoặc chưa được thiết lập.';
      }
      if (msgLower.includes('max file size exceeded') || msgLower.includes('limit')) {
        return 'Dung lượng file ảnh vượt quá giới hạn 5MB.';
      }
      return message;
    }
  }

  if (error.message) {
    const msgLower = error.message.toLowerCase();
    if (msgLower.includes('network error')) {
      return 'Lỗi kết nối mạng. Vui lòng kiểm tra lại mạng Wifi/4G của bạn.';
    }
    if (msgLower.includes('outside working hours')) {
      return 'Kỹ thuật viên đang ngoài khung giờ làm việc.';
    }
    return error.message;
  }

  return 'Không thể kết nối máy chủ. Vui lòng thử lại.';
}
