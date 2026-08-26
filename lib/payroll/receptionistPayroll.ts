import type { PayrollSettings } from './doctorPayroll';

export interface RCDayResult {
  earning: number;
  overtimeHours: number;
  overtimePay: number;
  isSunday: boolean;
}

export function calcRCDayEarning(params: {
  hoursWorked: number;
  date: Date;
  settings: PayrollSettings;
}): RCDayResult {
  const { hoursWorked, date, settings } = params;
  const dailyBase = settings.receptionistMonthlyBasePay / settings.workingDaysPerMonth;
  const hourlyRate = dailyBase / settings.receptionistDailyWorkHours;
  const isSunday = date.getDay() === 0;
  const overtimeRate = settings.receptionistOvertimeRate || 0;

  if (isSunday) {
    return {
      earning: Math.round(hoursWorked * hourlyRate * 2 * 100) / 100,
      overtimeHours: 0,
      overtimePay: 0,
      isSunday: true,
    };
  }

  if (hoursWorked <= settings.receptionistDailyWorkHours) {
    return {
      earning: Math.round(hoursWorked * hourlyRate * 100) / 100,
      overtimeHours: 0,
      overtimePay: 0,
      isSunday: false,
    };
  }

  const regularPay = settings.receptionistDailyWorkHours * hourlyRate;
  const overtimeHours = hoursWorked - settings.receptionistDailyWorkHours;
  const overtimePay = overtimeRate > 0 ? overtimeHours * hourlyRate * overtimeRate : 0;

  return {
    earning: Math.round(regularPay * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    overtimePay: Math.round(overtimePay * 100) / 100,
    isSunday: false,
  };
}
