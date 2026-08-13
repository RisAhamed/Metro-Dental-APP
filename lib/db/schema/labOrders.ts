import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';

export const labOrderStatusEnum = pgEnum('lab_order_status', [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export const labStageStatusEnum = pgEnum('lab_stage_status', [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
]);

export const labOrders = table('lab_orders', {
  orderId: text('order_id').primaryKey().notNull(),
  labId: text('lab_id').notNull(),
  labName: text('lab_name').notNull(),
  clinicId: text('clinic_id').notNull(),
  patientId: text('patient_id').notNull(),
  patientName: text('patient_name').notNull(),
  visitId: text('visit_id'),
  orderedByDoctorId: text('ordered_by_doctor_id').notNull(),
  orderedByDoctorName: text('ordered_by_doctor_name').notNull(),
  orderDate: timestamp('order_date', { withTimezone: true }).defaultNow().notNull(),
  overallDueDate: timestamp('overall_due_date', { withTimezone: true }),
  workDescription: text('work_description').notNull(),
  stages: jsonb('stages')
    .$type<
      Array<{
        stageId: string;
        stageName: string;
        description: string;
        deadline: string | null;
        status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
        completedAt: string | null;
        completedBy: string | null;
        completedByName: string | null;
        notes: string | null;
      }>
    >()
    .default([]),
  status: labOrderStatusEnum('status').default('PENDING').notNull(),
  attachmentFileIds: text('attachment_file_ids').array().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type LabOrder = typeof labOrders.$inferSelect;
export type NewLabOrder = typeof labOrders.$inferInsert;