export function formatNumber(amount?: number | null): string {
  const val = Math.max(0, amount ?? 0);
  try {
    return Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  } catch (e) {
    return String(val);
  }
}

export function formatCurrency(amount?: number | null): string {
  return `${formatNumber(amount)}\u0111`;
}

export function formatToIsoDateTime(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (trimmed.includes('T')) return trimmed;

  // Match YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}T00:00:00.000Z`;
  }

  // Match DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}T00:00:00.000Z`;
  }

  // Fallback to JS Date parsing
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  } catch {
    // ignore
  }

  return trimmed;
}

export function formatFullAddress(addr?: {
  detail?: string | null;
  ward?: string | null;
  district?: string | null;
  city?: string | null;
} | null): string {
  if (!addr) return '';
  const detail = (addr.detail || '').trim();
  const ward = (addr.ward || '').trim();
  const district = (addr.district || '').trim();
  const city = (addr.city || '').trim();

  if (detail && city && detail.toLowerCase().includes(city.toLowerCase())) {
    return detail;
  }

  const parts = [detail, ward, district, city].filter(
    (p) => Boolean(p) && p !== 'undefined' && p !== 'null'
  );

  const result: string[] = [];
  parts.forEach((p) => {
    if (!result.some((existing) => existing.toLowerCase().includes(p.toLowerCase()))) {
      result.push(p);
    }
  });

  return result.join(', ');
}
