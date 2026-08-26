import { db } from '@/lib/db';
import { referralSources } from '@/lib/db/schema/referralSources';
import { medicalConditions } from '@/lib/db/schema/medicalConditions';
import { appointmentCategories } from '@/lib/db/schema/appointmentCategories';
import { patientGroups } from '@/lib/db/schema/patientGroups';
import { labs } from '@/lib/db/schema/labs';
import { surgeryTypes } from '@/lib/db/schema/surgeryTypes';
import { sundayTasks } from '@/lib/db/schema/sundayTasks';
import { defaultAppointmentCategories } from './appointmentCategories';
import { defaultReferralSources } from './referralSources';
import { defaultMedicalConditions } from './medicalConditions';
import { defaultPatientGroups } from './patientGroups';
import { defaultLabs } from './labs';
import { defaultSurgeryTypes } from './surgeryTypes';
import { defaultSundayTasks } from './sundayTasks';
import { inventoryCategories } from './inventoryCategories';
import { defaultProcedures } from './procedures';
import { proceduresCatalog } from '@/lib/db/schema/proceduresCatalog';
import { defaultLabWorkTypes } from './labWorkTypes';
import { labWorkTypes } from '@/lib/db/schema/labWorkTypes';
import { defaultLabStageTemplates } from './labStageTemplates';
import { labStageTemplates } from '@/lib/db/schema/labStageTemplates';
import { defaultLabShades } from './labShades';
import { labShades } from '@/lib/db/schema/labShades';
import { sql, isNull } from 'drizzle-orm';

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

export async function seedSurgeryTypes() {
  for (const st of defaultSurgeryTypes) {
    await db
      .insert(surgeryTypes)
      .values({ id: st.id, name: st.name, isActive: true })
      .onConflictDoNothing();
  }
  return defaultSurgeryTypes.length;
}

export async function seedSundayTasks(createdBy = 'system') {
  for (const task of defaultSundayTasks) {
    await db
      .insert(sundayTasks)
      .values({
        id: task.id,
        name: task.name,
        amount: task.amount,
        isActive: true,
        description: task.description,
        createdBy,
      })
      .onConflictDoNothing();
  }
  return defaultSundayTasks.length;
}

export async function seedInventoryCategories() {
  for (const cat of inventoryCategories) {
    await db.execute(
      sql`INSERT INTO inventory_categories (id, name, unit, is_active)
          VALUES (${slugify(cat.name)}, ${cat.name}, ${cat.unit}, true)
          ON CONFLICT (id) DO NOTHING`
    );
  }
  return inventoryCategories.length;
}

export async function seedProceduresCatalog() {
  await db.delete(proceduresCatalog).where(isNull(proceduresCatalog.clinicId));
  const usedIds = new Set<string>();
  let seeded = 0;
  for (const proc of defaultProcedures) {
    let id = slugify(proc.name);
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${slugify(proc.name)}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);
    await db
      .insert(proceduresCatalog)
      .values({
        id,
        name: proc.name,
        defaultCost: String(proc.defaultCost),
        isActive: true,
        clinicId: null,
      })
      .onConflictDoNothing();
    seeded += 1;
  }
  return seeded;
}

export async function seedLabWorkTypes() {
  let seeded = 0;
  for (const name of defaultLabWorkTypes) {
    const id = `wt_${slugify(name)}`;
    await db
      .insert(labWorkTypes)
      .values({ id, name, isActive: true })
      .onConflictDoNothing();
    seeded += 1;
  }
  return seeded;
}

export async function seedLabStageTemplates() {
  let seeded = 0;
  for (const tpl of defaultLabStageTemplates) {
    const id = `st_${slugify(tpl.name)}`;
    await db
      .insert(labStageTemplates)
      .values({ id, name: tpl.name, description: tpl.description, isActive: true })
      .onConflictDoNothing();
    seeded += 1;
  }
  return seeded;
}

export async function seedLabShades() {
  let seeded = 0;
  for (const shade of defaultLabShades) {
    const id = `shade_${slugify(shade.name)}`;
    await db
      .insert(labShades)
      .values({ id, name: shade.name, hexColor: shade.hexColor, isActive: true })
      .onConflictDoNothing();
    seeded += 1;
  }
  return seeded;
}

export async function seedAllData(clinicId: string, createdBy = 'system') {
  const [
    referrals,
    conditions,
    categories,
    groups,
    labCount,
    surgeryCount,
    taskCount,
    invCategories,
    procedures,
    workTypes,
    stageTemplates,
    shades,
  ] = await Promise.all([
    seedReferralSources(),
    seedMedicalConditions(),
    seedAppointmentCategories(clinicId),
    seedPatientGroups(clinicId, createdBy),
    seedLabs(createdBy),
    seedSurgeryTypes(),
    seedSundayTasks(),
    seedInventoryCategories(),
    seedProceduresCatalog(),
    seedLabWorkTypes(),
    seedLabStageTemplates(),
    seedLabShades(),
  ]);

  return {
    referrals,
    conditions,
    categories,
    groups,
    labs: labCount,
    surgeryTypes: surgeryCount,
    sundayTasks: taskCount,
    inventoryCategories: invCategories,
    procedures,
    workTypes,
    stageTemplates,
    shades,
  };
}