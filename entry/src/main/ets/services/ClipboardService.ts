// services/ClipboardService.ts
// Secure clipboard operations with automatic clearing.

import { pasteboard } from '@kit.BasicServicesKit';
import { promptAction } from '@kit.ArkUI';

const DEFAULT_CLEAR_DELAY_MS: number = 30000;
let clearTimerId: number = -1;

/**
 * Copy text to clipboard and schedule automatic clearing.
 */
export function copyToClipboard(text: string, label: string = 'Copied'): void {
  const pasteboardData: pasteboard.PasteData =
    pasteboard.createData(pasteboard.MIMETYPE_TEXT_PLAIN, text);
  pasteboard.getSystemPasteboard().setData(pasteboardData);

  // Show brief confirmation
  promptAction.showToast({ message: label, duration: 1500 });

  // Schedule clearing
  scheduleClear();
}

/**
 * Schedule clipboard clearing after the configured delay.
 */
function scheduleClear(): void {
  if (clearTimerId >= 0) {
    clearTimeout(clearTimerId);
  }
  clearTimerId = setTimeout(() => {
    clearClipboard();
    clearTimerId = -1;
  }, DEFAULT_CLEAR_DELAY_MS);
}

/**
 * Immediately clear the clipboard.
 */
export function clearClipboard(): void {
  const emptyData: pasteboard.PasteData =
    pasteboard.createData(pasteboard.MIMETYPE_TEXT_PLAIN, '');
  pasteboard.getSystemPasteboard().setData(emptyData);
}

/**
 * Cancel pending clipboard clear (e.g., on app foreground).
 */
export function cancelPendingClear(): void {
  if (clearTimerId >= 0) {
    clearTimeout(clearTimerId);
    clearTimerId = -1;
  }
}
