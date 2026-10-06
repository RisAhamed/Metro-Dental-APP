// One-off script: seed the global procedures catalog.
// Usage: npx tsx --env-file=.env.local scripts/seed-procedures.ts
// Reuses seedProceduresCatalog() from lib/seed/index (slugified ids,
// global clinicId=null rows, onConflictDoNothing). Idempotent.
import { seedProceduresCatalog } from '../lib/seed/index';
import { DEFAULT_PROCEDURES_COUNT } from '../lib/seed/procedures';

async function main() {
  console.log(`Seeding ${DEFAULT_PROCEDURES_COUNT} procedures (global catalog)...`);
  const inserted = await seedProceduresCatalog();
  console.log(`Done. Inserted/confirmed ${inserted} procedures.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
