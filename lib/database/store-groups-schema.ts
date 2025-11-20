import { getDatabase } from './connection';

/**
 * Initialize store groups tables
 * This allows users to save frequently-used store selections for reuse
 */
export function initStoreGroupsTables() {
  const db = createServiceClient();

  // Store groups table
  db.exec(`
    CREATE TABLE IF NOT EXISTS store_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      store_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Store group members table
  db.exec(`
    CREATE TABLE IF NOT EXISTS store_group_members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      store_id TEXT NOT NULL,
      added_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (group_id) REFERENCES store_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (store_id) REFERENCES retail_stores(id) ON DELETE CASCADE,
      UNIQUE(group_id, store_id)
    );
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_store_groups_name
      ON store_groups(name);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_store_group_members_group
      ON store_group_members(group_id);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_store_group_members_store
      ON store_group_members(store_id);
  `);

  console.log('✅ Store groups tables initialized');
}

// Run initialization if this file is executed directly
if (require.main === module) {
  initStoreGroupsTables();
  console.log('Store groups schema initialized successfully');
}
