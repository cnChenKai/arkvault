// models/PasswordEntry.ts
// Data model for a vault password entry.

export interface PasswordHistoryItem {
  password: string;
  changedAt: number;
}

export interface PasswordEntry {
  id: string;
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  folder: string | null;
  tags: string[];
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  passwordHistory: PasswordHistoryItem[];
}

/**
 * Encrypted shape stored in RDB.
 * The plaintext fields (username, password, url, notes, tags, passwordHistory)
 * are serialized into encryptedPayload as ciphertext.
 */
export interface EncryptedPasswordEntry {
  id: string;
  titleIndex: string;
  folderId: string | null;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  encryptedPayload: Uint8Array;
  payloadNonce: Uint8Array;
  payloadKeyRef: string;
}

export function createEmptyEntry(): PasswordEntry {
  return {
    id: '',
    title: '',
    username: '',
    password: '',
    url: '',
    notes: '',
    folder: null,
    tags: [],
    favorite: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    passwordHistory: []
  };
}
