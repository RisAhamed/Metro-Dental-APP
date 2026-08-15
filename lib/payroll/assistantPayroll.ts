import type { PayrollSettings } from './doctorPayroll';

export interface ADDayResult {
  earning: number;
  isDeducted: boolean;
  isSunday: boolean;
}

export function calcADDayEarning(params: {
  hoursWorked: number;
  date: Date;
  settings: PayrollSettings;
}): ADDayResult {
  const { hoursWorked, date, settings } = params;
  const dailyBase = settings.assistantMonthlyBasePay / settings.workingDaysPerMonth;
  const hourlyRate = dailyBase / settings.assistantDailyWorkHours;
  const isSunday = date.getDay() === 0;

  if (isSunday) {
    return {
      earning: Math.round(hoursWorked * hourlyRate * 2 * 100) / 100,
      isDeducted: false,
      isSunday: true,
    };
  }

  if (hoursWorked >= settings.assistantDailyWorkHours) {
    return {
      earning: Math.round(dailyBase * 100) / 100,
      isDeducted: false,
      isSunday: false,
    };
  }

  return {
    earning: Math.round(hoursWorked * hourlyRate * 100) / 100,
    isDeducted: true,
    isSunday: false,
  };
}