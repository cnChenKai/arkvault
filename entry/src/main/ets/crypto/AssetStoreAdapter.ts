// crypto/AssetStoreAdapter.ts
// Wrapper for HarmonyOS Asset Store Kit.
// Stores protected vault key material, KDF metadata, and biometric unlock data.
//
// SECURITY: Asset Store Kit values are encrypted by the OS and bound to
// device security state. Never mirror these values into RDB or preferences.

import { asset } from '@kit.AssetStoreKit';
import { util } from '@kit.ArkTS';

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
  const attributes: asset.AssetMap = [
    { tag: asset.Tag.SECRET, value: options.data },
    { tag: asset.Tag.ALIAS, value: new util.TextEncoder().encode(options.alias) },
    { tag: asset.Tag.REQUIRE_PASSWORD_SET, value: options.requireScreenUnlock === true },
    { tag: asset.Tag.SYNC_TYPE, value: options.allowCloudBackup === true ? 1 : 0 }
  ];

  await asset.add(attributes);
}

/**
 * Retrieve a protected value from Asset Store Kit.
 */
export async function retrieveAsset(alias: string): Promise<Uint8Array | null> {
  try {
    const query: asset.AssetMap = [
      { tag: asset.Tag.ALIAS, value: new util.TextEncoder().encode(alias) }
    ];

    const result: asset.AssetMap = await asset.query(query);
    for (const item of result) {
      if (item.tag === asset.Tag.SECRET && item.value instanceof Uint8Array) {
        return item.value;
      }
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
    const query: asset.AssetMap = [
      { tag: asset.Tag.ALIAS, value: new util.TextEncoder().encode(alias) }
    ];
    await asset.remove(query);
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
