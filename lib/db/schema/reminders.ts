import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const reminders = table('reminders', {
  reminderId: text('reminder_id').primaryKey().notNull(),
  clinicId: text('clinic_id').notNull(),
  title: text('title').notNull(),
  doctorId: text('doctor_id'), // null = "All Doctors"
  doctorName: text('doctor_name'),
  isAllDay: boolean('is_all_day').default(false).notNull(),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Reminder = typeof reminders.$inferSelect;
export type NewReminder = typeof reminders.$inferInsert;