import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, numeric, jsonb, pgEnum, boolean } from 'drizzle-orm/pg-core';

export const visitTypeEnum = pgEnum('visit_type', ['NEW_PROBLEM', 'FOLLOW_UP', 'EMERGENCY', 'ROUTINE']);
export const visitStatusEnum = pgEnum('visit_status', ['DRAFT', 'COMPLETED']);

export const visits = table('visits', {
  visitId: text('visit_id').primaryKey().notNull(),
  patientId: text('patient_id').notNull(),
  patientName: text('patient_name').notNull(),
  clinicId: text('clinic_id').notNull(),
  visitDate: timestamp('visit_date', { withTimezone: true }).notNull(),
  visitType: visitTypeEnum('visit_type').default('NEW_PROBLEM'),
  // Clinical details
  chiefComplaint: text('chief_complaint'),
  diagnosis: text('diagnosis'),
  treatmentGiven: text('treatment_given'),
  injectionGiven: boolean('injection_given').default(false),
  doctorsInvolved: jsonb('doctors_involved').$type<Array<{ doctorId: string; doctorName: string; role: string }>>().default([]),
  dentalChartEntries: jsonb('dental_chart_entries').$type<Array<{
    region: string; // 'UPPER_JAW', 'LOWER_JAW'
    toothNumber: string; // e.g. '11', '36', '11gamma'
    procedureDone: string;
    notes: string | null;
  }>>().default([]),
  // Vital signs
  vitalSigns: jsonb('vital_signs').$type<{
    age: number | null;
    weight: number | null;
    bloodPressure: string | null;
    bloodSugar: number | null;
    pulseRate: number | null;
    spo2: number | null;
  }>(),
  // Billing
  treatmentCost: numeric('treatment_cost', { precision: 10, scale: 2 }).default('0'),
  amountPaid: numeric('amount_paid', { precision: 10, scale: 2 }).default('0'),
  paymentStatus: text('payment_status').$type<'UNPAID' | 'PARTIALLY_PAID' | 'PAID'>().default('UNPAID'),
  payments: jsonb('payments').$type<Array<{
    paymentId: string;
    amount: number;
    mode: 'CASH' | 'GPAY' | 'PAYTM' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'OTHER';
    date: string;
    recordedBy: string;
    recordedByName: string | null;
    notes: string | null;
  }>>().default([]),
  // Files (Cloudflare R2)
  fileIds: jsonb('file_ids').$type<Array<{
    fileId: string;
    fileName: string;
    url: string;
    type: string;
  }>>().default([]),
  // Additional
  additionalNotes: text('additional_notes'),
  nextVisitDate: timestamp('next_visit_date', { withTimezone: true }),
  status: visitStatusEnum('status').default('DRAFT'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: text('created_by').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  updatedBy: text('updated_by'),
});

export type Visit = typeof visits.$inferSelect;
export type NewVisit = typeof visits.$inferInsert;