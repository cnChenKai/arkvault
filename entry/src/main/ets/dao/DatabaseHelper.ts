// dao/DatabaseHelper.ts
// RDB database initialization and migration for ArkVault.

import { relationalStore } from '@ohos.data.relationalStore';
import { common } from '@kit.AbilityKit';

const DB_NAME: string = 'arkvault.db';
const DB_VERSION: number = 1;

const SQL_CREATE_ENTRIES: string = `
  CREATE TABLE IF NOT EXISTS password_entries (
    id TEXT PRIMARY KEY,
    title_index TEXT NOT NULL DEFAULT '',
    folder_id TEXT,
    favorite INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    encrypted_payload BLOB NOT NULL,
    payload_nonce BLOB NOT NULL,
    payload_key_ref TEXT NOT NULL
  )`;

const SQL_CREATE_FOLDERS: string = `
  CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`;

const SQL_CREATE_VAULT_CONFIG: string = `
  CREATE TABLE IF NOT EXISTS vault_config (
    id TEXT PRIMARY KEY,
    kdf_algorithm TEXT NOT NULL,
    kdf_iterations INTEGER NOT NULL,
    kdf_salt_ref TEXT NOT NULL,
    local_cipher TEXT NOT NULL,
    vault_key_ref TEXT NOT NULL,
    auto_lock_seconds INTEGER NOT NULL DEFAULT 300,
    biometric_unlock_enabled INTEGER NOT NULL DEFAULT 0,
    server_url TEXT,
    sync_enabled INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`;

const SQL_CREATE_INDEX_FOLDER: string =
  'CREATE INDEX IF NOT EXISTS idx_entries_folder ON password_entries(folder_id)';
const SQL_CREATE_INDEX_FAVORITE: string =
  'CREATE INDEX IF NOT EXISTS idx_entries_favorite ON password_entries(favorite)';

let store: relationalStore.RdbStore | null = null;

/**
 * Get or create the RDB store.
 */
export async function getDatabase(context: common.UIAbilityContext): Promise<relationalStore.RdbStore> {
  if (store !== null) {
    return store;
  }

  const config: relationalStore.StoreConfig = {
    name: DB_NAME,
    securityLevel: relationalStore.SecurityLevel.S1
  };

  store = await relationalStore.getRdbStore(context, config);

  // Create tables
  await store.executeSql(SQL_CREATE_ENTRIES);
  await store.executeSql(SQL_CREATE_FOLDERS);
  await store.executeSql(SQL_CREATE_VAULT_CONFIG);
  await store.executeSql(SQL_CREATE_INDEX_FOLDER);
  await store.executeSql(SQL_CREATE_INDEX_FAVORITE);

  return store;
}

/**
 * Close the database connection.
 */
export function closeDatabase(): void {
  if (store !== null) {
    store.destroy();
    store = null;
  }
}
