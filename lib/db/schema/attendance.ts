import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, numeric, pgEnum, boolean } from 'drizzle-orm/pg-core';

export const attendanceStatusEnum = pgEnum('attendance_status', [
  'PRESENT',
  'ABSENT',
  'HALF_DAY',
  'ON_LEAVE',
]);

export const attendanceRecords = table('attendance_records', {
  recordId: text('record_id').primaryKey().notNull(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  userRole: text('user_role').notNull(),
  clinicId: text('clinic_id').notNull(),
  date: timestamp('date', { withTimezone: true }).notNull(),
  dateString: text('date_string').notNull(),
  clockIn: timestamp('clock_in', { withTimezone: true }),
  clockOut: timestamp('clock_out', { withTimezone: true }),
  hoursWorked: numeric('hours_worked', { precision: 5, scale: 2 }).default('0'),
  status: attendanceStatusEnum('status').default('ABSENT').notNull(),
  recordedBy: text('recorded_by').notNull(),
  hasCorrectionRequest: boolean('has_correction_request').default(false),
  correctionRequestId: text('correction_request_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  updatedBy: text('updated_by'),
});

export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type NewAttendanceRecord = typeof attendanceRecords.$inferInsert;