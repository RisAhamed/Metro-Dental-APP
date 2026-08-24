import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, numeric, jsonb, pgEnum, boolean } from 'drizzle-orm/pg-core';

export const planStatusEnum = pgEnum('plan_status', ['DRAFT', 'ACTIVE', 'COMPLETED', 'PAUSED']);

export const treatmentPlans = table('treatment_plans', {
  planId: text('plan_id').primaryKey().notNull(),
  patientId: text('patient_id').notNull(),
  clinicId: text('clinic_id').notNull(),
  title: text('title'),
  status: planStatusEnum('status').default('DRAFT'),
  procedures: jsonb('procedures').$type<Array<{
    procedureId: string; // reference to procedures_catalog
    procedureName: string;
    qty: number;
    unitCost: number;
    discount: number; // flat discount in ₹
    total: number; // (qty * unitCost) - discount
    toothNumbers: number[] | null; // for dental chart selection
    isFullMouth: boolean;
    isMultiplyCost: boolean;
    notes: string | null;
    status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'; // defaults to PENDING
    completedAt?: string | null; // ISO date when marked COMPLETED
    completedByName?: string | null; // doctor/staff who completed it
  }>>().default([]),
  totalCost: numeric('total_cost', { precision: 10, scale: 2 }).default('0'),
  totalDiscount: numeric('total_discount', { precision: 10, scale: 2 }).default('0'),
  grandTotal: numeric('grand_total', { precision: 10, scale: 2 }).default('0'),
  notes: text('notes'),
  shareEnabled: boolean('share_enabled').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: text('created_by').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  updatedBy: text('updated_by'),
});

export type TreatmentPlan = typeof treatmentPlans.$inferSelect;
export type NewTreatmentPlan = typeof treatmentPlans.$inferInsert;