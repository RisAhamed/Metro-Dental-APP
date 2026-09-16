import postgres from 'postgres';
import { loadEnvFile } from 'node:process';

loadEnvFile('.env.local');

const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });

async function migrate() {
  console.log('Adding tags column to patient_files table...');
  
  await sql.unsafe(`
    ALTER TABLE patient_files 
    ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
  `);
  
  console.log('Migration complete!');
  await sql.end();
}

migrate().catch(console.error);