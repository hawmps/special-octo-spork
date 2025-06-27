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

// Seeding tracking table
const createSeedingTable = `
  CREATE TABLE IF NOT EXISTS seeding (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

// Get seed files
function getSeedFiles() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Migrations directory not found:', migrationsDir);
    process.exit(1);
  }

  // Look for seed files (sample data files)
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.includes('sample') || file.includes('seed') || file.includes('data'))
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  return files.map(file => ({
    filename: file,
    path: path.join(migrationsDir, file)
  }));
}

// Check if seed has been executed
async function isSeedExecuted(client, filename) {
  const result = await client.query(
    'SELECT 1 FROM seeding WHERE filename = $1',
    [filename]
  );
  return result.rows.length > 0;
}

// Mark seed as executed
async function markSeedExecuted(client, filename) {
  await client.query(
    'INSERT INTO seeding (filename) VALUES ($1)',
    [filename]
  );
}

// Execute a single seed file
async function executeSeed(client, seed) {
  console.log(`🌱 Executing seed: ${seed.filename}`);
  
  try {
    const sql = fs.readFileSync(seed.path, 'utf8');
    await client.query(sql);
    await markSeedExecuted(client, seed.filename);
    console.log(`✅ Seed ${seed.filename} executed successfully`);
  } catch (error) {
    console.error(`❌ Error executing seed ${seed.filename}:`, error.message);
    throw error;
  }
}

// Check if tables exist and have data
async function checkTablesExist(client) {
  try {
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`📊 Found ${result.rows.length} tables in database`);
    
    if (result.rows.length > 0) {
      console.log('📋 Tables:', result.rows.map(row => row.table_name).join(', '));
    }
    
    return result.rows.length > 0;
  } catch (error) {
    console.log('⚠️  Could not check existing tables (this is normal for first run)');
    return false;
  }
}

// Main seeding function
async function runSeeds() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting database seeding...');
    
    // Check if database tables exist
    const tablesExist = await checkTablesExist(client);
    if (!tablesExist) {
      console.log('⚠️  No tables found. Please run migrations first.');
      console.log('   Run: npm run migrate');
      return;
    }
    
    // Create seeding tracking table
    await client.query(createSeedingTable);
    console.log('📋 Seeding tracking table ready');
    
    // Get all seed files
    const seeds = getSeedFiles();
    console.log(`📁 Found ${seeds.length} seed files`);
    
    if (seeds.length === 0) {
      console.log('✅ No seed files to run');
      return;
    }
    
    // Execute seeds in order
    let executedCount = 0;
    for (const seed of seeds) {
      const alreadyExecuted = await isSeedExecuted(client, seed.filename);
      
      if (alreadyExecuted) {
        console.log(`⏭️  Skipping ${seed.filename} (already executed)`);
        continue;
      }
      
      await executeSeed(client, seed);
      executedCount++;
    }
    
    if (executedCount === 0) {
      console.log('✅ All seeds are up to date');
    } else {
      console.log(`✅ Successfully executed ${executedCount} seed files`);
    }
    
    // Show summary of data
    try {
      const accountsResult = await client.query('SELECT COUNT(*) FROM accounts');
      const workOrdersResult = await client.query('SELECT COUNT(*) FROM work_orders');
      
      console.log('\n📊 Database Summary:');
      console.log(`   Accounts: ${accountsResult.rows[0].count}`);
      console.log(`   Work Orders: ${workOrdersResult.rows[0].count}`);
    } catch (error) {
      // Ignore summary errors
    }
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Seeding interrupted');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Seeding terminated');
  await pool.end();
  process.exit(0);
});

// Run seeding
if (require.main === module) {
  runSeeds()
    .then(() => {
      console.log('🎉 Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding process failed:', error);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

module.exports = { runSeeds };