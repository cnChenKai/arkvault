// services/VaultService.ts
// Core vault operations: lock/unlock, encrypt/decrypt entries, manage master password.
//
// SECURITY: This service holds the decrypted vault key in memory only while unlocked.
// On lock, all sensitive in-memory state is cleared.

import { PasswordEntry, EncryptedPasswordEntry } from '../models/PasswordEntry';
import { VaultConfig, DEFAULT_VAULT_CONFIG } from '../models/VaultConfig';
import {
  deriveMasterKey, encryptAesGcm, decryptAesGcm,
  wrapKey, unwrapKey, generateRandomBytes, generateId
} from '../crypto/CryptoService';
import { storeAsset, retrieveAsset, deleteAsset, assetExists } from '../crypto/AssetStoreAdapter';
import { common } from '@kit.AbilityKit';
import { util } from '@kit.ArkTS';

const ASSET_VAULT_KEY: string = 'arkvault.vault.key';
const ASSET_KDF_SALT: string = 'arkvault.kdf.salt';
const ASSET_KEK: string = 'arkvault.kek';

interface VaultState {
  isUnlocked: boolean;
  vaultKey: Uint8Array | null;
  config: VaultConfig | null;
}

let state: VaultState = {
  isUnlocked: false,
  vaultKey: null,
  config: null
};

/**
 * Check if a vault has been initialized (master password set).
 */
export async function isVaultInitialized(): Promise<boolean> {
  return assetExists(ASSET_KDF_SALT);
}

/**
 * Initialize a new vault with a master password.
 * Must be called once before any vault operations.
 */
export async function initializeVault(
  context: common.UIAbilityContext,
  masterPassword: string
): Promise<void> {
  // Derive key-encryption key from master password
  const derived = await deriveMasterKey(masterPassword);

  // Generate random vault encryption key
  const vaultKey: Uint8Array = generateRandomBytes(32);

  // Wrap vault key with KEK
  const wrapped = await wrapKey(derived.keyData, vaultKey);

  // Store protected assets
  await storeAsset({
    alias: ASSET_KDF_SALT,
    data: derived.salt,
    requireScreenUnlock: false,
    allowCloudBackup: false
  });

  await storeAsset({
    alias: ASSET_KEK,
    data: wrapped.ciphertext,
    requireScreenUnlock: true,
    allowCloudBackup: false
  });

  // Store vault key wrapped nonce
  await storeAsset({
    alias: ASSET_VAULT_KEY,
    data: wrapped.nonce,
    requireScreenUnlock: true,
    allowCloudBackup: false
  });

  // Set unlocked state
  state.isUnlocked = true;
  state.vaultKey = vaultKey;

  // Clear KEK from memory
  clearBytes(derived.keyData);
}

/**
 * Unlock the vault with master password.
 */
export async function unlockWithPassword(
  masterPassword: string
): Promise<boolean> {
  const saltData: Uint8Array | null = await retrieveAsset(ASSET_KDF_SALT);
  if (saltData === null) {
    return false;
  }

  const derived = await deriveMasterKey(masterPassword, saltData);

  const wrappedCiphertext: Uint8Array | null = await retrieveAsset(ASSET_KEK);
  const wrappedNonce: Uint8Array | null = await retrieveAsset(ASSET_VAULT_KEY);
  if (wrappedCiphertext === null || wrappedNonce === null) {
    clearBytes(derived.keyData);
    return false;
  }

  try {
    const vaultKey: Uint8Array = await unwrapKey(
      derived.keyData, wrappedCiphertext, wrappedNonce
    );
    state.isUnlocked = true;
    state.vaultKey = vaultKey;
    clearBytes(derived.keyData);
    return true;
  } catch (_e) {
    clearBytes(derived.keyData);
    return false;
  }
}

/**
 * Lock the vault. Clears all sensitive in-memory state.
 */
export function lock(): void {
  if (state.vaultKey !== null) {
    clearBytes(state.vaultKey);
  }
  state.isUnlocked = false;
  state.vaultKey = null;
}

/**
 * Check if the vault is currently unlocked.
 */
export function isUnlocked(): boolean {
  return state.isUnlocked;
}

/**
 * Encrypt a PasswordEntry for storage.
 */
export async function encryptEntry(entry: PasswordEntry): Promise<EncryptedPasswordEntry> {
  if (!state.isUnlocked || state.vaultKey === null) {
    throw new Error('Vault is locked');
  }

  // Serialize sensitive fields
  const sensitiveData: string = JSON.stringify({
    username: entry.username,
    password: entry.password,
    url: entry.url,
    notes: entry.notes,
    tags: entry.tags,
    passwordHistory: entry.passwordHistory
  });

  const encoder: util.TextEncoder = new util.TextEncoder();
  const plaintext: Uint8Array = encoder.encode(sensitiveData);

  // Encrypt
  const result = await encryptAesGcm(state.vaultKey, plaintext);

  // Generate per-record key ref (for future key rotation)
  const keyRef: string = generateId();

  return {
    id: entry.id || generateId(),
    titleIndex: entry.title.toLowerCase(),
    folderId: entry.folder,
    favorite: entry.favorite,
    createdAt: entry.createdAt,
    updatedAt: Date.now(),
    encryptedPayload: result.ciphertext,
    payloadNonce: result.nonce,
    payloadKeyRef: keyRef
  };
}

/**
 * Decrypt an EncryptedPasswordEntry back to a PasswordEntry.
 */
export async function decryptEntry(encrypted: EncryptedPasswordEntry): Promise<PasswordEntry> {
  if (!state.isUnlocked || state.vaultKey === null) {
    throw new Error('Vault is locked');
  }

  const plaintext: Uint8Array = await decryptAesGcm(
    state.vaultKey,
    encrypted.encryptedPayload,
    encrypted.payloadNonce
  );

  const decoder: util.TextDecoder = new util.TextDecoder();
  const json: string = decoder.decode(plaintext);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sensitive: Record<string, Object> = JSON.parse(json) as Record<string, Object>;

  return {
    id: encrypted.id,
    title: encrypted.titleIndex,
    username: sensitive['username'] as string,
    password: sensitive['password'] as string,
    url: sensitive['url'] as string,
    notes: sensitive['notes'] as string,
    folder: encrypted.folderId,
    tags: sensitive['tags'] as string[],
    favorite: encrypted.favorite,
    createdAt: encrypted.createdAt,
    updatedAt: encrypted.updatedAt,
    passwordHistory: sensitive['passwordHistory'] as PasswordEntry['passwordHistory']
  };
}

/**
 * Change the master password.
 */
export async function changeMasterPassword(
  oldPassword: string,
  newPassword: string
): Promise<boolean> {
  // Verify old password
  const unlocked: boolean = await unlockWithPassword(oldPassword);
  if (!unlocked || state.vaultKey === null) {
    return false;
  }

  const vaultKey: Uint8Array = state.vaultKey.slice();

  // Derive new KEK
  const newDerived = await deriveMasterKey(newPassword);

  // Re-wrap vault key
  const wrapped = await wrapKey(newDerived.keyData, vaultKey);

  // Update stored assets
  await storeAsset({
    alias: ASSET_KDF_SALT,
    data: newDerived.salt,
    requireScreenUnlock: false,
    allowCloudBackup: false
  });

  await storeAsset({
    alias: ASSET_KEK,
    data: wrapped.ciphertext,
    requireScreenUnlock: true,
    allowCloudBackup: false
  });

  await storeAsset({
    alias: ASSET_VAULT_KEY,
    data: wrapped.nonce,
    requireScreenUnlock: true,
    allowCloudBackup: false
  });

  clearBytes(newDerived.keyData);
  return true;
}

// --- Internal helpers ---

function clearBytes(data: Uint8Array): void {
  for (let i: number = 0; i < data.length; i++) {
    data[i] = 0;
  }
}
