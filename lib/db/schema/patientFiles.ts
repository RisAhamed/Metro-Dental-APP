import { cockroachTable as table } from './cockroachTable';
import { text, timestamp } from 'drizzle-orm/pg-core';

export const patientFiles = table('patient_files', {
  fileId: text('file_id').primaryKey().notNull(),
  patientId: text('patient_id').notNull(),
  clinicId: text('clinic_id').notNull(),
  fileName: text('file_name').notNull(),
  r2Key: text('r2_key').notNull(),
  fileType: text('file_type'),
  fileSize: text('file_size'),
  notes: text('notes'),
  visitId: text('visit_id'), // optional association with a session
  uploadedBy: text('uploaded_by').notNull(),
  uploadedByName: text('uploaded_by_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type PatientFileRecord = typeof patientFiles.$inferSelect;
export type NewPatientFile = typeof patientFiles.$inferInsert;
