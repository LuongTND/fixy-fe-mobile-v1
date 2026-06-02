import { apiClient } from './client';
import { EligibleVoucher, normalizeEligibleVouchers } from './voucher-utils';

function unwrapData<T = any>(responseData: any): T {
  return responseData?.data ?? responseData;
}

export async function getEligibleVouchers(bookingId: string): Promise<EligibleVoucher[]> {
  const response = await apiClient.post('/vouchers/eligible', { bookingId });
  return normalizeEligibleVouchers(response.data);
}

export async function applyVoucher(
  code: string,
  bookingId: string
): Promise<EligibleVoucher | null> {
  const response = await apiClient.post('/vouchers/apply', {
    code: code.trim().toUpperCase(),
    bookingId,
  });
  const data = unwrapData(response.data);
  const vouchers = normalizeEligibleVouchers(data);

  if (vouchers.length > 0) return vouchers[0];
  if (data?.code) return normalizeEligibleVouchers([data])[0] ?? null;

  return null;
}
