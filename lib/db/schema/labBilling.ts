import { cockroachTable as table } from './cockroachTable';
import { text, numeric, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

export const labBilling = table('lab_billing', {
  orderId: text('order_id').primaryKey().notNull(),
  stageCosts: jsonb('stage_costs')
    .$type<
      Array<{
        stageId: string;
        stageName: string;
        cost: number | null;
      }>
    >()
    .default([]),
  totalCost: numeric('total_cost', { precision: 10, scale: 2 }).default('0'),
  amountPaid: numeric('amount_paid', { precision: 10, scale: 2 }).default('0'),
  paymentStatus: text('payment_status')
    .$type<'UNPAID' | 'PARTIALLY_PAID' | 'PAID'>()
    .default('UNPAID'),
  clinicApproved: boolean('clinic_approved').default(false),
  clinicApprovedAt: timestamp('clinic_approved_at', { withTimezone: true }),
  clinicApprovedBy: text('clinic_approved_by'),
  paymentHistory: jsonb('payment_history')
    .$type<
      Array<{
        paymentId: string;
        amount: number;
        date: string;
        recordedBy: string;
        notes: string | null;
      }>
    >()
    .default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type LabBilling = typeof labBilling.$inferSelect;
export type NewLabBilling = typeof labBilling.$inferInsert;