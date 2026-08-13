import { db } from './index';
import { referralSources } from './schema/referralSources';
import { medicalConditions } from './schema/medicalConditions';

const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '-');

const DEFAULT_REFERRAL_SOURCES = [
  'Another Patient',
  'Google',
  'Just Dial',
  'Social Media',
  'Friend',
  'Family',
  'Doctor Referral',
  'Medical Camp',
];

const DEFAULT_MEDICAL_CONDITIONS = [
  'Hypertension',
  'Diabetes',
  'Asthma',
  'Epilepsy',
  'Heart Disease',
  'Allergies',
  'Gastric Ulcers',
  'Undergone Dental Treatment Earlier',
  'Bleeding Disorders',
  'Anemia',
  'Psychiatric Problems',
  'Thyroid',
];

async function seedReferralSources() {
  for (const name of DEFAULT_REFERRAL_SOURCES) {
    await db
      .insert(referralSources)
      .values({ id: slugify(name), name, isActive: true })
      .onConflictDoNothing();
  }
  console.log(`Seeded ${DEFAULT_REFERRAL_SOURCES.length} referral sources`);
}

async function seedMedicalConditions() {
  for (const name of DEFAULT_MEDICAL_CONDITIONS) {
    await db
      .insert(medicalConditions)
      .values({ id: slugify(name), name, isActive: true })
      .onConflictDoNothing();
  }
  console.log(`Seeded ${DEFAULT_MEDICAL_CONDITIONS.length} medical conditions`);
}

async function main() {
  await seedReferralSources();
  await seedMedicalConditions();
  console.log('Seed complete');
  process.exit(0);
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
