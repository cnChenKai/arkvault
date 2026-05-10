// models/Folder.ts
// Data model for vault folder organization.

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export function createEmptyFolder(): Folder {
  return {
    id: '',
    name: '',
    parentId: null,
    sortOrder: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}
