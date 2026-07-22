import { MaterialIcons } from '@expo/vector-icons';

type WalletContext = 'customer' | 'worker';

export function getWalletTransactionIcon(
  type: string,
  direction: string,
  context: WalletContext = 'customer'
): keyof typeof MaterialIcons.glyphMap {
  if (type === 'TopUp') return 'account-balance-wallet';
  if (type === 'Withdrawal') return 'account-balance';
  if (direction === 'Debit') return context === 'worker' ? 'account-balance' : 'payment';
  return context === 'worker' ? 'electrical-services' : 'add-circle-outline';
}

export function getWalletTransactionLabel(
  type: string,
  description?: string,
  context: WalletContext = 'customer'
): string {
  if (description) return description;
  if (type === 'TopUp')
    return context === 'worker' ? 'N\u1ea1p ti\u1ec1n' : 'N\u1ea1p ti\u1ec1n v\u00e0o v\u00ed';
  if (type === 'Withdrawal') {
    return context === 'worker'
      ? 'R\u00fat ti\u1ec1n v\u1ec1 ng\u00e2n h\u00e0ng'
      : 'R\u00fat ti\u1ec1n';
  }
  if (type === 'Payment') {
    return context === 'worker'
      ? 'Thanh to\u00e1n d\u1ecbch v\u1ee5'
      : 'Thanh to\u00e1n \u0111\u1eb7t l\u1ecbch';
  }
  return type;
}
