import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, numeric, pgEnum } from 'drizzle-orm/pg-core';

export const paymentModeEnum = pgEnum('payment_mode', [
  'CASH',
  'GPAY',
  'PAYTM',
  'DEBIT_CARD',
  'CREDIT_CARD',
  'OTHER',
]);

export const patientPayments = table('patient_payments', {
  paymentId: text('payment_id').primaryKey().notNull(),
  patientId: text('patient_id').notNull(),
  patientName: text('patient_name').notNull(),
  clinicId: text('clinic_id').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  mode: paymentModeEnum('mode').notNull(),
  date: timestamp('date', { withTimezone: true }).notNull(),
  visitId: text('visit_id'),
  notes: text('notes'),
  recordedBy: text('recorded_by').notNull(),
  recordedByName: text('recorded_by_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type PatientPayment = typeof patientPayments.$inferSelect;
export type NewPatientPayment = typeof patientPayments.$inferInsert;
