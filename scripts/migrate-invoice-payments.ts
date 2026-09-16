import postgres from 'postgres';
import { loadEnvFile } from 'node:process';

loadEnvFile('.env.local');

const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });

async function migrate() {
  console.log('Creating invoice_payments table...');
  
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS invoice_payments (
      payment_id TEXT PRIMARY KEY NOT NULL,
      invoice_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      amount NUMERIC(10, 2) NOT NULL,
      date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      recorded_by TEXT NOT NULL,
      recorded_by_name TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `);
  
  console.log('Migration complete!');
  await sql.end();
}

migrate().catch(console.error);