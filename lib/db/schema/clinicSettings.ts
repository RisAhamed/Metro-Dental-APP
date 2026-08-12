import { cockroachTable as table } from './cockroachTable';
import { text, numeric, jsonb } from 'drizzle-orm/pg-core';

export const clinicSettings = table('clinic_settings', {
  clinicId: text('clinic_id').primaryKey().notNull(),
  generalDoctorBaseDailyPay: numeric('general_doctor_base_daily_pay', { precision: 10, scale: 2 }).default('2000'),
  generalDoctorDailyWorkHours: numeric('general_doctor_daily_work_hours', { precision: 4, scale: 1 }).default('7'),
  generalDoctorDailyRevenueTarget: numeric('general_doctor_daily_revenue_target', { precision: 10, scale: 2 }).default('20000'),
  generalDoctorMonthlyRevenueTarget: numeric('general_doctor_monthly_revenue_target', { precision: 10, scale: 2 }).default('600000'),
  generalDoctorMonthlyTargetCap: numeric('general_doctor_monthly_target_cap', { precision: 10, scale: 2 }).default('100000'),
  assistantMonthlyBasePay: numeric('assistant_monthly_base_pay', { precision: 10, scale: 2 }).default('18000'),
  assistantDailyWorkHours: numeric('assistant_daily_work_hours', { precision: 4, scale: 1 }).default('8'),
  workingDaysPerMonth: numeric('working_days_per_month', { precision: 2, scale: 0 }).default('26'),
  referralIncentiveAmount: numeric('referral_incentive_amount', { precision: 10, scale: 2 }).default('1500'),
  weeklyAttendanceBonusAmount: numeric('weekly_attendance_bonus_amount', { precision: 10, scale: 2 }).default('500'),
  workingHours: jsonb('working_hours')
    .$type<{ start: string; end: string }>()
    .default({ start: '09:00', end: '20:00' }),
});

export type ClinicSettings = typeof clinicSettings.$inferSelect;
export type NewClinicSettings = typeof clinicSettings.$inferInsert;
