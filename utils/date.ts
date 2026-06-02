import { Platform } from 'react-native';

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
