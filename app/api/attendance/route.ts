import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { attendanceRecords } from '@/lib/db/schema/attendance';
import { users } from '@/lib/db/schema/users';
import { isHREligible } from '@/lib/auth/claims';
import { eq, desc, and } from 'drizzle-orm';
import { toISTDateString, hoursBetweenIST } from '@/lib/utils/attendance';

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  const role = sessionClaims?.role;
  if (!isHREligible(sessionClaims) && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const dateString = searchParams.get('dateString');
  const clinicId = searchParams.get('clinicId');
  const userId = searchParams.get('userId');

  try {
    const conditions = [];
    if (dateString) conditions.push(eq(attendanceRecords.dateString, dateString));
    if (clinicId) conditions.push(eq(attendanceRecords.clinicId, clinicId));
    if (userId) conditions.push(eq(attendanceRecords.userId, userId));

    const results = await db
      .select()
      .from(attendanceRecords)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(attendanceRecords.date));

    return NextResponse.json({ records: results });
  } catch (error) {
    console.error('Get Attendance Error:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  const role = sessionClaims?.role;
  if ((!isHREligible(sessionClaims) && role !== 'SUPER_ADMIN') || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { action, clinicId, targetUserId } = body;
  if (!clinicId) {
    return NextResponse.json({ error: 'Missing clinicId' }, { status: 400 });
  }
  if (action !== 'clock-in' && action !== 'clock-out') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  try {
    // Receptionist/admin can mark for others; everyone can mark themselves
    const subjectId = targetUserId || userId;
    const now = new Date();
    const dateString = toISTDateString(now);

    const userSnap = await db
      .select({ name: users.name, role: users.role })
      .from(users)
      .where(eq(users.uid, subjectId))
      .limit(1);

    if (userSnap.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userName = userSnap[0].name;
    const userRole = userSnap[0].role;

    const recordId = `${subjectId}_${clinicId}_${dateString}`;
    const existing = await db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.recordId, recordId))
      .limit(1);

    if (action === 'clock-in') {
      if (existing.length > 0 && existing[0].clockIn) {
        return NextResponse.json(
          { error: 'Already clocked in for today' },
          { status: 409 }
        );
      }
      await db
        .insert(attendanceRecords)
        .values({
          recordId,
          userId: subjectId,
          userName,
          userRole,
          clinicId,
          date: now,
          dateString,
          clockIn: now,
          status: 'PRESENT',
          recordedBy: userId,
          updatedBy: userId,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: attendanceRecords.recordId,
          set: {
            clockIn: now,
            status: 'PRESENT',
            updatedAt: now,
            updatedBy: userId,
          },
        });

      return NextResponse.json({ success: true, action: 'clock-in', recordId, dateString });
    }

    // Clock-out
    if (existing.length === 0 || !existing[0].clockIn) {
      return NextResponse.json(
        { error: 'No clock-in found for today' },
        { status: 400 }
      );
    }

    const clockIn = existing[0].clockIn as Date;
    const hoursWorked = hoursBetweenIST(clockIn, now);
    const status = hoursWorked >= 4 ? 'PRESENT' : 'HALF_DAY';

    await db
      .update(attendanceRecords)
      .set({
        clockOut: now,
        hoursWorked: String(hoursWorked),
        status,
        updatedAt: now,
        updatedBy: userId,
      })
      .where(eq(attendanceRecords.recordId, recordId));

    return NextResponse.json({
      success: true,
      action: 'clock-out',
      recordId,
      hoursWorked,
      status,
    });
  } catch (error) {
    console.error('Attendance Clock Error:', error);
    return NextResponse.json({ error: 'Failed to update attendance' }, { status: 500 });
  }
}
