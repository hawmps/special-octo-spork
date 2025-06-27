#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'fieldservicecrm',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'dev_password_123',
};

// Create database connection pool
const pool = new Pool(dbConfig);

// Migration tracking table
const createMigrationsTable = `
  CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

// Get migration files
function getMigrationFiles() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Migrations directory not found:', migrationsDir);
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  return files.map(file => ({
    filename: file,
    path: path.join(migrationsDir, file)
  }));
}

// Check if migration has been executed
async function isMigrationExecuted(client, filename) {
  const result = await client.query(
    'SELECT 1 FROM migrations WHERE filename = $1',
    [filename]
  );
  return result.rows.length > 0;
}

// Mark migration as executed
async function markMigrationExecuted(client, filename) {
  await client.query(
    'INSERT INTO migrations (filename) VALUES ($1)',
    [filename]
  );
}

// Execute a single migration file
async function executeMigration(client, migration) {
  console.log(`📄 Executing migration: ${migration.filename}`);
  
  try {
    const sql = fs.readFileSync(migration.path, 'utf8');
    await client.query(sql);
    await markMigrationExecuted(client, migration.filename);
    console.log(`✅ Migration ${migration.filename} executed successfully`);
  } catch (error) {
    console.error(`❌ Error executing migration ${migration.filename}:`, error.message);
    throw error;
  }
}

// Main migration function
async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting database migrations...');
    
    // Create migrations tracking table
    await client.query(createMigrationsTable);
    console.log('📋 Migration tracking table ready');
    
    // Get all migration files
    const migrations = getMigrationFiles();
    console.log(`📁 Found ${migrations.length} migration files`);
    
    if (migrations.length === 0) {
      console.log('✅ No migrations to run');
      return;
    }
    
    // Execute migrations in order
    let executedCount = 0;
    for (const migration of migrations) {
      const alreadyExecuted = await isMigrationExecuted(client, migration.filename);
      
      if (alreadyExecuted) {
        console.log(`⏭️  Skipping ${migration.filename} (already executed)`);
        continue;
      }
      
      await executeMigration(client, migration);
      executedCount++;
    }
    
    if (executedCount === 0) {
      console.log('✅ All migrations are up to date');
    } else {
      console.log(`✅ Successfully executed ${executedCount} migrations`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Migration interrupted');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Migration terminated');
  await pool.end();
  process.exit(0);
});

// Run migrations
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('🎉 Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration process failed:', error);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

module.exports = { runMigrations };