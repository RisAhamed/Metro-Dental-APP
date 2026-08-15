import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, numeric } from 'drizzle-orm/pg-core';

export const incentiveRecords = table('incentive_records', {
  incentiveId: text('incentive_id').primaryKey().notNull(),
  recipientUserId: text('recipient_user_id').notNull(),
  recipientUserName: text('recipient_user_name').notNull(),
  clinicId: text('clinic_id').notNull(),
  type: text('type').notNull(), // REFERRAL_1500 | WEEKLY_ATTENDANCE_500 | SUNDAY_TASK
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  date: timestamp('date', { withTimezone: true }).notNull(),
  dateString: text('date_string').notNull(),
  // Referral metadata
  referredPatientId: text('referred_patient_id'),
  referredPatientName: text('referred_patient_name'),
  surgeryTypeId: text('surgery_type_id'),
  surgeryTypeName: text('surgery_type_name'),
  chiefDoctorRevenue: numeric('chief_doctor_revenue', { precision: 12, scale: 2 }),
  // Weekly attendance bonus metadata
  weekStartDate: text('week_start_date'),
  weekEndDate: text('week_end_date'),
  // Sunday task metadata
  taskTypeId: text('task_type_id'),
  taskTypeName: text('task_type_name'),
  patientId: text('patient_id'),
  description: text('description'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type IncentiveRecord = typeof incentiveRecords.$inferSelect;
export type NewIncentiveRecord = typeof incentiveRecords.$inferInsert;