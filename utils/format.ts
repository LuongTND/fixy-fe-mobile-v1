export function formatCurrency(amount?: number | null): string {
  return `${Math.max(0, amount ?? 0).toLocaleString('vi-VN')}\u0111`;
}
