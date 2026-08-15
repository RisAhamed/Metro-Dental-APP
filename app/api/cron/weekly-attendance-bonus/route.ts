import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema/users';
import { attendanceRecords } from '@/lib/db/schema/attendance';
import { incentiveRecords } from '@/lib/db/schema/incentiveRecords';
import { clinicSettings } from '@/lib/db/schema/clinicSettings';
import { eq, gte, lte, and } from 'drizzle-orm';
import { createIncentive } from '@/lib/payroll/incentives';
import { toISTDateString } from '@/lib/utils/attendance';

function getLastCompletedWeekIST(): { monday: Date; saturday: Date } {
  const now = new Date();
  const ist = new Date(
    now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  );
  const day = ist.getDay(); // 0 = Sunday

  let saturday: Date;
  if (day === 0) {
    saturday = new Date(ist);
    saturday.setDate(ist.getDate() - 1);
  } else {
    // days since Saturday (6)
    const diff = day === 6 ? 0 : day + 1;
    saturday = new Date(ist);
    saturday.setDate(ist.getDate() - diff);
  }

  const monday = new Date(saturday);
  monday.setDate(saturday.getDate() - 5);

  return { monday, saturday };
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_JOB_SECRET;
  if (secret) {
    const header = req.headers.get('authorization');
    const expected = `Bearer ${secret}`;
    if (header !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const { monday, saturday } = getLastCompletedWeekIST();
    const mondayStr = toISTDateString(monday);
    const saturdayStr = toISTDateString(saturday);

    const assistants = await db
      .select()
      .from(users)
      .where(and(eq(users.role, 'ASSISTANT_DOCTOR'), eq(users.isActive, true)));

    const settingsResult = await db
      .select()
      .from(clinicSettings);

    const settingsByClinic = new Map<string, number>();
    for (const row of settingsResult) {
      settingsByClinic.set(row.clinicId, Number(row.assistantDailyWorkHours) || 8);
    }

    let credited = 0;

    for (const assistant of assistants) {
      const clinicId = assistant.primaryClinicId;
      if (!clinicId) continue;

      const attendance = await db
        .select()
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.userId, assistant.uid),
            eq(attendanceRecords.clinicId, clinicId),
            gte(attendanceRecords.dateString, mondayStr),
            lte(attendanceRecords.dateString, saturdayStr)
          )
        );

      const requiredHours = settingsByClinic.get(clinicId) ?? 8;

      const presentDays = attendance.filter(
        (a) => a.status === 'PRESENT' && Number(a.hoursWorked) >= requiredHours
      );

      // Full week = Mon, Tue, Wed, Thu, Fri, Sat present with full hours
      if (presentDays.length < 6) continue;

      // Avoid double-crediting for the same week
      const alreadyCredited = await db
        .select({ incentiveId: incentiveRecords.incentiveId })
        .from(incentiveRecords)
        .where(
          and(
            eq(incentiveRecords.recipientUserId, assistant.uid),
            eq(incentiveRecords.clinicId, clinicId),
            eq(incentiveRecords.type, 'WEEKLY_ATTENDANCE_500'),
            eq(incentiveRecords.weekStartDate, mondayStr)
          )
        )
        .limit(1);

      if (alreadyCredited.length > 0) continue;

      const incentiveDate = new Date(
        saturday.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
      );

      await createIncentive({
        recipientUserId: assistant.uid,
        clinicId,
        type: 'WEEKLY_ATTENDANCE_500',
        amount: 500,
        date: incentiveDate,
        createdBy: 'system',
        weekStartDate: mondayStr,
        weekEndDate: saturdayStr,
        description: `Full attendance ${mondayStr} to ${saturdayStr}`,
        notifTitle: 'Weekly Attendance Bonus',
        notifMessage: '₹500 weekly attendance bonus added!',
      });

      credited += 1;
    }

    return NextResponse.json({
      success: true,
      week: `${mondayStr} to ${saturdayStr}`,
      credited,
    });
  } catch (error) {
    console.error('Weekly Attendance Bonus Error:', error);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}