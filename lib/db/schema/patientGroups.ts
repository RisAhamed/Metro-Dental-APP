import { cockroachTable as table } from './cockroachTable';
import { text, integer, timestamp } from 'drizzle-orm/pg-core';

export const patientGroups = table('patient_groups', {
  id: text('id').primaryKey().notNull(), // slug: "wisdom-tooth"
  name: text('name').notNull().unique(), // "WISDOM TOOTH EXTRACTION"
  clinicId: text('clinic_id').notNull(),
  patientCount: integer('patient_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: text('created_by').notNull(),
});

export type PatientGroup = typeof patientGroups.$inferSelect;
export type NewPatientGroup = typeof patientGroups.$inferInsert;
