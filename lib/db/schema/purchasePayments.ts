import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, numeric } from 'drizzle-orm/pg-core';

export const purchasePayments = table('purchase_payments', {
  paymentId: text('payment_id').primaryKey().notNull(),
  purchaseId: text('purchase_id').notNull(),
  vendorId: text('vendor_id').notNull(),
  clinicId: text('clinic_id').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  paymentDate: timestamp('payment_date', { withTimezone: true }).defaultNow().notNull(),
  mode: text('mode'),
  reference: text('reference'),
  notes: text('notes'),
  recordedBy: text('recorded_by').notNull(),
  recordedByName: text('recorded_by_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type PurchasePayment = typeof purchasePayments.$inferSelect;
export type NewPurchasePayment = typeof purchasePayments.$inferInsert;
