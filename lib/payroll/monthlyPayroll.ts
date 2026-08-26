import type { PayrollSettings } from './doctorPayroll';

export interface DailyPayrollEntry {
  gdDailyEarning?: number | null;
  gdDailyRevenue?: number | null;
  gdHoursWorked?: number | null;
  gdDailyTargetAchieved?: boolean | null;
  adDailyEarning?: number | null;
  adHoursWorked?: number | null;
  rcDailyEarning?: number | null;
  rcHoursWorked?: number | null;
  rcOvertimeHours?: number | null;
  rcOvertimePay?: number | null;
  isSunday?: boolean | null;
}

export interface Incentive {
  type: string;
  amount: number | null;
}

export interface GDMonthlyResult {
  gdAccumulatedSalary: number;
  gdSundayEarning: number;
  gdReferralIncentivesTotal: number;
  gdTotalMonthlyRevenue: number;
  gdMonthlyTargetAchieved: boolean;
  gdMonthlyTargetBonus: number;
  gdTotalFinalSalary: number;
  gdTotalDaysWorked: number;
  gdTargetDaysCount: number;
}

export interface ADMonthlyResult {
  adRegularEarning: number;
  adSundayEarning: number;
  adWeeklyBonusesTotal: number;
  adSundayTaskIncentivesTotal: number;
  adTotalFinalSalary: number;
  adTotalDaysWorked: number;
}

export function calcGDMonthlyPayroll(
  dailyEntries: DailyPayrollEntry[],
  incentiveRecords: Incentive[],
  settings: PayrollSettings
): GDMonthlyResult {
  const accumulatedEarning = dailyEntries.reduce(
    (sum, e) => sum + (e.gdDailyEarning ?? 0),
    0
  );
  const sundayEarning = dailyEntries
    .filter((e) => e.isSunday)
    .reduce((sum, e) => sum + (e.gdDailyEarning ?? 0), 0);
  const referralTotal = incentiveRecords
    .filter((r) => r.type === 'REFERRAL_1500')
    .reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const totalRevenue = dailyEntries.reduce(
    (sum, e) => sum + (e.gdDailyRevenue ?? 0),
    0
  );
  const targetHit = totalRevenue >= settings.generalDoctorMonthlyRevenueTarget;

  let totalFinalSalary = accumulatedEarning + referralTotal;
  let monthlyBonus = 0;

  if (targetHit) {
    if (totalFinalSalary < settings.generalDoctorMonthlyTargetCap) {
      monthlyBonus = settings.generalDoctorMonthlyTargetCap - totalFinalSalary;
      totalFinalSalary = settings.generalDoctorMonthlyTargetCap;
    } else {
      totalFinalSalary = Math.min(totalFinalSalary, settings.generalDoctorMonthlyTargetCap);
    }
  }

  return {
    gdAccumulatedSalary: Math.round(accumulatedEarning * 100) / 100,
    gdSundayEarning: Math.round(sundayEarning * 100) / 100,
    gdReferralIncentivesTotal: Math.round(referralTotal * 100) / 100,
    gdTotalMonthlyRevenue: Math.round(totalRevenue * 100) / 100,
    gdMonthlyTargetAchieved: targetHit,
    gdMonthlyTargetBonus: Math.round(monthlyBonus * 100) / 100,
    gdTotalFinalSalary: Math.round(totalFinalSalary * 100) / 100,
    gdTotalDaysWorked: dailyEntries.filter((e) => (e.gdHoursWorked ?? 0) > 0).length,
    gdTargetDaysCount: dailyEntries.filter((e) => e.gdDailyTargetAchieved).length,
  };
}

export function calcADMonthlyPayroll(
  dailyEntries: DailyPayrollEntry[],
  incentiveRecords: Incentive[],
  settings: PayrollSettings
): ADMonthlyResult {
  void settings;
  const weeklyBonuses = incentiveRecords
    .filter((r) => r.type === 'WEEKLY_ATTENDANCE_500')
    .reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const sundayTasks = incentiveRecords
    .filter((r) => r.type === 'SUNDAY_TASK')
    .reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const regularEarning = dailyEntries
    .filter((e) => !e.isSunday)
    .reduce((sum, e) => sum + (e.adDailyEarning ?? 0), 0);
  const sundayEarning = dailyEntries
    .filter((e) => e.isSunday)
    .reduce((sum, e) => sum + (e.adDailyEarning ?? 0), 0);
  const finalSalary = regularEarning + sundayEarning + weeklyBonuses + sundayTasks;

  return {
    adRegularEarning: Math.round(regularEarning * 100) / 100,
    adSundayEarning: Math.round(sundayEarning * 100) / 100,
    adWeeklyBonusesTotal: Math.round(weeklyBonuses * 100) / 100,
    adSundayTaskIncentivesTotal: Math.round(sundayTasks * 100) / 100,
    adTotalFinalSalary: Math.round(finalSalary * 100) / 100,
    adTotalDaysWorked: dailyEntries.filter((e) => (e.adHoursWorked ?? 0) > 0).length,
  };
}

export interface RCMonthlyResult {
  rcRegularEarning: number;
  rcOvertimeEarning: number;
  rcWeeklyBonusesTotal: number;
  rcTotalFinalSalary: number;
  rcTotalDaysWorked: number;
}

export function calcRCMonthlyPayroll(
  dailyEntries: DailyPayrollEntry[],
  incentiveRecords: Incentive[],
  settings: PayrollSettings
): RCMonthlyResult {
  void settings;
  const weeklyBonuses = incentiveRecords
    .filter((r) => r.type === 'RC_WEEKLY_BONUS')
    .reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const regularEarning = dailyEntries
    .filter((e) => !e.isSunday)
    .reduce((sum, e) => sum + (e.rcDailyEarning ?? 0), 0);
  const sundayEarning = dailyEntries
    .filter((e) => e.isSunday)
    .reduce((sum, e) => sum + (e.rcDailyEarning ?? 0), 0);
  const overtimeEarning = dailyEntries
    .reduce((sum, e) => sum + (e.rcOvertimePay ?? 0), 0);

  const finalSalary = regularEarning + sundayEarning + overtimeEarning + weeklyBonuses;

  return {
    rcRegularEarning: Math.round(regularEarning * 100) / 100,
    rcOvertimeEarning: Math.round(overtimeEarning * 100) / 100,
    rcWeeklyBonusesTotal: Math.round(weeklyBonuses * 100) / 100,
    rcTotalFinalSalary: Math.round(finalSalary * 100) / 100,
    rcTotalDaysWorked: dailyEntries.filter((e) => (e.rcHoursWorked ?? 0) > 0).length,
  };
}