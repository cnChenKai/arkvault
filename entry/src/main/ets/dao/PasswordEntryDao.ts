// dao/PasswordEntryDao.ts
// CRUD operations for encrypted password entries in RDB.

import { relationalStore } from '@ohos.data.relationalStore';
import { EncryptedPasswordEntry } from '../models/PasswordEntry';
import { getDatabase } from './DatabaseHelper';
import { common } from '@kit.AbilityKit';

const TABLE: string = 'password_entries';

/**
 * Insert or replace an encrypted entry.
 */
export async function upsertEntry(
  context: common.UIAbilityContext,
  entry: EncryptedPasswordEntry
): Promise<void> {
  const db: relationalStore.RdbStore = await getDatabase(context);
  const bucket: relationalStore.ValuesBucket = {
    id: entry.id,
    title_index: entry.titleIndex,
    folder_id: entry.folderId,
    favorite: entry.favorite ? 1 : 0,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
    encrypted_payload: entry.encryptedPayload,
    payload_nonce: entry.payloadNonce,
    payload_key_ref: entry.payloadKeyRef
  };

  await db.insertWithConflictResolution(
    TABLE,
    bucket,
    relationalStore.ConflictResolution.ON_CONFLICT_REPLACE
  );
}

/**
 * Get all entries (encrypted). Returns minimal metadata for list display.
 */
export async function getAllEntries(
  context: common.UIAbilityContext
): Promise<EncryptedPasswordEntry[]> {
  const db: relationalStore.RdbStore = await getDatabase(context);
  const predicates = new relationalStore.RdbPredicates(TABLE);
  predicates.orderByDesc('updated_at');

  const resultSet: relationalStore.ResultSet =
    await db.query(predicates, [
      'id', 'title_index', 'folder_id', 'favorite',
      'created_at', 'updated_at',
      'encrypted_payload', 'payload_nonce', 'payload_key_ref'
    ]);

  const entries: EncryptedPasswordEntry[] = [];
  while (resultSet.goToNextRow()) {
    entries.push(resultSetToEntry(resultSet));
  }
  resultSet.close();
  return entries;
}

/**
 * Get entries by folder.
 */
export async function getEntriesByFolder(
  context: common.UIAbilityContext,
  folderId: string | null
): Promise<EncryptedPasswordEntry[]> {
  const db: relationalStore.RdbStore = await getDatabase(context);
  const predicates = new relationalStore.RdbPredicates(TABLE);
  if (folderId === null) {
    predicates.isNull('folder_id');
  } else {
    predicates.equalTo('folder_id', folderId);
  }
  predicates.orderByDesc('updated_at');

  const resultSet: relationalStore.ResultSet =
    await db.query(predicates, [
      'id', 'title_index', 'folder_id', 'favorite',
      'created_at', 'updated_at',
      'encrypted_payload', 'payload_nonce', 'payload_key_ref'
    ]);

  const entries: EncryptedPasswordEntry[] = [];
  while (resultSet.goToNextRow()) {
    entries.push(resultSetToEntry(resultSet));
  }
  resultSet.close();
  return entries;
}

/**
 * Get a single entry by ID.
 */
export async function getEntryById(
  context: common.UIAbilityContext,
  id: string
): Promise<EncryptedPasswordEntry | null> {
  const db: relationalStore.RdbStore = await getDatabase(context);
  const predicates = new relationalStore.RdbPredicates(TABLE);
  predicates.equalTo('id', id);

  const resultSet: relationalStore.ResultSet =
    await db.query(predicates, [
      'id', 'title_index', 'folder_id', 'favorite',
      'created_at', 'updated_at',
      'encrypted_payload', 'payload_nonce', 'payload_key_ref'
    ]);

  if (resultSet.goToNextRow()) {
    const entry: EncryptedPasswordEntry = resultSetToEntry(resultSet);
    resultSet.close();
    return entry;
  }
  resultSet.close();
  return null;
}

/**
 * Search entries by title index.
 */
export async function searchEntries(
  context: common.UIAbilityContext,
  query: string
): Promise<EncryptedPasswordEntry[]> {
  const db: relationalStore.RdbStore = await getDatabase(context);
  const predicates = new relationalStore.RdbPredicates(TABLE);
  predicates.contains('title_index', query.toLowerCase());

  const resultSet: relationalStore.ResultSet =
    await db.query(predicates, [
      'id', 'title_index', 'folder_id', 'favorite',
      'created_at', 'updated_at',
      'encrypted_payload', 'payload_nonce', 'payload_key_ref'
    ]);

  const entries: EncryptedPasswordEntry[] = [];
  while (resultSet.goToNextRow()) {
    entries.push(resultSetToEntry(resultSet));
  }
  resultSet.close();
  return entries;
}

/**
 * Delete an entry by ID.
 */
export async function deleteEntry(
  context: common.UIAbilityContext,
  id: string
): Promise<void> {
  const db: relationalStore.RdbStore = await getDatabase(context);
  const predicates = new relationalStore.RdbPredicates(TABLE);
  predicates.equalTo('id', id);
  await db.delete(predicates);
}

/**
 * Get count of all entries.
 */
export async function getEntryCount(
  context: common.UIAbilityContext
): Promise<number> {
  const db: relationalStore.RdbStore = await getDatabase(context);
  const predicates = new relationalStore.RdbPredicates(TABLE);
  const resultSet: relationalStore.ResultSet =
    await db.query(predicates, ['COUNT(*) as cnt']);
  let count: number = 0;
  if (resultSet.goToNextRow()) {
    count = resultSet.getLong(resultSet.getColumnIndex('cnt'));
  }
  resultSet.close();
  return count;
}

// --- Internal helpers ---

function resultSetToEntry(rs: relationalStore.ResultSet): EncryptedPasswordEntry {
  return {
    id: rs.getString(rs.getColumnIndex('id')),
    titleIndex: rs.getString(rs.getColumnIndex('title_index')),
    folderId: rs.getString(rs.getColumnIndex('folder_id')),
    favorite: rs.getLong(rs.getColumnIndex('favorite')) === 1,
    createdAt: rs.getLong(rs.getColumnIndex('created_at')),
    updatedAt: rs.getLong(rs.getColumnIndex('updated_at')),
    encryptedPayload: rs.getBlob(rs.getColumnIndex('encrypted_payload')),
    payloadNonce: rs.getBlob(rs.getColumnIndex('payload_nonce')),
    payloadKeyRef: rs.getString(rs.getColumnIndex('payload_key_ref'))
  };
}
