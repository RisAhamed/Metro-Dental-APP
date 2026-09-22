import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, numeric, jsonb } from 'drizzle-orm/pg-core';

export interface PurchaseLineItem {
  itemId: string;
  itemName: string;
  category: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export const purchases = table('purchases', {
  purchaseId: text('purchase_id').primaryKey().notNull(),
  purchaseNumber: text('purchase_number').notNull(),
  vendorId: text('vendor_id').notNull(),
  vendorName: text('vendor_name').notNull(),
  clinicId: text('clinic_id').notNull(),
  purchaseDate: timestamp('purchase_date', { withTimezone: true }).defaultNow().notNull(),
  invoiceNumber: text('invoice_number'),
  invoiceFileId: text('invoice_file_id'),
  lineItems: jsonb('line_items').$type<Array<PurchaseLineItem>>().default([]),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).default('0'),
  amountPaid: numeric('amount_paid', { precision: 12, scale: 2 }).default('0'),
  balanceDue: numeric('balance_due', { precision: 12, scale: 2 }).default('0'),
  paymentStatus: text('payment_status')
    .$type<'UNPAID' | 'PARTIALLY_PAID' | 'PAID'>()
    .default('UNPAID'),
  notes: text('notes'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Purchase = typeof purchases.$inferSelect;
export type NewPurchase = typeof purchases.$inferInsert;
