export function getPayoutStatus(req: any): number {
  const s = req?.status;
  if (typeof s === 'number') return s;
  if (typeof s === 'string') {
    const norm = s.trim().toLowerCase();
    if (norm === 'pending') return 0;
    if (norm === 'approved') {
      if (req?.transferredAt) return 3;
      return 1;
    }
    if (norm === 'rejected') return 2;
    if (norm === 'transferred') return 3;
  }
  return 0;
}

export function getPayoutStatusLabel(req: any): string {
  const st = getPayoutStatus(req);
  if (st === 0) return 'Đang duyệt';
  if (st === 1) return 'Đã duyệt';
  if (st === 2) return 'Từ chối';
  if (st === 3) return 'Đã chuyển';
  return 'Đang xử lý';
}
