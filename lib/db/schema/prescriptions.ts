import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const prescriptions = table('prescriptions', {
  prescriptionId: text('prescription_id').primaryKey().notNull(),
  patientId: text('patient_id').notNull(),
  patientName: text('patient_name').notNull(),
  clinicId: text('clinic_id').notNull(),
  date: timestamp('date', { withTimezone: true }).defaultNow().notNull(),
  doctorId: text('doctor_id'),
  doctorName: text('doctor_name'),
  drugs: jsonb('drugs').$type<
    Array<{
      drugName: string;
      dosage: string | null;
      frequency: string | null;
      duration: string | null;
      instructions: string | null;
    }>
  >().notNull(),
  notes: text('notes'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Prescription = typeof prescriptions.$inferSelect;
export type NewPrescription = typeof prescriptions.$inferInsert;
