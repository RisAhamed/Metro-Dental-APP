import { db } from '@/lib/db';
import { referralSources } from '@/lib/db/schema/referralSources';
import { medicalConditions } from '@/lib/db/schema/medicalConditions';
import { appointmentCategories } from '@/lib/db/schema/appointmentCategories';
import { patientGroups } from '@/lib/db/schema/patientGroups';
import { labs } from '@/lib/db/schema/labs';
import { defaultAppointmentCategories } from './appointmentCategories';
import { defaultReferralSources } from './referralSources';
import { defaultMedicalConditions } from './medicalConditions';
import { defaultPatientGroups } from './patientGroups';
import { defaultLabs } from './labs';
import { sql } from 'drizzle-orm';

export const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '-');

export async function seedReferralSources() {
  for (const name of defaultReferralSources) {
    await db
      .insert(referralSources)
      .values({ id: slugify(name), name, isActive: true })
      .onConflictDoNothing();
  }
  return defaultReferralSources.length;
}

export async function seedMedicalConditions() {
  for (const name of defaultMedicalConditions) {
    await db
      .insert(medicalConditions)
      .values({ id: slugify(name), name, isActive: true })
      .onConflictDoNothing();
  }
  return defaultMedicalConditions.length;
}

export async function seedAppointmentCategories(clinicId?: string) {
  for (const cat of defaultAppointmentCategories) {
    await db
      .insert(appointmentCategories)
      .values({
        id: slugify(cat.name),
        name: cat.name.toUpperCase(),
        color: cat.color,
        clinicId: clinicId || null,
        isActive: true,
      })
      .onConflictDoNothing();
  }
  return defaultAppointmentCategories.length;
}

export async function seedPatientGroups(clinicId: string, createdBy = 'system') {
  for (const name of defaultPatientGroups) {
    await db
      .insert(patientGroups)
      .values({
        id: slugify(name),
        name,
        clinicId,
        patientCount: 0,
        createdBy,
      })
      .onConflictDoNothing();
  }
  return defaultPatientGroups.length;
}

export async function seedLabs(createdBy = 'system') {
  let seeded = 0;
  for (const lab of defaultLabs) {
    const counterResult = await db.execute(
      sql`INSERT INTO counters (key, value) VALUES ('labs', 1)
          ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
          RETURNING value`
    );
    const next = Number(counterResult[0]?.value ?? 1);
    const labId = `LAB-${String(next).padStart(4, '0')}`;

    const existing = await db
      .select({ labId: labs.labId })
      .from(labs)
      .where(sql`${labs.name} = ${lab.name}`)
      .limit(1);

    if (existing.length > 0) continue;

    await db.insert(labs).values({
      labId,
      name: lab.name,
      contactPerson: lab.contactPerson,
      phone: lab.phone,
      isActive: true,
      createdBy,
    });
    seeded += 1;
  }
  return seeded;
}

export async function seedAllData(clinicId: string, createdBy = 'system') {
  const [referrals, conditions, categories, groups, labCount] = await Promise.all([
    seedReferralSources(),
    seedMedicalConditions(),
    seedAppointmentCategories(clinicId),
    seedPatientGroups(clinicId, createdBy),
    seedLabs(createdBy),
  ]);

  return { referrals, conditions, categories, groups, labs: labCount };
}