import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { payrollEntries } from '@/lib/db/schema/payrollEntries';
import { users } from '@/lib/db/schema/users';
import { attendanceRecords } from '@/lib/db/schema/attendance';
import { clinicSettings } from '@/lib/db/schema/clinicSettings';
import { isStaff } from '@/lib/auth/claims';
import { eq, and } from 'drizzle-orm';
import { calcGDDayEarning } from '@/lib/payroll/doctorPayroll';
import { calcADDayEarning } from '@/lib/payroll/assistantPayroll';
import { toISTDateString } from '@/lib/utils/attendance';
import type { PayrollSettings } from '@/lib/payroll/doctorPayroll';

function toNum(value: string | null | undefined): number {
  const n = parseFloat(value ?? '0');
  return isNaN(n) ? 0 : n;
}

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isStaff(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { userId: targetUserId, clinicId, date, dailyRevenue } = body;

  if (!targetUserId || !clinicId || !date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const dateObj = new Date(date);
  const dateString = toISTDateString(dateObj);
  const entryId = `${targetUserId}_${clinicId}_${dateString}`;

  try {
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.uid, targetUserId))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult[0];

    const attendanceResult = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.userId, targetUserId),
          eq(attendanceRecords.clinicId, clinicId),
          eq(attendanceRecords.dateString, dateString)
        )
      )
      .limit(1);

    const attendance = attendanceResult[0];

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
          workingDaysPerMonth: 26,
          referralIncentiveAmount: 1500,
          weeklyAttendanceBonusAmount: 500,
        };

    const hoursWorked = attendance ? toNum(attendance.hoursWorked) : 0;
    const revenue = toNum(dailyRevenue);
    const isSunday = dateObj.getDay() === 0;

    let dailyEarning = 0;
    const baseData = {
      entryId,
      userId: targetUserId,
      userName: user.name,
      userRole: user.role,
      clinicId,
      date: dateObj,
      dateString,
      isSunday,
      totalDayEarning: '0',
      updatedAt: new Date(),
    };

    let gdData: Record<string, unknown> = {};
    let adData: Record<string, unknown> = {};

    if (user.role === 'GENERAL_DOCTOR' || user.role === 'CLINIC_ADMIN') {
      const result = calcGDDayEarning({
        hoursWorked,
        dailyRevenue: revenue,
        date: dateObj,
        settings,
      });
      dailyEarning = result.earning;
      gdData = {
        gdHoursWorked: String(hoursWorked),
        gdDailyRevenue: String(revenue),
        gdDailyEarning: String(result.earning),
        gdDailyTargetAchieved: result.dailyTargetAchieved,
        gdMultiplier: String(result.multiplier),
        gdReferralIncentive: '0',
        gdReferralCount: '0',
      };
    } else if (user.role === 'ASSISTANT_DOCTOR') {
      const result = calcADDayEarning({
        hoursWorked,
        date: dateObj,
        settings,
      });
      dailyEarning = result.earning;
      adData = {
        adHoursWorked: String(hoursWorked),
        adDailyEarning: String(result.earning),
        adIsDeducted: result.isDeducted,
        adSundayIncentives: '0',
        adSundayTasksCount: '0',
      };
    }

    const values = {
      ...baseData,
      ...gdData,
      ...adData,
      totalDayEarning: String(dailyEarning),
    };

    await db
      .insert(payrollEntries)
      .values(values)
      .onConflictDoUpdate({
        target: payrollEntries.entryId,
        set: { ...values, updatedAt: new Date() },
      });

    return NextResponse.json({
      success: true,
      entryId,
      dailyEarning,
      hoursWorked,
    });
  } catch (error) {
    console.error('Calculate Daily Payroll Error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate daily payroll' },
      { status: 500 }
    );
  }
}