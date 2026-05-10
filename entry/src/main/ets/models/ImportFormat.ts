// models/ImportFormat.ts
// Supported import formats and their detection signatures.

export type ImportFormat =
  | 'bitwarden_csv'
  | 'bitwarden_json'
  | 'onepassword_1pux'
  | 'lastpass_csv'
  | 'chrome_csv'
  | 'generic_csv';

export interface ImportRecord {
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  folder: string | null;
  tags: string[];
  favorite: boolean;
}

export interface ImportResult {
  totalRows: number;
  imported: number;
  skipped: number;
  errors: string[];
}

/**
 * Detect format from file content and extension.
 */
export function detectImportFormat(
  fileName: string,
  content: string
): ImportFormat | null {
  if (fileName.endsWith('.json')) {
    try {
      const parsed: Object = JSON.parse(content);
      if (parsed !== null && parsed !== undefined) {
        const obj = parsed as Record<string, Object>;
        if ('items' in obj && 'folders' in obj) {
          return 'bitwarden_json';
        }
      }
    } catch (_e) {
      // not valid JSON
    }
    return null;
  }

  if (fileName.endsWith('.1pux')) {
    return 'onepassword_1pux';
  }

  if (!fileName.endsWith('.csv')) {
    return null;
  }

  const firstLine: string = content.split('\n')[0].toLowerCase();

  if (firstLine.includes('folder') && firstLine.includes('login_uri')) {
    return 'bitwarden_csv';
  }

  if (firstLine.includes('url') && firstLine.includes('username') && firstLine.includes('password')) {
    // Could be LastPass or Chrome
    if (firstLine.includes('grouping') || firstLine.includes('extra')) {
      return 'lastpass_csv';
    }
    if (firstLine.includes('name') && firstLine.includes('url') && !firstLine.includes('note')) {
      return 'chrome_csv';
    }
    return 'lastpass_csv';
  }

  return 'generic_csv';
}
