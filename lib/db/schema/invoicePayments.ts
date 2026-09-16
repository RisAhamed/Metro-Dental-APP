import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, numeric } from 'drizzle-orm/pg-core';

export const invoicePayments = table('invoice_payments', {
  paymentId: text('payment_id').primaryKey().notNull(),
  invoiceId: text('invoice_id').notNull(),
  patientId: text('patient_id').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  date: timestamp('date', { withTimezone: true }).defaultNow().notNull(),
  recordedBy: text('recorded_by').notNull(),
  recordedByName: text('recorded_by_name').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type InvoicePayment = typeof invoicePayments.$inferSelect;
export type NewInvoicePayment = typeof invoicePayments.$inferInsert;