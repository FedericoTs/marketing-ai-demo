/**
 * Initialize Planning Workspace Database Tables
 * Run this once to create the planning workspace tables
 *
 * Usage: node scripts/init-planning-db.js
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database path
const DB_PATH = path.join(__dirname, '..', 'dm-tracking.db');

console.log('🔄 Initializing Planning Workspace database...');
console.log('📁 Database path:', DB_PATH);

// Check if database exists
if (!fs.existsSync(DB_PATH)) {
  console.log('⚠️  Database file does not exist. It will be created.');
}

// Open database
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

console.log('✅ Database opened successfully');

// Read SQL schema
const schemaPath = path.join(__dirname, '..', 'lib', 'database', 'schema', 'planning-workspace-schema.sql');
console.log('📄 Reading schema from:', schemaPath);

const schema = fs.readFileSync(schemaPath, 'utf8');

// Execute schema (split by statement to handle properly)
console.log('🔄 Creating tables...');

try {
  // Execute the schema
  db.exec(schema);

  console.log('✅ Planning Workspace tables created successfully!');

  // Verify tables were created
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name LIKE 'plan%' OR name LIKE 'campaign_plans'
    ORDER BY name
  `).all();

  console.log('\n📊 Created tables:');
  tables.forEach(table => {
    console.log(`   ✓ ${table.name}`);
  });

  // Verify views were created
  const views = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='view' AND name LIKE 'plan%'
    ORDER BY name
  `).all();

  console.log('\n👁️  Created views:');
  views.forEach(view => {
    console.log(`   ✓ ${view.name}`);
  });

  console.log('\n✨ Planning Workspace database initialized successfully!');
  console.log('🚀 You can now start the dev server and use the Planning Workspace');

} catch (error) {
  console.error('❌ Error creating tables:', error.message);
  process.exit(1);
} finally {
  db.close();
}
