import { nanoid } from 'nanoid';
import { getDatabase } from './connection';

// ==================== TYPES ====================

export interface StoreGroup {
  id: string;
  name: string;
  description: string | null;
  store_count: number;
  created_at: string;
  updated_at: string;
}

export interface StoreGroupMember {
  id: string;
  group_id: string;
  store_id: string;
  added_at: string;
}

export interface StoreGroupWithStores extends StoreGroup {
  stores: Array<{
    id: string;
    store_number: string;
    name: string;
    city: string | null;
    state: string | null;
    region: string | null;
  }>;
}

// ==================== STORE GROUP CRUD ====================

/**
 * Create a new store group
 */
export function createStoreGroup(data: {
  name: string;
  description?: string;
}): StoreGroup {
  const db = createServiceClient();
  const id = nanoid(16);
  const created_at = new Date().toISOString();
  const updated_at = created_at;

  const stmt = db.prepare(`
    INSERT INTO store_groups (id, name, description, store_count, created_at, updated_at)
    VALUES (?, ?, ?, 0, ?, ?)
  `);

  stmt.run(id, data.name, data.description || null, created_at, updated_at);

  return {
    id,
    name: data.name,
    description: data.description || null,
    store_count: 0,
    created_at,
    updated_at,
  };
}

/**
 * Get all store groups
 */
export function getAllStoreGroups(): StoreGroup[] {
  const db = createServiceClient();

  const stmt = db.prepare(`
    SELECT * FROM store_groups
    ORDER BY name ASC
  `);

  return stmt.all() as StoreGroup[];
}

/**
 * Get store group by ID
 */
export function getStoreGroupById(id: string): StoreGroup | null {
  const db = createServiceClient();

  const stmt = db.prepare(`
    SELECT * FROM store_groups
    WHERE id = ?
  `);

  return stmt.get(id) as StoreGroup | null;
}

/**
 * Get store group with all its stores
 */
export function getStoreGroupWithStores(id: string): StoreGroupWithStores | null {
  const db = createServiceClient();

  // Get group
  const group = getStoreGroupById(id);
  if (!group) return null;

  // Get stores in group
  const storesStmt = db.prepare(`
    SELECT
      s.id,
      s.store_number,
      s.name,
      s.city,
      s.state,
      s.region
    FROM store_group_members m
    JOIN retail_stores s ON m.store_id = s.id
    WHERE m.group_id = ?
    ORDER BY s.store_number ASC
  `);

  const stores = storesStmt.all(id) as Array<{
    id: string;
    store_number: string;
    name: string;
    city: string | null;
    state: string | null;
    region: string | null;
  }>;

  return {
    ...group,
    stores,
  };
}

/**
 * Update store group
 */
export function updateStoreGroup(
  id: string,
  data: {
    name?: string;
    description?: string;
  }
): boolean {
  const db = createServiceClient();
  const updated_at = new Date().toISOString();

  const updates: string[] = [];
  const params: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name);
  }

  if (data.description !== undefined) {
    updates.push('description = ?');
    params.push(data.description);
  }

  if (updates.length === 0) return false;

  updates.push('updated_at = ?');
  params.push(updated_at, id);

  const stmt = db.prepare(`
    UPDATE store_groups
    SET ${updates.join(', ')}
    WHERE id = ?
  `);

  const result = stmt.run(...params);
  return result.changes > 0;
}

/**
 * Delete store group
 */
export function deleteStoreGroup(id: string): boolean {
  const db = createServiceClient();

  const stmt = db.prepare(`
    DELETE FROM store_groups
    WHERE id = ?
  `);

  const result = stmt.run(id);
  return result.changes > 0;
}

// ==================== STORE GROUP MEMBERS ====================

/**
 * Add stores to a group
 */
export function addStoresToGroup(groupId: string, storeIds: string[]): {
  added: number;
  skipped: number;
} {
  const db = createServiceClient();

  let added = 0;
  let skipped = 0;

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO store_group_members (id, group_id, store_id, added_at)
    VALUES (?, ?, ?, ?)
  `);

  // Use transaction for bulk insert
  const transaction = db.transaction((storeIds: string[]) => {
    for (const storeId of storeIds) {
      const id = nanoid(16);
      const added_at = new Date().toISOString();

      const result = insertStmt.run(id, groupId, storeId, added_at);

      if (result.changes > 0) {
        added++;
      } else {
        skipped++; // Already in group
      }
    }

    // Update store count
    updateStoreGroupCount(groupId);
  });

  transaction(storeIds);

  return { added, skipped };
}

/**
 * Remove store from group
 */
export function removeStoreFromGroup(groupId: string, storeId: string): boolean {
  const db = createServiceClient();

  const stmt = db.prepare(`
    DELETE FROM store_group_members
    WHERE group_id = ? AND store_id = ?
  `);

  const result = stmt.run(groupId, storeId);

  if (result.changes > 0) {
    updateStoreGroupCount(groupId);
    return true;
  }

  return false;
}

/**
 * Remove all stores from group
 */
export function removeAllStoresFromGroup(groupId: string): boolean {
  const db = createServiceClient();

  const stmt = db.prepare(`
    DELETE FROM store_group_members
    WHERE group_id = ?
  `);

  const result = stmt.run(groupId);

  if (result.changes > 0) {
    updateStoreGroupCount(groupId);
    return true;
  }

  return false;
}

/**
 * Get stores in a group
 */
export function getStoresInGroup(groupId: string) {
  const db = createServiceClient();

  const stmt = db.prepare(`
    SELECT
      s.id,
      s.store_number,
      s.name,
      s.city,
      s.state,
      s.region,
      s.address,
      m.added_at
    FROM store_group_members m
    JOIN retail_stores s ON m.store_id = s.id
    WHERE m.group_id = ?
    ORDER BY s.store_number ASC
  `);

  return stmt.all(groupId);
}

/**
 * Update store count for a group
 */
function updateStoreGroupCount(groupId: string): void {
  const db = createServiceClient();

  const stmt = db.prepare(`
    UPDATE store_groups
    SET
      store_count = (SELECT COUNT(*) FROM store_group_members WHERE group_id = ?),
      updated_at = ?
    WHERE id = ?
  `);

  const updated_at = new Date().toISOString();
  stmt.run(groupId, updated_at, groupId);
}

/**
 * Check if store is in group
 */
export function isStoreInGroup(groupId: string, storeId: string): boolean {
  const db = createServiceClient();

  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM store_group_members
    WHERE group_id = ? AND store_id = ?
  `);

  const result = stmt.get(groupId, storeId) as { count: number };
  return result.count > 0;
}
