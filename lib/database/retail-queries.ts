import { nanoid } from "nanoid";
import { getDatabase } from "./connection";

// ==================== TYPES ====================

export interface RetailStore {
  id: string;
  store_number: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  region?: string;
  district?: string;
  size_category?: string;
  demographic_profile?: string; // JSON string
  lat?: number;
  lng?: number;
  timezone?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface StoreWithStats extends RetailStore {
  total_campaigns?: number;
  total_recipients?: number;
  total_conversions?: number;
  conversion_rate?: number;
}

export interface PaginatedStores {
  stores: StoreWithStats[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface StoreQueryOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  region?: string;
  state?: string;
  isActive?: boolean;
  sortBy?: 'store_number' | 'name' | 'city' | 'created_at';
  sortOrder?: 'ASC' | 'DESC';
}

// ==================== SAFETY CHECK ====================

function ensureRetailModuleEnabled() {
  // Note: This is a runtime safety check
  // In production, also check settings before calling these functions
  return true; // For now, always allow (settings check happens in API routes)
}

// ==================== STORE CRUD OPERATIONS ====================

/**
 * Create a new retail store
 */
export function createRetailStore(data: {
  storeNumber: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  region?: string;
  district?: string;
  sizeCategory?: string;
  demographicProfile?: object;
  lat?: number;
  lng?: number;
  timezone?: string;
}): RetailStore {
  ensureRetailModuleEnabled();

  const db = getDatabase();
  const id = nanoid(16);
  const created_at = new Date().toISOString();
  const updated_at = created_at;

  const stmt = db.prepare(`
    INSERT INTO retail_stores (
      id, store_number, name, address, city, state, zip,
      region, district, size_category, demographic_profile,
      lat, lng, timezone, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  stmt.run(
    id,
    data.storeNumber,
    data.name,
    data.address || null,
    data.city || null,
    data.state || null,
    data.zip || null,
    data.region || null,
    data.district || null,
    data.sizeCategory || null,
    data.demographicProfile ? JSON.stringify(data.demographicProfile) : null,
    data.lat || null,
    data.lng || null,
    data.timezone || 'America/New_York',
    created_at,
    updated_at
  );

  return {
    id,
    store_number: data.storeNumber,
    name: data.name,
    address: data.address,
    city: data.city,
    state: data.state,
    zip: data.zip,
    region: data.region,
    district: data.district,
    size_category: data.sizeCategory,
    demographic_profile: data.demographicProfile ? JSON.stringify(data.demographicProfile) : undefined,
    lat: data.lat,
    lng: data.lng,
    timezone: data.timezone || 'America/New_York',
    is_active: 1,
    created_at,
    updated_at,
  };
}

/**
 * Get store by ID
 */
export function getRetailStoreById(id: string): RetailStore | null {
  ensureRetailModuleEnabled();

  const db = getDatabase();
  const stmt = db.prepare("SELECT * FROM retail_stores WHERE id = ?");
  return stmt.get(id) as RetailStore | null;
}

/**
 * Get store by store number
 */
export function getRetailStoreByNumber(storeNumber: string): RetailStore | null {
  ensureRetailModuleEnabled();

  const db = getDatabase();
  const stmt = db.prepare("SELECT * FROM retail_stores WHERE store_number = ?");
  return stmt.get(storeNumber) as RetailStore | null;
}

/**
 * Get all stores with pagination, search, and filtering
 * OPTIMIZED FOR UNLIMITED STORES
 */
export function getRetailStores(options: StoreQueryOptions = {}): PaginatedStores {
  ensureRetailModuleEnabled();

  const db = getDatabase();
  const {
    page = 1,
    pageSize = 50, // Default 50 stores per page
    search = '',
    region,
    state,
    isActive,
    sortBy = 'store_number',
    sortOrder = 'ASC',
  } = options;

  const offset = (page - 1) * pageSize;

  // Build WHERE clause dynamically
  const whereClauses: string[] = [];
  const params: any[] = [];

  if (search) {
    whereClauses.push(`(
      store_number LIKE ? OR
      name LIKE ? OR
      city LIKE ? OR
      address LIKE ?
    )`);
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  if (region) {
    whereClauses.push('region = ?');
    params.push(region);
  }

  if (state) {
    whereClauses.push('state = ?');
    params.push(state);
  }

  if (isActive !== undefined) {
    whereClauses.push('is_active = ?');
    params.push(isActive ? 1 : 0);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Get total count (for pagination)
  const countStmt = db.prepare(`
    SELECT COUNT(*) as count FROM retail_stores ${whereClause}
  `);
  const { count: total } = countStmt.get(...params) as { count: number };

  // Get paginated stores with stats
  const storesStmt = db.prepare(`
    SELECT
      s.*,
      COUNT(DISTINCT d.id) as total_campaigns,
      COUNT(DISTINCT dr.recipient_id) as total_recipients,
      COALESCE(agg.conversions_count, 0) as total_conversions,
      COALESCE(agg.conversion_rate, 0) as conversion_rate
    FROM retail_stores s
    LEFT JOIN retail_campaign_deployments d ON s.id = d.store_id
    LEFT JOIN retail_deployment_recipients dr ON d.id = dr.deployment_id
    LEFT JOIN (
      SELECT
        store_id,
        SUM(conversions_count) as conversions_count,
        AVG(conversion_rate) as conversion_rate
      FROM retail_store_performance_aggregates
      WHERE time_period = 'all_time'
      GROUP BY store_id
    ) agg ON s.id = agg.store_id
    ${whereClause}
    GROUP BY s.id
    ORDER BY s.${sortBy} ${sortOrder}
    LIMIT ? OFFSET ?
  `);

  const stores = storesStmt.all(...params, pageSize, offset) as StoreWithStats[];

  return {
    stores,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Update retail store
 */
export function updateRetailStore(
  id: string,
  data: Partial<Omit<RetailStore, 'id' | 'created_at' | 'updated_at'>>
): boolean {
  ensureRetailModuleEnabled();

  const db = getDatabase();
  const updated_at = new Date().toISOString();

  const updates: string[] = [];
  const params: any[] = [];

  if (data.store_number !== undefined) {
    updates.push('store_number = ?');
    params.push(data.store_number);
  }
  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name);
  }
  if (data.address !== undefined) {
    updates.push('address = ?');
    params.push(data.address);
  }
  if (data.city !== undefined) {
    updates.push('city = ?');
    params.push(data.city);
  }
  if (data.state !== undefined) {
    updates.push('state = ?');
    params.push(data.state);
  }
  if (data.zip !== undefined) {
    updates.push('zip = ?');
    params.push(data.zip);
  }
  if (data.region !== undefined) {
    updates.push('region = ?');
    params.push(data.region);
  }
  if (data.district !== undefined) {
    updates.push('district = ?');
    params.push(data.district);
  }
  if (data.size_category !== undefined) {
    updates.push('size_category = ?');
    params.push(data.size_category);
  }
  if (data.demographic_profile !== undefined) {
    updates.push('demographic_profile = ?');
    params.push(data.demographic_profile);
  }
  if (data.lat !== undefined) {
    updates.push('lat = ?');
    params.push(data.lat);
  }
  if (data.lng !== undefined) {
    updates.push('lng = ?');
    params.push(data.lng);
  }
  if (data.timezone !== undefined) {
    updates.push('timezone = ?');
    params.push(data.timezone);
  }
  if (data.is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(data.is_active);
  }

  if (updates.length === 0) return false;

  updates.push('updated_at = ?');
  params.push(updated_at, id);

  const stmt = db.prepare(`
    UPDATE retail_stores
    SET ${updates.join(', ')}
    WHERE id = ?
  `);

  const result = stmt.run(...params);
  return result.changes > 0;
}

/**
 * Delete retail store
 */
export function deleteRetailStore(id: string): boolean {
  ensureRetailModuleEnabled();

  const db = getDatabase();

  // Cascade deletion will handle related records (deployments, etc.)
  const stmt = db.prepare("DELETE FROM retail_stores WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Bulk create stores from CSV import
 * OPTIMIZED FOR LARGE IMPORTS (thousands of stores)
 */
export function bulkCreateRetailStores(
  stores: Array<{
    storeNumber: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    region?: string;
    district?: string;
    sizeCategory?: string;
    demographicProfile?: object;
    lat?: number;
    lng?: number;
    timezone?: string;
  }>
): { created: number; errors: Array<{ row: number; error: string }> } {
  ensureRetailModuleEnabled();

  const db = getDatabase();
  let created = 0;
  const errors: Array<{ row: number; error: string }> = [];

  // Use transaction for bulk insert (much faster)
  const insert = db.transaction((stores) => {
    const stmt = db.prepare(`
      INSERT INTO retail_stores (
        id, store_number, name, address, city, state, zip,
        region, district, size_category, demographic_profile,
        lat, lng, timezone, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    for (let i = 0; i < stores.length; i++) {
      const store = stores[i];
      try {
        const id = nanoid(16);
        const timestamp = new Date().toISOString();

        stmt.run(
          id,
          store.storeNumber,
          store.name,
          store.address || null,
          store.city || null,
          store.state || null,
          store.zip || null,
          store.region || null,
          store.district || null,
          store.sizeCategory || null,
          store.demographicProfile ? JSON.stringify(store.demographicProfile) : null,
          store.lat || null,
          store.lng || null,
          store.timezone || 'America/New_York',
          timestamp,
          timestamp
        );
        created++;
      } catch (error: any) {
        errors.push({
          row: i + 1,
          error: error.message || 'Unknown error',
        });
      }
    }
  });

  insert(stores);

  return { created, errors };
}

/**
 * Get unique regions (for filtering)
 */
export function getRetailRegions(): string[] {
  ensureRetailModuleEnabled();

  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT DISTINCT region
    FROM retail_stores
    WHERE region IS NOT NULL
    ORDER BY region ASC
  `);

  const results = stmt.all() as Array<{ region: string }>;
  return results.map(r => r.region);
}

/**
 * Get unique states (for filtering)
 */
export function getRetailStates(): string[] {
  ensureRetailModuleEnabled();

  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT DISTINCT state
    FROM retail_stores
    WHERE state IS NOT NULL
    ORDER BY state ASC
  `);

  const results = stmt.all() as Array<{ state: string }>;
  return results.map(s => s.state);
}

/**
 * Get store count
 */
export function getRetailStoreCount(): number {
  ensureRetailModuleEnabled();

  const db = getDatabase();
  const stmt = db.prepare("SELECT COUNT(*) as count FROM retail_stores WHERE is_active = 1");
  const result = stmt.get() as { count: number };
  return result.count;
}
