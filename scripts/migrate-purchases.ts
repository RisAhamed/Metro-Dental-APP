import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });

async function migrate() {
  console.log('Creating purchases tables...');
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS purchases (
      purchase_id TEXT PRIMARY KEY NOT NULL,
      purchase_number TEXT NOT NULL,
      vendor_id TEXT NOT NULL,
      vendor_name TEXT NOT NULL,
      clinic_id TEXT NOT NULL,
      purchase_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      invoice_number TEXT,
      invoice_file_id TEXT,
      line_items JSONB DEFAULT '[]',
      total_amount NUMERIC(12,2) DEFAULT '0',
      amount_paid NUMERIC(12,2) DEFAULT '0',
      balance_due NUMERIC(12,2) DEFAULT '0',
      payment_status TEXT DEFAULT 'UNPAID',
      notes TEXT,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `);
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS purchase_payments (
      payment_id TEXT PRIMARY KEY NOT NULL,
      purchase_id TEXT NOT NULL,
      vendor_id TEXT NOT NULL,
      clinic_id TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      payment_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      mode TEXT,
      reference TEXT,
      notes TEXT,
      recorded_by TEXT NOT NULL,
      recorded_by_name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `);
  await sql.unsafe(`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS purchase_id TEXT;`);
  await sql.unsafe(`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS last_purchase_price NUMERIC(10,2);`);
  await sql.unsafe(`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS last_purchase_date TIMESTAMPTZ;`);
  console.log('Migration complete!');
  await sql.end();
}

migrate().catch((e) => { console.error(e); process.exit(1); });
