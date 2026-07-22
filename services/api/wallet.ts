import { apiClient } from './client';

export interface WalletOverview {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  recentTransactions: WalletTransaction[];
}

export interface WalletTransaction {
  id: string;
  type: string;
  direction: 'Credit' | 'Debit';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: string;
  createdDate: string;
  description?: string;
}

function unwrapData<T = any>(responseData: any): T {
  return responseData?.data ?? responseData;
}

/** GET /wallet — Wallet overview with balance and recent transactions */
export async function getWalletOverview(): Promise<WalletOverview> {
  const response = await apiClient.get('/wallet');
  return unwrapData<WalletOverview>(response.data);
}

/** GET /wallet/transactions — Full transaction list */
export async function getWalletTransactions(params?: {
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  SortDescending?: boolean;
}): Promise<WalletTransaction[]> {
  const response = await apiClient.get('/wallet/transactions', { params });
  const data = unwrapData<any>(response.data);
  return Array.isArray(data) ? data : (data?.items ?? []);
}

/** POST /wallet/booking/{bookingId}/wallet — Legacy direct wallet booking payment */
export async function payBookingWithWallet(bookingId: string): Promise<any> {
  const response = await apiClient.post(`/wallet/booking/${bookingId}/wallet`);
  return unwrapData(response.data);
}
