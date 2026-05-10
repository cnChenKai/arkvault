// crypto/CryptoService.ts
// Core cryptographic operations for ArkVault.
// Wraps HarmonyOS Crypto Architecture Kit and Universal Keystore Kit.
//
// SECURITY: Never log, export, or persist raw keys outside approved secure storage.

import { cryptoFramework } from '@kit.CryptoArchitectureKit';
import { util } from '@kit.ArkTS';

const PBKDF2_ITERATIONS: number = 600000;
const AES_KEY_SIZE: number = 256;
const GCM_IV_LENGTH: number = 12;
const GCM_TAG_LENGTH: number = 128;

export interface DerivedKey {
  keyData: Uint8Array;
  salt: Uint8Array;
  iterations: number;
}

export interface EncryptedResult {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  tag: Uint8Array;
}

/**
 * Generate cryptographically secure random bytes.
 */
export function generateRandomBytes(length: number): Uint8Array {
  const rand: cryptoFramework.Random = cryptoFramework.createRandom();
  const result: Uint8Array = rand.generateRandomSync(length).data;
  return result;
}

/**
 * Generate a UUID v4 string.
 */
export function generateId(): string {
  const bytes: Uint8Array = generateRandomBytes(16);
  const hex: string = Array.from(bytes)
    .map((b: number) => b.toString(16).padStart(2, '0'))
    .join('');
  return (
    hex.substring(0, 8) + '-' +
    hex.substring(8, 12) + '-' +
    '4' + hex.substring(13, 16) + '-' +
    hex.substring(16, 20) + '-' +
    hex.substring(20, 32)
  );
}

/**
 * Derive a key from master password using PBKDF2-HMAC-SHA256.
 * Returns the derived key material and the salt used.
 */
export async function deriveMasterKey(
  password: string,
  existingSalt?: Uint8Array
): Promise<DerivedKey> {
  const salt: Uint8Array = existingSalt ?? generateRandomBytes(32);
  const passwordBytes: Uint8Array = stringToBytes(password);

  const spec: cryptoFramework.PBKDF2Spec = {
    algName: 'PBKDF2',
    password: passwordBytes,
    salt: salt,
    iterations: PBKDF2_ITERATIONS,
    keySize: AES_KEY_SIZE / 8
  };

  const kdf: cryptoFramework.Kdf = cryptoFramework.createKdf('PBKDF2|SHA256');
  const secret: cryptoFramework.DataBlob = await kdf.generateSecret(spec);

  return {
    keyData: secret.data,
    salt: salt,
    iterations: PBKDF2_ITERATIONS
  };
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Uses a fresh random nonce for each encryption.
 */
export async function encryptAesGcm(
  key: Uint8Array,
  plaintext: Uint8Array
): Promise<EncryptedResult> {
  const nonce: Uint8Array = generateRandomBytes(GCM_IV_LENGTH);

  const symKey: cryptoFramework.SymKey = buildSymKey(key);
  const cipher: cryptoFramework.Cipher =
    cryptoFramework.createCipher('AES256|GCM|PKCS7');

  const gcmParams: cryptoFramework.GcmParamsSpec = {
    iv: { data: nonce },
    aad: { data: new Uint8Array(0) },
    authTag: { data: new Uint8Array(GCM_TAG_LENGTH / 8) },
    algName: 'GcmParamsSpec'
  };

  await cipher.init(cryptoFramework.CryptoMode.ENCRYPT_MODE, symKey, gcmParams);
  const encrypted: cryptoFramework.DataBlob =
    await cipher.doFinal({ data: plaintext });

  return {
    ciphertext: encrypted.data,
    nonce: nonce,
    tag: new Uint8Array(0) // tag is included in GCM output
  };
}

/**
 * Decrypt ciphertext using AES-256-GCM.
 */
export async function decryptAesGcm(
  key: Uint8Array,
  ciphertext: Uint8Array,
  nonce: Uint8Array
): Promise<Uint8Array> {
  const symKey: cryptoFramework.SymKey = buildSymKey(key);
  const cipher: cryptoFramework.Cipher =
    cryptoFramework.createCipher('AES256|GCM|PKCS7');

  const gcmParams: cryptoFramework.GcmParamsSpec = {
    iv: { data: nonce },
    aad: { data: new Uint8Array(0) },
    authTag: { data: new Uint8Array(GCM_TAG_LENGTH / 8) },
    algName: 'GcmParamsSpec'
  };

  await cipher.init(cryptoFramework.CryptoMode.DECRYPT_MODE, symKey, gcmParams);
  const decrypted: cryptoFramework.DataBlob =
    await cipher.doFinal({ data: ciphertext });

  return decrypted.data;
}

/**
 * Wrap (encrypt) a vault key with a key-encryption key.
 * The wrapped key is stored in Asset Store Kit.
 */
export async function wrapKey(
  keyEncryptionKey: Uint8Array,
  vaultKey: Uint8Array
): Promise<EncryptedResult> {
  return encryptAesGcm(keyEncryptionKey, vaultKey);
}

/**
 * Unwrap (decrypt) a vault key with a key-encryption key.
 */
export async function unwrapKey(
  keyEncryptionKey: Uint8Array,
  wrappedKey: Uint8Array,
  nonce: Uint8Array
): Promise<Uint8Array> {
  return decryptAesGcm(keyEncryptionKey, wrappedKey, nonce);
}

// --- Internal helpers ---

function buildSymKey(keyBytes: Uint8Array): cryptoFramework.SymKey {
  const keyBlob: cryptoFramework.DataBlob = { data: keyBytes };
  const symKeyGenerator: cryptoFramework.SymKeyGenerator =
    cryptoFramework.createSymKeyGenerator('AES256');
  return symKeyGenerator.convertKeySync(keyBlob);
}

function stringToBytes(str: string): Uint8Array {
  const encoder: util.TextEncoder = new util.TextEncoder();
  return encoder.encode(str);
}
