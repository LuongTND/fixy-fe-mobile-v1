import { apiClient } from './client';

export interface PaymentResult {
  paymentUrl?: string;
  bookingId?: string;
  status?: string;
  message?: string;
}

function unwrapData<T = any>(responseData: any): T {
  return responseData?.data ?? responseData;
}

function normalizePaymentResult(data: any): PaymentResult {
  if (typeof data === 'string') {
    return { paymentUrl: data };
  }
  if (data && typeof data === 'object') {
    return {
      ...data,
      paymentUrl: data.paymentUrl ?? data.redirectUrl ?? data.checkoutUrl ?? data.url ?? data.data?.paymentUrl,
    };
  }
  return {};
}

/** POST /payment/booking/{bookingId} — Start payment for a booking */
export async function payForBooking(
  bookingId: string,
  method: number
): Promise<PaymentResult> {
  const response = await apiClient.post(`/payment/booking/${bookingId}`, { method });
  return normalizePaymentResult(unwrapData(response.data));
}

/** POST /payment/topup — Top up wallet balance */
export async function topUpWallet(
  amount: number,
  method: number
): Promise<PaymentResult> {
  const response = await apiClient.post('/payment/topup', { amount, method });
  return normalizePaymentResult(unwrapData(response.data));
}

/** GET /payment/callback/vnpay — Verify VNPAY return params */
export async function verifyVnpayCallback(params: Record<string, string>): Promise<any> {
  const response = await apiClient.get('/payment/callback/vnpay', { params });
  return unwrapData(response.data);
}
