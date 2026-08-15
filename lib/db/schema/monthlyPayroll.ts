import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, numeric, boolean } from 'drizzle-orm/pg-core';

export const monthlyPayroll = table('monthly_payroll', {
  payrollId: text('payroll_id').primaryKey().notNull(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  userRole: text('user_role').notNull(),
  clinicId: text('clinic_id').notNull(),
  month: numeric('month', { precision: 2, scale: 0 }).notNull(),
  year: numeric('year', { precision: 4, scale: 0 }).notNull(),
  status: text('status').default('DRAFT').notNull(),
  generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
  generatedBy: text('generated_by').notNull(),
  // GD summary
  gdAccumulatedSalary: numeric('gd_accumulated_salary', { precision: 12, scale: 2 }).default('0'),
  gdSundayEarning: numeric('gd_sunday_earning', { precision: 12, scale: 2 }).default('0'),
  gdReferralIncentivesTotal: numeric('gd_referral_incentives_total', { precision: 12, scale: 2 }).default('0'),
  gdTotalMonthlyRevenue: numeric('gd_total_monthly_revenue', { precision: 14, scale: 2 }).default('0'),
  gdMonthlyTargetAchieved: boolean('gd_monthly_target_achieved').default(false),
  gdMonthlyTargetBonus: numeric('gd_monthly_target_bonus', { precision: 12, scale: 2 }).default('0'),
  gdTotalFinalSalary: numeric('gd_total_final_salary', { precision: 12, scale: 2 }).default('0'),
  gdTotalDaysWorked: numeric('gd_total_days_worked', { precision: 4, scale: 0 }).default('0'),
  gdTargetDaysCount: numeric('gd_target_days_count', { precision: 4, scale: 0 }).default('0'),
  // AD summary
  adRegularEarning: numeric('ad_regular_earning', { precision: 12, scale: 2 }).default('0'),
  adSundayEarning: numeric('ad_sunday_earning', { precision: 12, scale: 2 }).default('0'),
  adWeeklyBonusesTotal: numeric('ad_weekly_bonuses_total', { precision: 12, scale: 2 }).default('0'),
  adSundayTaskIncentivesTotal: numeric('ad_sunday_task_incentives_total', { precision: 12, scale: 2 }).default('0'),
  adTotalFinalSalary: numeric('ad_total_final_salary', { precision: 12, scale: 2 }).default('0'),
  adTotalDaysWorked: numeric('ad_total_days_worked', { precision: 4, scale: 0 }).default('0'),
});

export type MonthlyPayroll = typeof monthlyPayroll.$inferSelect;
export type NewMonthlyPayroll = typeof monthlyPayroll.$inferInsert;