import * as XLSX from 'xlsx';

export interface PayrollExportRow {
  userName: string;
  userRole: string;
  clinicId: string;
  gdTotalDaysWorked?: string | null;
  adTotalDaysWorked?: string | null;
  rcTotalDaysWorked?: string | null;
  gdAccumulatedSalary?: string | null;
  adRegularEarning?: string | null;
  rcRegularEarning?: string | null;
  gdSundayEarning?: string | null;
  adSundayEarning?: string | null;
  rcOvertimeEarning?: string | null;
  gdReferralIncentivesTotal?: string | null;
  gdMonthlyTargetBonus?: string | null;
  adWeeklyBonusesTotal?: string | null;
  rcWeeklyBonusesTotal?: string | null;
  adSundayTaskIncentivesTotal?: string | null;
  gdTotalFinalSalary?: string | null;
  adTotalFinalSalary?: string | null;
  rcTotalFinalSalary?: string | null;
  status: string;
}

export function exportPayrollToExcel(
  data: PayrollExportRow[],
  month: number,
  year: number
): XLSX.WorkBook {
  const rows = data.map((p) => {
    const isDoctor = p.userRole === 'GENERAL_DOCTOR' || p.userRole === 'CLINIC_ADMIN';
    const isReceptionist = p.userRole === 'RECEPTIONIST';
    return {
      Name: p.userName,
      Role: p.userRole,
      Clinic: p.clinicId,
      'Days Worked': isDoctor
        ? (p.gdTotalDaysWorked ?? 0)
        : isReceptionist
          ? (p.rcTotalDaysWorked ?? 0)
          : (p.adTotalDaysWorked ?? 0),
      'Base Salary': isDoctor
        ? (p.gdAccumulatedSalary ?? 0)
        : isReceptionist
          ? (p.rcRegularEarning ?? 0)
          : (p.adRegularEarning ?? 0),
      'Sunday/Overtime Pay': isDoctor
        ? (p.gdSundayEarning ?? 0)
        : isReceptionist
          ? (p.rcOvertimeEarning ?? 0)
          : (p.adSundayEarning ?? 0),
      Referrals: isDoctor ? (p.gdReferralIncentivesTotal ?? 0) : 0,
      'Monthly Bonus': isDoctor ? (p.gdMonthlyTargetBonus ?? 0) : 0,
      'Weekly Bonus': isReceptionist
        ? (p.rcWeeklyBonusesTotal ?? 0)
        : (p.adWeeklyBonusesTotal ?? 0),
      'Sunday Tasks': isDoctor ? 0 : (p.adSundayTaskIncentivesTotal ?? 0),
      'Total Salary': isDoctor
        ? (p.gdTotalFinalSalary ?? 0)
        : isReceptionist
          ? (p.rcTotalFinalSalary ?? 0)
          : (p.adTotalFinalSalary ?? 0),
      Status: p.status,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Payroll ${month}-${year}`);
  return wb;
}