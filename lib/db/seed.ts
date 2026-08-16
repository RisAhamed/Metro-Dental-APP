import { seedAllData } from '@/lib/seed';

async function main() {
  const clinicId = process.env.SEED_CLINIC_ID || 'clinic_a';
  const result = await seedAllData(clinicId);
  console.log(
    `Seeded ${result.referrals} referral sources, ${result.conditions} medical conditions, ` +
      `${result.categories} appointment categories, ${result.groups} patient groups, ` +
      `${result.labs} labs, ${result.surgeryTypes} surgery types, ${result.sundayTasks} sunday tasks, ` +
      `${result.procedures} procedures`
  );
  console.log('Seed complete');
  process.exit(0);
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});