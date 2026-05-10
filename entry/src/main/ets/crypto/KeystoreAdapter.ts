// crypto/KeystoreAdapter.ts
// Wrapper for HarmonyOS Universal Keystore Kit.
// Manages hardware-backed keys for biometric unlock.
//
// SECURITY: Private key material is non-exportable and hardware-bound.
// Key operations require user authentication when configured.

import { universalKeystoreKit } from '@ohos.security.universalKeystore';

const BIOMETRIC_KEY_ALIAS: string = 'arkvault.biometric.unwrap';

/**
 * Generate a hardware-backed key for biometric unlock.
 * The key requires user authentication (biometric or device credential) for each use.
 */
export async function generateBiometricKey(): Promise<string> {
  const keyProperties: universalKeystoreKit.HuksKeyProperties = {
    tag: universalKeystoreKit.HuksTag.HUSK_TAG_PURPOSE,
    value: [
      universalKeystoreKit.HuksKeyPurpose.HUKS_KEY_PURPOSE_WRAP,
      universalKeystoreKit.HuksKeyPurpose.HUKS_KEY_PURPOSE_UNWRAP
    ]
  };

  const authProperties: universalKeystoreKit.HuksKeyProperties = {
    tag: universalKeystoreKit.HuksTag.HUKS_TAG_USER_AUTH_TYPE,
    value: universalKeystoreKit.HuksUserAuthType.HUKS_USER_AUTH_TYPE_FINGERPRINT |
      universalKeystoreKit.HuksUserAuthType.HUKS_USER_AUTH_TYPE_FACE
  };

  const keyOptions: universalKeystoreKit.HuksOptions = {
    properties: [keyProperties, authProperties],
    inData: null
  };

  await universalKeystoreKit.generateKey(BIOMETRIC_KEY_ALIAS, keyOptions);
  return BIOMETRIC_KEY_ALIAS;
}

/**
 * Use the biometric key to wrap (encrypt) data.
 * Requires user authentication before the operation.
 */
export async function wrapWithBiometricKey(
  dataToWrap: Uint8Array
): Promise<Uint8Array> {
  const keyProperties: universalKeystoreKit.HuksKeyProperties = {
    tag: universalKeystoreKit.HuksTag.HUKS_TAG_PURPOSE,
    value: [universalKeystoreKit.HuksKeyPurpose.HUKS_KEY_PURPOSE_WRAP]
  };

  const options: universalKeystoreKit.HuksOptions = {
    properties: [keyProperties],
    inData: dataToWrap
  };

  const result: universalKeystoreKit.HuksReturnResult =
    await universalKeystoreKit.begin(BIOMETRIC_KEY_ALIAS, options);
  const finalResult: universalKeystoreKit.HuksReturnResult =
    await universalKeystoreKit.finish(BIOMETRIC_KEY_ALIAS, result.handle, { inData: null });

  return finalResult.outData;
}

/**
 * Use the biometric key to unwrap (decrypt) data.
 * Requires user authentication (biometric) before the operation.
 */
export async function unwrapWithBiometricKey(
  wrappedData: Uint8Array
): Promise<Uint8Array> {
  const keyProperties: universalKeystoreKit.HuksKeyProperties = {
    tag: universalKeystoreKit.HuksTag.HUKS_TAG_PURPOSE,
    value: [universalKeystoreKit.HuksKeyPurpose.HUKS_KEY_PURPOSE_UNWRAP]
  };

  const options: universalKeystoreKit.HuksOptions = {
    properties: [keyProperties],
    inData: wrappedData
  };

  const result: universalKeystoreKit.HuksReturnResult =
    await universalKeystoreKit.begin(BIOMETRIC_KEY_ALIAS, options);
  const finalResult: universalKeystoreKit.HuksReturnResult =
    await universalKeystoreKit.finish(BIOMETRIC_KEY_ALIAS, result.handle, { inData: null });

  return finalResult.outData;
}

/**
 * Delete the biometric key. Used when biometric unlock is disabled
 * or when re-enrollment is detected.
 */
export async function deleteBiometricKey(): Promise<void> {
  try {
    await universalKeystoreKit.deleteKey(BIOMETRIC_KEY_ALIAS);
  } catch (_e) {
    // Key may not exist
  }
}

/**
 * Check if the biometric key exists.
 */
export async function biometricKeyExists(): Promise<boolean> {
  try {
    const result: universalKeystoreKit.HuksReturnResult =
      await universalKeystoreKit.getKeyProperties(BIOMETRIC_KEY_ALIAS);
    return result !== null;
  } catch (_e) {
    return false;
  }
}
