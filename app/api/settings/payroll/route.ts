import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { clinicSettings } from '@/lib/db/schema/clinicSettings';
import { isSuperAdmin } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

const DEFAULTS = {
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

export type PayrollSettingsValues = typeof DEFAULTS;

function toNum(value: string | null | undefined): number {
  const n = parseFloat(value ?? '');
  return isNaN(n) ? 0 : n;
}

function mapRow(row: typeof clinicSettings.$inferSelect): PayrollSettingsValues {
  return {
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
  };
}

function withDefaults(values: PayrollSettingsValues): PayrollSettingsValues {
  const result = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS) as (keyof PayrollSettingsValues)[]) {
    const value = values[key];
    if (typeof value === 'number' && !isNaN(value)) {
      result[key] = value;
    }
  }
  return result;
}

export async function GET(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isSuperAdmin(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get('clinicId');

  if (!clinicId) {
    return NextResponse.json({ error: 'Missing clinicId' }, { status: 400 });
  }

  try {
    const result = await db
      .select()
      .from(clinicSettings)
      .where(eq(clinicSettings.clinicId, clinicId))
      .limit(1);

    const settings = result[0] ? mapRow(result[0]) : DEFAULTS;

    return NextResponse.json({ settings: withDefaults(settings) });
  } catch (error) {
    console.error('Get Payroll Settings Error:', error);
    return NextResponse.json({ error: 'Failed to fetch payroll settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isSuperAdmin(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { clinicId } = body;

  if (!clinicId) {
    return NextResponse.json({ error: 'Missing clinicId' }, { status: 400 });
  }

  const allowZeroKeys = new Set([
    'receptionistOvertimeRate',
    'receptionistWeeklyBonus',
    'weeklyAttendanceBonusAmount',
  ]);

  const fields: Record<string, unknown> = {};
  for (const key of Object.keys(DEFAULTS) as (keyof PayrollSettingsValues)[]) {
    if (body[key] === undefined) {
      fields[key] = DEFAULTS[key];
      continue;
    }
    const value = Number(body[key]);
    if (typeof body[key] === 'string' && body[key].trim() === '') {
      fields[key] = DEFAULTS[key];
      continue;
    }
    if (isNaN(value) || value < 0) {
      return NextResponse.json(
        { error: `${key} must be a non-negative number` },
        { status: 400 }
      );
    }
    if (value <= 0 && !allowZeroKeys.has(key)) {
      return NextResponse.json(
        { error: `${key} must be a positive number` },
        { status: 400 }
      );
    }
    fields[key] = value;
  }

  for (const key of ['generalDoctorDailyWorkHours', 'assistantDailyWorkHours', 'receptionistDailyWorkHours'] as const) {
    if (typeof fields[key] === 'number' && (fields[key] < 1 || fields[key] > 24)) {
      return NextResponse.json({ error: `${key} must be between 1 and 24 hours` }, { status: 400 });
    }
  }

  try {
      await db
        .insert(clinicSettings)
        .values({
          clinicId,
          generalDoctorBaseDailyPay: String(fields.generalDoctorBaseDailyPay),
          generalDoctorDailyWorkHours: String(fields.generalDoctorDailyWorkHours),
          generalDoctorDailyRevenueTarget: String(fields.generalDoctorDailyRevenueTarget),
          generalDoctorMonthlyRevenueTarget: String(fields.generalDoctorMonthlyRevenueTarget),
          generalDoctorMonthlyTargetCap: String(fields.generalDoctorMonthlyTargetCap),
          assistantMonthlyBasePay: String(fields.assistantMonthlyBasePay),
          assistantDailyWorkHours: String(fields.assistantDailyWorkHours),
          receptionistMonthlyBasePay: String(fields.receptionistMonthlyBasePay),
          receptionistDailyWorkHours: String(fields.receptionistDailyWorkHours),
          receptionistOvertimeRate: String(fields.receptionistOvertimeRate),
          receptionistWeeklyBonus: String(fields.receptionistWeeklyBonus),
          workingDaysPerMonth: String(fields.workingDaysPerMonth),
          referralIncentiveAmount: String(fields.referralIncentiveAmount),
          weeklyAttendanceBonusAmount: String(fields.weeklyAttendanceBonusAmount),
        })
        .onConflictDoUpdate({
          target: clinicSettings.clinicId,
          set: {
            generalDoctorBaseDailyPay: String(fields.generalDoctorBaseDailyPay),
            generalDoctorDailyWorkHours: String(fields.generalDoctorDailyWorkHours),
            generalDoctorDailyRevenueTarget: String(fields.generalDoctorDailyRevenueTarget),
            generalDoctorMonthlyRevenueTarget: String(fields.generalDoctorMonthlyRevenueTarget),
            generalDoctorMonthlyTargetCap: String(fields.generalDoctorMonthlyTargetCap),
            assistantMonthlyBasePay: String(fields.assistantMonthlyBasePay),
            assistantDailyWorkHours: String(fields.assistantDailyWorkHours),
            receptionistMonthlyBasePay: String(fields.receptionistMonthlyBasePay),
            receptionistDailyWorkHours: String(fields.receptionistDailyWorkHours),
            receptionistOvertimeRate: String(fields.receptionistOvertimeRate),
            receptionistWeeklyBonus: String(fields.receptionistWeeklyBonus),
            workingDaysPerMonth: String(fields.workingDaysPerMonth),
            referralIncentiveAmount: String(fields.referralIncentiveAmount),
            weeklyAttendanceBonusAmount: String(fields.weeklyAttendanceBonusAmount),
          },
        });

    return NextResponse.json({
      success: true,
      message: 'Payroll settings updated',
      settings: withDefaults({
        generalDoctorBaseDailyPay: Number(fields.generalDoctorBaseDailyPay),
        generalDoctorDailyWorkHours: Number(fields.generalDoctorDailyWorkHours),
        generalDoctorDailyRevenueTarget: Number(fields.generalDoctorDailyRevenueTarget),
        generalDoctorMonthlyRevenueTarget: Number(fields.generalDoctorMonthlyRevenueTarget),
        generalDoctorMonthlyTargetCap: Number(fields.generalDoctorMonthlyTargetCap),
        assistantMonthlyBasePay: Number(fields.assistantMonthlyBasePay),
        assistantDailyWorkHours: Number(fields.assistantDailyWorkHours),
        receptionistMonthlyBasePay: Number(fields.receptionistMonthlyBasePay),
        receptionistDailyWorkHours: Number(fields.receptionistDailyWorkHours),
        receptionistOvertimeRate: Number(fields.receptionistOvertimeRate),
        receptionistWeeklyBonus: Number(fields.receptionistWeeklyBonus),
        workingDaysPerMonth: Number(fields.workingDaysPerMonth),
        referralIncentiveAmount: Number(fields.referralIncentiveAmount),
        weeklyAttendanceBonusAmount: Number(fields.weeklyAttendanceBonusAmount),
      }),
    });
  } catch (error) {
    console.error('Update Payroll Settings Error:', error);
    return NextResponse.json({ error: 'Failed to update payroll settings' }, { status: 500 });
  }
}
