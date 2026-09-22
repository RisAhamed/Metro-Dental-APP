import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
async function migrate() {
  await sql.unsafe(`ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS balance_due TEXT;`);
  await sql.unsafe(`ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'UNPAID';`);
  // Backfill from lab_billing
  await sql.unsafe(`
    UPDATE lab_orders lo SET
      total_amount = COALESCE((SELECT total_cost::TEXT FROM lab_billing lb WHERE lb.order_id = lo.order_id), lo.total_amount),
      amount_paid = COALESCE((SELECT amount_paid::TEXT FROM lab_billing lb WHERE lb.order_id = lo.order_id), lo.amount_paid),
      payment_status = COALESCE((SELECT payment_status FROM lab_billing lb WHERE lb.order_id = lo.order_id), 'UNPAID')
    WHERE TRUE;
  `);
  await sql.unsafe(`
    UPDATE lab_orders SET balance_due = (COALESCE(NULLIF(total_amount,'')::NUMERIC,0) - COALESCE(NULLIF(amount_paid,'')::NUMERIC,0))::TEXT WHERE TRUE;
  `);
  console.log('Lab orders financial migration complete');
  await sql.end();
}
migrate().catch((e) => { console.error(e); process.exit(1); });
