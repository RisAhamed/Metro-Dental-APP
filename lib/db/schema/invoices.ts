import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, numeric, jsonb, pgEnum } from 'drizzle-orm/pg-core';

export const invoicePaymentStatusEnum = pgEnum('invoice_payment_status', ['UNPAID', 'PARTIALLY_PAID', 'PAID']);

export const invoices = table('invoices', {
  invoiceId: text('invoice_id').primaryKey().notNull(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  patientId: text('patient_id').notNull(),
  patientName: text('patient_name').notNull(),
  clinicId: text('clinic_id').notNull(),
  planId: text('plan_id'),
  visitId: text('visit_id'),
  invoiceDate: timestamp('invoice_date', { withTimezone: true }).defaultNow().notNull(),
  procedures: jsonb('procedures').$type<Array<{
    procedureId: string;
    procedureName: string;
    qty: number;
    unitCost: number;
    discount: number;
    total: number;
    toothNumbers?: number[] | null;
    notes?: string | null;
  }>>().notNull(),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).default('0').notNull(),
  totalDiscount: numeric('total_discount', { precision: 12, scale: 2 }).default('0').notNull(),
  grandTotal: numeric('grand_total', { precision: 12, scale: 2 }).default('0').notNull(),
  amountPaid: numeric('amount_paid', { precision: 12, scale: 2 }).default('0').notNull(),
  paymentStatus: invoicePaymentStatusEnum('payment_status').default('UNPAID').notNull(),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
