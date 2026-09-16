import postgres from 'postgres';
import { loadEnvFile } from 'node:process';

loadEnvFile('.env.local');

const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });

async function migrate() {
  console.log('Creating file_tags table...');
  
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS file_tags (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      clinic_id TEXT,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `);
  
  console.log('Migration complete!');
  await sql.end();
}

migrate().catch(console.error);