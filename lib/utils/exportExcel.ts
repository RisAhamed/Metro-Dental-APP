import * as XLSX from 'xlsx';

export interface PayrollExportRow {
  userName: string;
  userRole: string;
  clinicId: string;
  gdTotalDaysWorked?: string | null;
  adTotalDaysWorked?: string | null;
  gdAccumulatedSalary?: string | null;
  adRegularEarning?: string | null;
  gdSundayEarning?: string | null;
  adSundayEarning?: string | null;
  gdReferralIncentivesTotal?: string | null;
  gdMonthlyTargetBonus?: string | null;
  adWeeklyBonusesTotal?: string | null;
  adSundayTaskIncentivesTotal?: string | null;
  gdTotalFinalSalary?: string | null;
  adTotalFinalSalary?: string | null;
  status: string;
}

export function exportPayrollToExcel(
  data: PayrollExportRow[],
  month: number,
  year: number
): XLSX.WorkBook {
  const rows = data.map((p) => ({
    Name: p.userName,
    Role: p.userRole,
    Clinic: p.clinicId,
    'Days Worked': p.gdTotalDaysWorked ?? p.adTotalDaysWorked ?? 0,
    'Base Salary': p.gdAccumulatedSalary ?? p.adRegularEarning ?? 0,
    'Sunday Pay': p.gdSundayEarning ?? p.adSundayEarning ?? 0,
    Referrals: p.gdReferralIncentivesTotal ?? 0,
    'Monthly Bonus': p.gdMonthlyTargetBonus ?? 0,
    'Weekly Bonus': p.adWeeklyBonusesTotal ?? 0,
    'Sunday Tasks': p.adSundayTaskIncentivesTotal ?? 0,
    'Total Salary': p.gdTotalFinalSalary ?? p.adTotalFinalSalary ?? 0,
    Status: p.status,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Payroll ${month}-${year}`);
  return wb;
}