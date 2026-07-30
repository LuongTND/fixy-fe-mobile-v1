import { apiClient } from './client';
import { EligibleVoucher, normalizeEligibleVouchers } from './voucher-utils';

function unwrapData<T = any>(responseData: any): T {
  return responseData?.data ?? responseData;
}

export async function getEligibleVouchers(bookingId: string): Promise<EligibleVoucher[]> {
  if (!bookingId || !bookingId.trim()) {
    return [];
  }
  try {
    const response = await apiClient.post('/vouchers/eligible', { bookingId });
    return normalizeEligibleVouchers(response.data);
  } catch {
    return [];
  }
}

export async function applyVoucher(
  code: string,
  bookingId: string
): Promise<EligibleVoucher | null> {
  if (!code.trim()) return null;
  const payload: any = { code: code.trim().toUpperCase() };
  if (bookingId && bookingId.trim()) {
    payload.bookingId = bookingId;
  }
  try {
    const response = await apiClient.post('/vouchers/apply', payload);
    const data = unwrapData(response.data);
    const vouchers = normalizeEligibleVouchers(data);

    if (vouchers.length > 0) return vouchers[0];
    if (data?.code) return normalizeEligibleVouchers([data])[0] ?? null;

    return null;
  } catch {
    return null;
  }
}
