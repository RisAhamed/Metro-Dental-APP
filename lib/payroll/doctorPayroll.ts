export interface PayrollSettings {
  generalDoctorBaseDailyPay: number;
  generalDoctorDailyWorkHours: number;
  generalDoctorDailyRevenueTarget: number;
  generalDoctorMonthlyRevenueTarget: number;
  generalDoctorMonthlyTargetCap: number;
  assistantMonthlyBasePay: number;
  assistantDailyWorkHours: number;
  receptionistMonthlyBasePay: number;
  receptionistDailyWorkHours: number;
  receptionistOvertimeRate: number;
  receptionistWeeklyBonus: number;
  workingDaysPerMonth: number;
  referralIncentiveAmount: number;
  weeklyAttendanceBonusAmount: number;
}

export interface GDDayResult {
  earning: number;
  multiplier: number;
  dailyTargetAchieved: boolean;
  isSunday: boolean;
}

export function calcGDDayEarning(params: {
  hoursWorked: number;
  dailyRevenue: number;
  date: Date;
  settings: PayrollSettings;
}): GDDayResult {
  const { hoursWorked, dailyRevenue, date, settings } = params;
  const baseHourly = settings.generalDoctorBaseDailyPay / settings.generalDoctorDailyWorkHours;
  const isSunday = date.getDay() === 0;
  const targetAchieved = dailyRevenue >= settings.generalDoctorDailyRevenueTarget;

  let multiplier = 1;
  if (isSunday && targetAchieved) multiplier = 3;
  else if (isSunday) multiplier = 2;
  else if (targetAchieved) multiplier = 2;

  let earning: number;
  if (isSunday) {
    earning = hoursWorked * baseHourly * multiplier;
  } else if (hoursWorked < settings.generalDoctorDailyWorkHours) {
    earning = hoursWorked * baseHourly * multiplier;
  } else {
    earning = settings.generalDoctorDailyWorkHours * baseHourly * multiplier;
  }

  return {
    earning: Math.round(earning * 100) / 100,
    multiplier,
    dailyTargetAchieved: targetAchieved,
    isSunday,
  };
}