// crypto/AssetStoreAdapter.ts
// Wrapper for HarmonyOS Asset Store Kit.
// Stores protected vault key material, KDF metadata, and biometric unlock data.
//
// SECURITY: Asset Store Kit values are encrypted by the OS and bound to
// device security state. Never mirror these values into RDB or preferences.

import { asset } from '@kit.AssetStoreKit';
import { util } from '@kit.ArkTS';

const TAG: string = 'AssetStoreAdapter';

interface AssetStoreOptions {
  alias: string;
  data: Uint8Array;
  requireScreenUnlock?: boolean;
  allowCloudBackup?: boolean;
}

/**
 * Store a protected value in Asset Store Kit.
 */
export async function storeAsset(options: AssetStoreOptions): Promise<void> {
  const attributes: asset.AssetMap = {
    '@ohos.security.assetStoreKit.tag.data': options.data,
    '@ohos.security.assetStoreKit.tag.access.control':
      options.requireScreenUnlock === true
        ? asset.AccessControl.DEVICE_PASSCODE
        : asset.AccessControl.DEVICE_CREDENTIAL,
    '@ohos.security.assetStoreKit.tag.sync.type':
      options.allowCloudBackup === true
        ? asset.SyncType.ALLOW_BACKUP
        : asset.SyncType.DO_NOT_BACK_UP
  };

  await asset.add({
    name: options.alias,
    attributes: attributes
  });
}

/**
 * Retrieve a protected value from Asset Store Kit.
 */
export async function retrieveAsset(alias: string): Promise<Uint8Array | null> {
  try {
    const result: asset.AssetResult = await asset.query({
      name: alias,
      attributes: {}
    });
    const data = result.attributes['@ohos.security.assetStoreKit.tag.data'];
    if (data instanceof Uint8Array) {
      return data;
    }
    return null;
  } catch (_e) {
    return null;
  }
}

/**
 * Delete a protected value from Asset Store Kit.
 */
export async function deleteAsset(alias: string): Promise<void> {
  try {
    await asset.remove({ name: alias, attributes: {} });
  } catch (_e) {
    // Asset may not exist
  }
}

/**
 * Check if an asset exists.
 */
export async function assetExists(alias: string): Promise<boolean> {
  const result: Uint8Array | null = await retrieveAsset(alias);
  return result !== null;
}
