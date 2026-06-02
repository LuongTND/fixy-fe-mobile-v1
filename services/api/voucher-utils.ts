export enum VoucherType {
  Percent = 0,
  Fixed = 1,
}

export type EligibleVoucher = {
  id?: string;
  code: string;
  type?: VoucherType | number;
  value?: number;
  minOrderValue?: number;
  maxDiscount?: number;
  expiresAt?: string;
  description?: string;
  isEligible: boolean;
  ineligibleReason?: string | null;
  calculatedDiscount?: number;
};

function unwrapVoucherList(raw: any): any[] {
  const data = raw?.data ?? raw;
  const items = data?.items ?? data?.vouchers ?? data?.eligibleVouchers ?? data;
  return Array.isArray(items) ? items : [];
}

function toNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function normalizeEligibleVouchers(raw: any): EligibleVoucher[] {
  return unwrapVoucherList(raw).map((item) => {
    const ineligibleReason = item?.ineligibleReason ?? item?.reason ?? null;
    const isEligible = Boolean(item?.isEligible ?? item?.eligible ?? !ineligibleReason);

    return {
      id: item?.id ?? item?.voucherId,
      code: String(item?.code ?? '')
        .trim()
        .toUpperCase(),
      type: toNumber(item?.type),
      value: toNumber(item?.value),
      minOrderValue: toNumber(item?.minOrderValue),
      maxDiscount: toNumber(item?.maxDiscount),
      expiresAt: item?.expiresAt ?? item?.expiredAt,
      description: item?.description,
      isEligible,
      ineligibleReason,
      calculatedDiscount: toNumber(
        item?.calculatedDiscount ?? item?.discountAmount ?? item?.discount,
        0
      ),
    };
  });
}

export function getVoucherDiscount(voucher?: EligibleVoucher | null) {
  if (!voucher) return 0;
  if (voucher.calculatedDiscount && voucher.calculatedDiscount > 0) {
    return voucher.calculatedDiscount;
  }

  return voucher.type === VoucherType.Fixed ? (voucher.value ?? 0) : 0;
}

export function formatVoucherIneligibleReason(reason?: string | null) {
  if (!reason) return '';

  const text = String(reason).toLowerCase();
  if (text.includes('already used') || text.includes('maximum number of times')) {
    return 'Bạn đã sử dụng voucher này tối đa số lần cho phép';
  }
  if (text.includes('minordervalue') || text.includes('minimum order')) {
    return 'Đơn hàng chưa đạt giá trị tối thiểu';
  }
  if (text.includes('category') || text.includes('service')) {
    return 'Voucher không áp dụng cho dịch vụ này';
  }
  if (text.includes('expired')) {
    return 'Voucher đã hết hạn';
  }
  if (text.includes('city')) {
    return 'Không áp dụng tại thành phố của bạn';
  }
  if (text.includes('first order')) {
    return 'Chỉ áp dụng cho đơn hàng đầu tiên';
  }

  return reason;
}
