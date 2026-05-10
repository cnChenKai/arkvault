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
  const attributes = new Map();
  attributes.set(asset.Tag.SECRET, options.data);
  attributes.set(asset.Tag.ALIAS, new util.TextEncoder().encode(options.alias));
  attributes.set(asset.Tag.REQUIRE_PASSWORD_SET, options.requireScreenUnlock === true);
  attributes.set(asset.Tag.SYNC_TYPE, options.allowCloudBackup === true ? 1 : 0);

  await asset.add(attributes as asset.AssetMap);
}

/**
 * Retrieve a protected value from Asset Store Kit.
 */
export async function retrieveAsset(alias: string): Promise<Uint8Array | null> {
  try {
    const query = new Map();
    query.set(asset.Tag.ALIAS, new util.TextEncoder().encode(alias));

    const results = await asset.query(query as asset.AssetMap);
    for (const result of results) {
      const data = result.get(asset.Tag.SECRET);
      if (data instanceof Uint8Array) {
        return data;
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
    const query = new Map();
    query.set(asset.Tag.ALIAS, new util.TextEncoder().encode(alias));
    await asset.remove(query as asset.AssetMap);
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
