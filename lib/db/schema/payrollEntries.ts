import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, numeric, boolean } from 'drizzle-orm/pg-core';

export const payrollEntries = table('payroll_entries', {
  entryId: text('entry_id').primaryKey().notNull(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  userRole: text('user_role').notNull(),
  clinicId: text('clinic_id').notNull(),
  date: timestamp('date', { withTimezone: true }).notNull(),
  dateString: text('date_string').notNull(),
  isSunday: boolean('is_sunday').default(false).notNull(),
  totalDayEarning: numeric('total_day_earning', { precision: 10, scale: 2 }).default('0'),
  // GD fields
  gdHoursWorked: numeric('gd_hours_worked', { precision: 5, scale: 2 }),
  gdDailyRevenue: numeric('gd_daily_revenue', { precision: 12, scale: 2 }),
  gdDailyEarning: numeric('gd_daily_earning', { precision: 10, scale: 2 }),
  gdDailyTargetAchieved: boolean('gd_daily_target_achieved').default(false),
  gdMultiplier: numeric('gd_multiplier', { precision: 2, scale: 1 }).default('1'),
  gdReferralIncentive: numeric('gd_referral_incentive', { precision: 10, scale: 2 }).default('0'),
  gdReferralCount: numeric('gd_referral_count', { precision: 4, scale: 0 }).default('0'),
  // AD fields
  adHoursWorked: numeric('ad_hours_worked', { precision: 5, scale: 2 }),
  adDailyEarning: numeric('ad_daily_earning', { precision: 10, scale: 2 }),
  adIsDeducted: boolean('ad_is_deducted').default(false),
  adSundayIncentives: numeric('ad_sunday_incentives', { precision: 10, scale: 2 }).default('0'),
  adSundayTasksCount: numeric('ad_sunday_tasks_count', { precision: 4, scale: 0 }).default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type PayrollEntry = typeof payrollEntries.$inferSelect;
export type NewPayrollEntry = typeof payrollEntries.$inferInsert;