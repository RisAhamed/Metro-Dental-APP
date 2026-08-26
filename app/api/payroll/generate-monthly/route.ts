import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { monthlyPayroll } from '@/lib/db/schema/monthlyPayroll';
import { payrollEntries } from '@/lib/db/schema/payrollEntries';
import { incentiveRecords } from '@/lib/db/schema/incentiveRecords';
import { users } from '@/lib/db/schema/users';
import { clinicSettings } from '@/lib/db/schema/clinicSettings';
import { isSuperAdmin } from '@/lib/auth/claims';
import { eq, and, sql } from 'drizzle-orm';
import { calcGDMonthlyPayroll, calcADMonthlyPayroll, calcRCMonthlyPayroll } from '@/lib/payroll/monthlyPayroll';
import type { PayrollSettings } from '@/lib/payroll/doctorPayroll';
import type { DailyPayrollEntry, Incentive } from '@/lib/payroll/monthlyPayroll';

function toNum(value: string | null | undefined): number {
  const n = parseFloat(value ?? '0');
  return isNaN(n) ? 0 : n;
}

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isSuperAdmin(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { clinicId, month, year } = body;

  if (!clinicId || !month || !year) {
    return NextResponse.json(
      { error: 'Missing required fields: clinicId, month, year' },
      { status: 400 }
    );
  }

  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);
  if (isNaN(monthNum) || isNaN(yearNum)) {
    return NextResponse.json({ error: 'Invalid month or year' }, { status: 400 });
  }

  const monthStr = String(monthNum).padStart(2, '0');
  const startDate = `${yearNum}-${monthStr}-01`;
  const endDate = `${yearNum}-${monthStr}-31`;

  try {
    const settingsResult = await db
      .select()
      .from(clinicSettings)
      .where(eq(clinicSettings.clinicId, clinicId))
      .limit(1);

    const row = settingsResult[0];
    const settings: PayrollSettings = row
      ? {
          generalDoctorBaseDailyPay: toNum(row.generalDoctorBaseDailyPay),
          generalDoctorDailyWorkHours: toNum(row.generalDoctorDailyWorkHours),
          generalDoctorDailyRevenueTarget: toNum(row.generalDoctorDailyRevenueTarget),
          generalDoctorMonthlyRevenueTarget: toNum(row.generalDoctorMonthlyRevenueTarget),
          generalDoctorMonthlyTargetCap: toNum(row.generalDoctorMonthlyTargetCap),
          assistantMonthlyBasePay: toNum(row.assistantMonthlyBasePay),
          assistantDailyWorkHours: toNum(row.assistantDailyWorkHours),
          receptionistMonthlyBasePay: toNum(row.receptionistMonthlyBasePay),
          receptionistDailyWorkHours: toNum(row.receptionistDailyWorkHours),
          receptionistOvertimeRate: toNum(row.receptionistOvertimeRate),
          receptionistWeeklyBonus: toNum(row.receptionistWeeklyBonus),
          workingDaysPerMonth: toNum(row.workingDaysPerMonth),
          referralIncentiveAmount: toNum(row.referralIncentiveAmount),
          weeklyAttendanceBonusAmount: toNum(row.weeklyAttendanceBonusAmount),
        }
      : {
          generalDoctorBaseDailyPay: 2000,
          generalDoctorDailyWorkHours: 7,
          generalDoctorDailyRevenueTarget: 20000,
          generalDoctorMonthlyRevenueTarget: 600000,
          generalDoctorMonthlyTargetCap: 100000,
          assistantMonthlyBasePay: 18000,
          assistantDailyWorkHours: 8,
          receptionistMonthlyBasePay: 15000,
          receptionistDailyWorkHours: 8,
          receptionistOvertimeRate: 1.5,
          receptionistWeeklyBonus: 0,
          workingDaysPerMonth: 26,
          referralIncentiveAmount: 1500,
          weeklyAttendanceBonusAmount: 500,
        };

    const staff = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.isActive, true),
          eq(users.primaryClinicId, clinicId),
          sql`${users.role} IN ('GENERAL_DOCTOR', 'CLINIC_ADMIN', 'ASSISTANT_DOCTOR', 'RECEPTIONIST')`
        )
      );

    let generatedCount = 0;

    for (const staffMember of staff) {
      const payrollId = `${staffMember.uid}_${clinicId}_${yearNum}_${monthStr}`;

      const entries = await db
        .select()
        .from(payrollEntries)
        .where(
          and(
            eq(payrollEntries.userId, staffMember.uid),
            eq(payrollEntries.clinicId, clinicId),
            sql`${payrollEntries.dateString} BETWEEN ${startDate} AND ${endDate}`
          )
        );

      const incentives = await db
        .select()
        .from(incentiveRecords)
        .where(
          and(
            eq(incentiveRecords.recipientUserId, staffMember.uid),
            eq(incentiveRecords.clinicId, clinicId),
            sql`${incentiveRecords.dateString} BETWEEN ${startDate} AND ${endDate}`
          )
        );

      const dailyEntries: DailyPayrollEntry[] = entries.map((e) => ({
        gdDailyEarning: toNum(e.gdDailyEarning),
        gdDailyRevenue: toNum(e.gdDailyRevenue),
        gdHoursWorked: toNum(e.gdHoursWorked),
        gdDailyTargetAchieved: e.gdDailyTargetAchieved ?? false,
        adDailyEarning: toNum(e.adDailyEarning),
        adHoursWorked: toNum(e.adHoursWorked),
        rcDailyEarning: toNum(e.rcDailyEarning),
        rcHoursWorked: toNum(e.rcHoursWorked),
        rcOvertimeHours: toNum(e.rcOvertimeHours),
        rcOvertimePay: toNum(e.rcOvertimePay),
        isSunday: e.isSunday ?? false,
      }));

      const incentiveList: Incentive[] = incentives.map((i) => ({
        type: i.type,
        amount: toNum(i.amount),
      }));

      const baseData = {
        payrollId,
        userId: staffMember.uid,
        userName: staffMember.name,
        userRole: staffMember.role,
        clinicId,
        month: String(monthNum),
        year: String(yearNum),
        status: 'DRAFT',
        generatedAt: new Date(),
        generatedBy: userId,
      };

      let summary: Record<string, unknown> = {};

      if (staffMember.role === 'GENERAL_DOCTOR' || staffMember.role === 'CLINIC_ADMIN') {
        const result = calcGDMonthlyPayroll(dailyEntries, incentiveList, settings);
        summary = {
          gdAccumulatedSalary: String(result.gdAccumulatedSalary),
          gdSundayEarning: String(result.gdSundayEarning),
          gdReferralIncentivesTotal: String(result.gdReferralIncentivesTotal),
          gdTotalMonthlyRevenue: String(result.gdTotalMonthlyRevenue),
          gdMonthlyTargetAchieved: result.gdMonthlyTargetAchieved,
          gdMonthlyTargetBonus: String(result.gdMonthlyTargetBonus),
          gdTotalFinalSalary: String(result.gdTotalFinalSalary),
          gdTotalDaysWorked: String(result.gdTotalDaysWorked),
          gdTargetDaysCount: String(result.gdTargetDaysCount),
        };
      } else if (staffMember.role === 'ASSISTANT_DOCTOR') {
        const result = calcADMonthlyPayroll(dailyEntries, incentiveList, settings);
        summary = {
          adRegularEarning: String(result.adRegularEarning),
          adSundayEarning: String(result.adSundayEarning),
          adWeeklyBonusesTotal: String(result.adWeeklyBonusesTotal),
          adSundayTaskIncentivesTotal: String(result.adSundayTaskIncentivesTotal),
          adTotalFinalSalary: String(result.adTotalFinalSalary),
          adTotalDaysWorked: String(result.adTotalDaysWorked),
        };
      } else if (staffMember.role === 'RECEPTIONIST') {
        const result = calcRCMonthlyPayroll(dailyEntries, incentiveList, settings);
        summary = {
          rcRegularEarning: String(result.rcRegularEarning),
          rcOvertimeEarning: String(result.rcOvertimeEarning),
          rcWeeklyBonusesTotal: String(result.rcWeeklyBonusesTotal),
          rcTotalFinalSalary: String(result.rcTotalFinalSalary),
          rcTotalDaysWorked: String(result.rcTotalDaysWorked),
        };
      }

      await db
        .insert(monthlyPayroll)
        .values({ ...baseData, ...summary })
        .onConflictDoUpdate({
          target: monthlyPayroll.payrollId,
          set: { ...baseData, ...summary },
        });

      generatedCount += 1;
    }

    return NextResponse.json({
      success: true,
      message: `Monthly payroll generated for ${monthNum}/${yearNum} (${generatedCount} staff)`,
    });
  } catch (error) {
    console.error('Generate Monthly Payroll Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate monthly payroll' },
      { status: 500 }
    );
  }
}