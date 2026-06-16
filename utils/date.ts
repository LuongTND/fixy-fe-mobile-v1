// date utility functions
/**
 * Parses a date string robustly.
 * If the string lacks a timezone offset (doesn't end with 'Z' and doesn't contain a sign offset),
 * it appends 'Z' so JavaScript parses it as UTC instead of local time, ensuring correct timezone offset translation.
 */
export function parseDate(dateStr: string | Date | undefined): Date {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;

  let parsed = new Date(dateStr);

  if (typeof dateStr === 'string' && dateStr.trim()) {
    // If it lacks timezone information, force parse as UTC
    if (!dateStr.endsWith('Z') && !/[+-]\d{2}(:?\d{2})?$/.test(dateStr)) {
      const utcDate = new Date(`${dateStr}Z`);
      if (!isNaN(utcDate.getTime())) {
        parsed = utcDate;
      }
    }
  }

  return parsed;
}

/**
 * Formats a date string or Date object into a local time string: "HH:MM DD/MM/YYYY"
 */
export function formatDateTime(dateStr: string | Date | undefined): string {
  if (!dateStr) return 'Không rõ thời gian';

  const date = parseDate(dateStr);
  if (isNaN(date.getTime())) return 'Không rõ thời gian';

  const pad = (num: number) => num.toString().padStart(2, '0');
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();

  return `${hours}:${minutes} ${day}/${month}/${year}`;
}

/**
 * Formats a date string or Date object into a local date string: "DD/MM/YYYY"
 */
export function formatDateOnly(dateStr: string | Date | undefined): string {
  if (!dateStr) return 'Không rõ thời gian';

  const date = parseDate(dateStr);
  if (isNaN(date.getTime())) return 'Không rõ thời gian';

  const pad = (num: number) => num.toString().padStart(2, '0');
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Formats a date string or Date object into a relative/friendly local date string in Vietnamese.
 */
export function formatDateFriendly(dateStr: string | Date | undefined): string {
  if (!dateStr) return '';
  try {
    const d = parseDate(dateStr);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return typeof dateStr === 'string' ? dateStr : '';
  }
}

/**
 * Formats a date string or Date object into local time string: "HH:MM"
 */
export function formatTime(dateStr: string | Date | undefined): string {
  if (!dateStr) return '';
  const date = parseDate(dateStr);
  if (isNaN(date.getTime())) return '';
  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
