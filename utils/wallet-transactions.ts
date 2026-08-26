import { MaterialIcons } from '@expo/vector-icons';

type WalletContext = 'customer' | 'worker';

export function getWalletTransactionIcon(
  type: string,
  direction: string,
  context: WalletContext = 'customer'
): keyof typeof MaterialIcons.glyphMap {
  if (type === 'TopUp') return 'account-balance-wallet';
  if (type === 'Withdrawal') return 'account-balance';
  if (type === 'DepositLock') return 'lock';
  if (type === 'DepositRefund') return 'replay';
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
    return context === 'worker' ? 'Nạp tiền' : 'Nạp tiền vào ví';
  if (type === 'Withdrawal') {
    return context === 'worker'
      ? 'Rút tiền về ngân hàng'
      : 'Rút tiền';
  }
  if (type === 'Payment') {
    return context === 'worker'
      ? 'Thanh toán dịch vụ'
      : 'Thanh toán đặt lịch';
  }
  if (type === 'DepositLock') {
    return 'Nạp cọc ký quỹ kích hoạt nhận việc';
  }
  if (type === 'DepositRefund') {
    return 'Hoàn trả 100% tiền cọc ký quỹ';
  }
  return type;
}
