/**
 * Store Groups Database Queries
 * STUBBED: SQLite tables not yet in Supabase
 */

import { nanoid } from 'nanoid';

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

// ==================== STORE GROUP CRUD (STUBBED) ====================

export function createStoreGroup(data: {
  name: string;
  description?: string;
}): StoreGroup {
  console.log('[store-groups-queries] createStoreGroup stubbed');
  const now = new Date().toISOString();
  return {
    id: nanoid(16),
    name: data.name,
    description: data.description || null,
    store_count: 0,
    created_at: now,
    updated_at: now,
  };
}

export function getAllStoreGroups(): StoreGroup[] {
  console.log('[store-groups-queries] getAllStoreGroups stubbed');
  return [];
}

export function getStoreGroupById(id: string): StoreGroup | null {
  console.log('[store-groups-queries] getStoreGroupById stubbed');
  return null;
}

export function getStoreGroupWithStores(id: string): StoreGroupWithStores | null {
  console.log('[store-groups-queries] getStoreGroupWithStores stubbed');
  return null;
}

export function updateStoreGroup(
  id: string,
  data: {
    name?: string;
    description?: string;
  }
): boolean {
  console.log('[store-groups-queries] updateStoreGroup stubbed');
  return false;
}

export function deleteStoreGroup(id: string): boolean {
  console.log('[store-groups-queries] deleteStoreGroup stubbed');
  return false;
}

// ==================== STORE GROUP MEMBERS (STUBBED) ====================

export function addStoresToGroup(groupId: string, storeIds: string[]): {
  added: number;
  skipped: number;
} {
  console.log('[store-groups-queries] addStoresToGroup stubbed');
  return { added: 0, skipped: 0 };
}

export function removeStoreFromGroup(groupId: string, storeId: string): boolean {
  console.log('[store-groups-queries] removeStoreFromGroup stubbed');
  return false;
}

export function removeAllStoresFromGroup(groupId: string): boolean {
  console.log('[store-groups-queries] removeAllStoresFromGroup stubbed');
  return false;
}

export function getStoresInGroup(groupId: string): any[] {
  console.log('[store-groups-queries] getStoresInGroup stubbed');
  return [];
}

export function isStoreInGroup(groupId: string, storeId: string): boolean {
  console.log('[store-groups-queries] isStoreInGroup stubbed');
  return false;
}
