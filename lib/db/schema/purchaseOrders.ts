import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, numeric, jsonb, pgEnum } from 'drizzle-orm/pg-core';

export const poStatusEnum = pgEnum('po_status', [
  'PENDING',
  'PARTIALLY_DELIVERED',
  'DELIVERED',
  'CANCELLED',
]);

export interface POLineItem {
  itemId: string;
  itemName: string;
  category: string;
  unit: string;
  quantityOrdered: number;
  quantityDelivered: number;
  unitPrice: number;
  totalPrice: number;
}

export interface POReturn {
  returnId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  reason: string;
  amount: number;
  date: string;
}

export interface POPayment {
  paymentId: string;
  amount: number;
  date: string;
  method: string;
  recordedBy: string;
  notes: string | null;
}

export const purchaseOrders = table('purchase_orders', {
  orderId: text('order_id').primaryKey().notNull(),
  poNumber: text('po_number').notNull(),
  vendorId: text('vendor_id').notNull(),
  vendorName: text('vendor_name').notNull(),
  clinicId: text('clinic_id').notNull(),
  orderDate: timestamp('order_date', { withTimezone: true }).defaultNow().notNull(),
  expectedDeliveryDate: timestamp('expected_delivery_date', { withTimezone: true }),
  deliveredDate: timestamp('delivered_date', { withTimezone: true }),
  status: poStatusEnum('status').default('PENDING').notNull(),
  lineItems: jsonb('line_items').$type<Array<POLineItem>>().default([]),
  returns: jsonb('returns').$type<Array<POReturn>>().default([]),
  invoiceFileId: text('invoice_file_id'),
  totalOrderAmount: numeric('total_order_amount', { precision: 10, scale: 2 }).default('0'),
  totalReturnAmount: numeric('total_return_amount', { precision: 10, scale: 2 }).default('0'),
  netAmount: numeric('net_amount', { precision: 10, scale: 2 }).default('0'),
  amountPaid: numeric('amount_paid', { precision: 10, scale: 2 }).default('0'),
  balanceDue: numeric('balance_due', { precision: 10, scale: 2 }).default('0'),
  paymentStatus: text('payment_status')
    .$type<'UNPAID' | 'PARTIALLY_PAID' | 'PAID'>()
    .default('UNPAID'),
  paymentHistory: jsonb('payment_history').$type<Array<POPayment>>().default([]),
  notes: text('notes'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert;
