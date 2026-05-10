// utils/StringUtils.ts
// String utility functions.

/**
 * Truncate a string to a maximum length with ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Check if a string is empty or whitespace.
 */
export function isEmpty(str: string | null | undefined): boolean {
  if (str === null || str === undefined) {
    return true;
  }
  return str.trim().length === 0;
}

/**
 * Normalize a URL — add https:// if no protocol present.
 */
export function normalizeUrl(url: string): string {
  if (url.length === 0) {
    return url;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return 'https://' + url;
}

/**
 * Extract domain from URL for display.
 */
export function extractDomain(url: string): string {
  try {
    const normalized: string = normalizeUrl(url);
    const match: RegExpMatchArray | null =
      normalized.match(/^https?:\/\/([^/]+)/);
    if (match !== null && match.length > 1) {
      return match[1];
    }
  } catch (_e) {
    // ignore
  }
  return url;
}
