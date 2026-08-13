import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, integer } from 'drizzle-orm/pg-core';

export const tokens = table('tokens', {
  tokenId: text('token_id').primaryKey().notNull(), // T-001
  clinicId: text('clinic_id').notNull(),
  dateString: text('date_string').notNull(), // 2025-08-11
  tokenNumber: integer('token_number').notNull(),
  patientId: text('patient_id'),
  patientName: text('patient_name'),
  appointmentId: text('appointment_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Token = typeof tokens.$inferSelect;
export type NewToken = typeof tokens.$inferInsert;