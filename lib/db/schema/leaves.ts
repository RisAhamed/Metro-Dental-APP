import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, pgEnum, numeric } from 'drizzle-orm/pg-core';

export const leaveTypeEnum = pgEnum('leave_type', [
  'FULL_DAY',
  'HALF_DAY',
  'EMERGENCY',
  'SICK',
  'PERMISSION',
]);

export const leaveStatusEnum = pgEnum('leave_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
]);

export const halfDaySlotEnum = pgEnum('half_day_slot', ['MORNING', 'AFTERNOON']);

export const leaves = table('leaves', {
  leaveId: text('leave_id').primaryKey().notNull(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  userRole: text('user_role').notNull(),
  requesterRole: text('requester_role').notNull(),
  clinicId: text('clinic_id').notNull(),
  leaveType: leaveTypeEnum('leave_type').notNull(),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  totalDays: numeric('total_days', { precision: 3, scale: 1 }).notNull(),
  halfDaySlot: halfDaySlotEnum('half_day_slot'),
  reason: text('reason'),
  status: leaveStatusEnum('status').default('PENDING').notNull(),
  appliedAt: timestamp('applied_at', { withTimezone: true }).defaultNow().notNull(),
  reviewedBy: text('reviewed_by'),
  reviewedByName: text('reviewed_by_name'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewNotes: text('review_notes'),
});

export type Leave = typeof leaves.$inferSelect;
export type NewLeave = typeof leaves.$inferInsert;