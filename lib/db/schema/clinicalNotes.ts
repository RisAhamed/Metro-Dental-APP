import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const clinicalNotes = table('clinical_notes', {
  noteId: text('note_id').primaryKey().notNull(),
  patientId: text('patient_id').notNull(),
  clinicId: text('clinic_id').notNull(),
  doctorId: text('doctor_id').notNull(),
  doctorName: text('doctor_name').notNull(),
  date: timestamp('date', { withTimezone: true }).defaultNow().notNull(),
  chiefComplaints: jsonb('chief_complaints').$type<string[]>().default([]),
  observations: jsonb('observations').$type<string[]>().default([]),
  diagnoses: jsonb('diagnoses').$type<string[]>().default([]),
  investigations: jsonb('investigations').$type<string[]>().default([]),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: text('created_by').notNull(),
});

export type ClinicalNote = typeof clinicalNotes.$inferSelect;
export type NewClinicalNote = typeof clinicalNotes.$inferInsert;
