import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const correctionStatusEnum = pgEnum('correction_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
]);

export const correctionTypeEnum = pgEnum('correction_type', [
  'MISSED_CLOCK_IN',
  'MISSED_CLOCK_OUT',
  'WRONG_TIME',
  'OTHER',
]);

export const attendanceCorrections = table('attendance_corrections', {
  correctionId: text('correction_id').primaryKey().notNull(),
  attendanceRecordId: text('attendance_record_id').notNull(),
  requestedBy: text('requested_by').notNull(),
  requestedByName: text('requested_by_name').notNull(),
  requesterRole: text('requester_role').notNull(),
  clinicId: text('clinic_id').notNull(),
  date: timestamp('date', { withTimezone: true }).notNull(),
  dateString: text('date_string').notNull(),
  requestType: correctionTypeEnum('request_type').notNull(),
  originalClockIn: timestamp('original_clock_in', { withTimezone: true }),
  originalClockOut: timestamp('original_clock_out', { withTimezone: true }),
  requestedClockIn: timestamp('requested_clock_in', { withTimezone: true }),
  requestedClockOut: timestamp('requested_clock_out', { withTimezone: true }),
  reason: text('reason').notNull(),
  status: correctionStatusEnum('status').default('PENDING').notNull(),
  reviewedBy: text('reviewed_by'),
  reviewedByName: text('reviewed_by_name'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewNotes: text('review_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type AttendanceCorrection = typeof attendanceCorrections.$inferSelect;
export type NewAttendanceCorrection = typeof attendanceCorrections.$inferInsert;