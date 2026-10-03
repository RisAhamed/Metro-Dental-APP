import postgres from 'postgres';

(async () => {
  const sql = postgres(process.env.DATABASE_URL as string, { connect_timeout: 20 });

  console.log('=== STEP 1: clinics upsert ===');
  const clinics = await sql.unsafe(
    `INSERT INTO clinics (clinic_id, name, is_active, created_at)
     VALUES
     ('clinic_a', 'Kodambakkam', true, NOW()),
     ('clinic_b', 'Mylapore', true, NOW())
     ON CONFLICT (clinic_id) DO UPDATE
     SET name = EXCLUDED.name,
     is_active = true
     RETURNING clinic_id, name, is_active`
  );
  for (const r of clinics) console.log(` - ${r.clinic_id} | ${r.name} | is_active=${r.is_active}`);

  console.log('=== STEP 2: clinic_settings insert ===');
  const settings = await sql.unsafe(
    `INSERT INTO clinic_settings (clinic_id)
     VALUES ('clinic_a'), ('clinic_b')
     ON CONFLICT (clinic_id) DO NOTHING
     RETURNING clinic_id`
  );
  console.log('rows inserted:', settings.length, '(0 = already existed, DO NOTHING)');

  console.log('=== STEP 3: verify ===');
  console.log('--- Query 1: SELECT clinic_id, name FROM clinics ORDER BY clinic_id;');
  const q1 = await sql.unsafe('SELECT clinic_id, name FROM clinics ORDER BY clinic_id');
  console.log('clinic_id | name');
  console.log('----------+-------------');
  for (const r of q1) console.log(`${r.clinic_id} | ${r.name}`);

  console.log('--- Query 2: SELECT clinic_id FROM clinic_settings ORDER BY clinic_id;');
  const q2 = await sql.unsafe('SELECT clinic_id FROM clinic_settings ORDER BY clinic_id');
  console.log('clinic_id');
  console.log('---------');
  for (const r of q2) console.log(r.clinic_id);

  console.log(`--- counts: clinics=${q1.length}, clinic_settings=${q2.length}`);

  await sql.end();
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
