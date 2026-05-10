// dao/FolderDao.ts
// CRUD operations for folders in RDB.

import { relationalStore } from '@ohos.data.relationalStore';
import { Folder } from '../models/Folder';
import { getDatabase } from './DatabaseHelper';
import { common } from '@kit.AbilityKit';

const TABLE: string = 'folders';

export async function upsertFolder(
  context: common.UIAbilityContext,
  folder: Folder
): Promise<void> {
  const db: relationalStore.RdbStore = await getDatabase(context);
  const bucket: relationalStore.ValuesBucket = {
    id: folder.id,
    name: folder.name,
    parent_id: folder.parentId,
    sort_order: folder.sortOrder,
    created_at: folder.createdAt,
    updated_at: folder.updatedAt
  };
  await db.insertWithConflictResolution(
    TABLE,
    bucket,
    relationalStore.ConflictResolution.ON_CONFLICT_REPLACE
  );
}

export async function getAllFolders(
  context: common.UIAbilityContext
): Promise<Folder[]> {
  const db: relationalStore.RdbStore = await getDatabase(context);
  const predicates = new relationalStore.RdbPredicates(TABLE);
  predicates.orderByAsc('sort_order');

  const resultSet: relationalStore.ResultSet =
    await db.query(predicates, [
      'id', 'name', 'parent_id', 'sort_order', 'created_at', 'updated_at'
    ]);

  const folders: Folder[] = [];
  while (resultSet.goToNextRow()) {
    folders.push({
      id: resultSet.getString(resultSet.getColumnIndex('id')),
      name: resultSet.getString(resultSet.getColumnIndex('name')),
      parentId: resultSet.getString(resultSet.getColumnIndex('parent_id')),
      sortOrder: resultSet.getLong(resultSet.getColumnIndex('sort_order')),
      createdAt: resultSet.getLong(resultSet.getColumnIndex('created_at')),
      updatedAt: resultSet.getLong(resultSet.getColumnIndex('updated_at'))
    });
  }
  resultSet.close();
  return folders;
}

export async function deleteFolder(
  context: common.UIAbilityContext,
  id: string
): Promise<void> {
  const db: relationalStore.RdbStore = await getDatabase(context);
  const predicates = new relationalStore.RdbPredicates(TABLE);
  predicates.equalTo('id', id);
  await db.delete(predicates);
}
