import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';

export const apptStatusEnum = pgEnum('appt_status', [
  'SCHEDULED',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW'
]);

export const appointments = table('appointments', {
  appointmentId: text('appointment_id').primaryKey().notNull(),
  patientId: text('patient_id').notNull(),
  patientName: text('patient_name').notNull(),
  clinicId: text('clinic_id').notNull(),
  doctorId: text('doctor_id').notNull(),
  doctorName: text('doctor_name').notNull(),
  appointmentDate: timestamp('appointment_date', { withTimezone: true }).notNull(),
  durationMinutes: integer('duration_minutes').default(30).notNull(),
  categoryId: text('category_id'),
  categoryName: text('category_name'),
  categoryColor: text('category_color'),
  status: apptStatusEnum('status').default('SCHEDULED').notNull(),
  isWalkIn: boolean('is_walk_in').default(false).notNull(),
  tokenNumber: text('token_number'),
  abhaId: text('abha_id'),
  plannedProcedures: text('planned_procedures'),
  notes: text('notes'),
  visitId: text('visit_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: text('created_by').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  updatedBy: text('updated_by'),
});

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;