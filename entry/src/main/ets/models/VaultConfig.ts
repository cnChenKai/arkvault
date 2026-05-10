// models/VaultConfig.ts
// Configuration for the local vault.

export interface VaultConfig {
  id: string;
  kdfAlgorithm: 'PBKDF2_HMAC_SHA256';
  kdfIterations: number;
  kdfSaltRef: string;
  localCipher: 'AES_256_GCM';
  vaultKeyRef: string;
  autoLockSeconds: number;
  biometricUnlockEnabled: boolean;
  serverUrl: string | null;
  syncEnabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_VAULT_CONFIG: Partial<VaultConfig> = {
  kdfAlgorithm: 'PBKDF2_HMAC_SHA256',
  kdfIterations: 600000,
  localCipher: 'AES_256_GCM',
  autoLockSeconds: 300,
  biometricUnlockEnabled: false,
  serverUrl: null,
  syncEnabled: false
};
