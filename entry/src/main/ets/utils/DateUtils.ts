// utils/DateUtils.ts
// Date formatting utilities.

/**
 * Format a timestamp to a human-readable relative time.
 */
export function formatRelativeTime(timestamp: number): string {
  const now: number = Date.now();
  const diff: number = now - timestamp;

  if (diff < 60000) {
    return '刚刚';
  }
  if (diff < 3600000) {
    const minutes: number = Math.floor(diff / 60000);
    return minutes + ' 分钟前';
  }
  if (diff < 86400000) {
    const hours: number = Math.floor(diff / 3600000);
    return hours + ' 小时前';
  }
  if (diff < 2592000000) {
    const days: number = Math.floor(diff / 86400000);
    return days + ' 天前';
  }

  return formatDate(timestamp);
}

/**
 * Format a timestamp to YYYY-MM-DD.
 */
export function formatDate(timestamp: number): string {
  const date: Date = new Date(timestamp);
  const year: string = date.getFullYear().toString();
  const month: string = (date.getMonth() + 1).toString().padStart(2, '0');
  const day: string = date.getDate().toString().padStart(2, '0');
  return year + '-' + month + '-' + day;
}

/**
 * Format a timestamp to YYYY-MM-DD HH:mm.
 */
export function formatDateTime(timestamp: number): string {
  const datePart: string = formatDate(timestamp);
  const date: Date = new Date(timestamp);
  const hours: string = date.getHours().toString().padStart(2, '0');
  const minutes: string = date.getMinutes().toString().padStart(2, '0');
  return datePart + ' ' + hours + ':' + minutes;
}
