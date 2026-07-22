export function timeStringToDate(time: string): Date {
  const [hours = '8', minutes = '0'] = time.slice(0, 5).split(':');
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date;
}

export function dateToTimeString(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function dateToApiTime(date: Date): string {
  return `${dateToTimeString(date)}:00`;
}

export function dateToDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
