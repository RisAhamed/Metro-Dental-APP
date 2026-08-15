import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { attendanceCorrections } from '@/lib/db/schema/attendanceCorrections';
import { attendanceRecords } from '@/lib/db/schema/attendance';
import { users } from '@/lib/db/schema/users';
import { eq, desc, and, sql } from 'drizzle-orm';
import { notifyUser } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!sessionClaims || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get('clinicId');
  const mine = searchParams.get('mine') === 'true';
  const role = sessionClaims?.role as string;
  const isAdmin = role === 'CLINIC_ADMIN' || role === 'SUPER_ADMIN';

  try {
    const conditions = [];
    if (clinicId) conditions.push(eq(attendanceCorrections.clinicId, clinicId));
    if (mine) conditions.push(eq(attendanceCorrections.requestedBy, userId));

    const results = await db
      .select()
      .from(attendanceCorrections)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(attendanceCorrections.createdAt));

    return NextResponse.json({ corrections: results, isAdmin });
  } catch (error) {
    console.error('Get Corrections Error:', error);
    return NextResponse.json({ error: 'Failed to fetch corrections' }, { status: 500 });
  }
}

type CorrectionType = 'MISSED_CLOCK_IN' | 'MISSED_CLOCK_OUT' | 'WRONG_TIME' | 'OTHER';

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!sessionClaims || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const {
    attendanceRecordId,
    clinicId,
    dateString,
    requestType,
    requestedClockIn,
    requestedClockOut,
    reason,
  } = body;

  if (!attendanceRecordId || !clinicId || !dateString || !requestType || !reason) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  try {
    let record = (
      await db
        .select()
        .from(attendanceRecords)
        .where(eq(attendanceRecords.recordId, attendanceRecordId))
        .limit(1)
    )[0];

    // Auto-create an ABSENT record for the date if none exists yet
    if (!record) {
      const userSnap = await db
        .select({ name: users.name, role: users.role })
        .from(users)
        .where(eq(users.uid, userId))
        .limit(1);
      if (userSnap.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      await db
        .insert(attendanceRecords)
        .values({
          recordId: attendanceRecordId,
          userId,
          userName: userSnap[0].name,
          userRole: userSnap[0].role,
          clinicId,
          date: new Date(dateString),
          dateString,
          status: 'ABSENT',
          recordedBy: userId,
          updatedBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing();

      record = (
        await db
          .select()
          .from(attendanceRecords)
          .where(eq(attendanceRecords.recordId, attendanceRecordId))
          .limit(1)
      )[0];
    }

    const userSnap = await db
      .select({ name: users.name, role: users.role })
      .from(users)
      .where(eq(users.uid, userId))
      .limit(1);
    const userName = userSnap[0]?.name || 'Staff';
    const userRole = userSnap[0]?.role || 'STAFF';

    // Generate correction ID
    const counterResult = await db.execute(
      sql`INSERT INTO counters (key, value) VALUES ('attendance_corrections', 1)
          ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
          RETURNING value`
    );
    const next = Number(counterResult[0]?.value ?? 1);
    const correctionId = `AC-${String(next).padStart(5, '0')}`;

    await db.insert(attendanceCorrections).values({
      correctionId,
      attendanceRecordId,
      requestedBy: userId,
      requestedByName: userName,
      requesterRole: userRole,
      clinicId,
      date: new Date(dateString),
      dateString,
      requestType: requestType as CorrectionType,
      originalClockIn: record.clockIn,
      originalClockOut: record.clockOut,
      requestedClockIn: requestedClockIn ? new Date(requestedClockIn) : null,
      requestedClockOut: requestedClockOut ? new Date(requestedClockOut) : null,
      reason,
      status: 'PENDING',
      createdAt: new Date(),
    });

    await db
      .update(attendanceRecords)
      .set({ hasCorrectionRequest: true, correctionRequestId: correctionId })
      .where(eq(attendanceRecords.recordId, attendanceRecordId));

    return NextResponse.json({ success: true, correctionId });
  } catch (error) {
    console.error('Create Correction Error:', error);
    return NextResponse.json({ error: 'Failed to submit correction' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const role = sessionClaims?.role as string;
  const isAdmin = role === 'CLINIC_ADMIN' || role === 'SUPER_ADMIN';
  if (!isAdmin) {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  }

  const body = await req.json();
  const { correctionId, action, reviewNotes } = body;
  if (action !== 'APPROVED' && action !== 'REJECTED') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  try {
    const correction = (
      await db
        .select()
        .from(attendanceCorrections)
        .where(eq(attendanceCorrections.correctionId, correctionId))
        .limit(1)
    )[0];

    if (!correction) {
      return NextResponse.json({ error: 'Correction not found' }, { status: 404 });
    }
    if (correction.status !== 'PENDING') {
      return NextResponse.json({ error: 'Correction already reviewed' }, { status: 409 });
    }

    // Rule: Clinic Admin approves staff requests; Super Admin approves Admin requests
    const requesterIsAdmin =
      correction.requesterRole === 'CLINIC_ADMIN' || correction.requesterRole === 'SUPER_ADMIN';
    if (requesterIsAdmin && role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only Super Admin can review admin correction requests' },
        { status: 403 }
      );
    }

    const reviewer = (
      await db.select({ name: users.name }).from(users).where(eq(users.uid, userId)).limit(1)
    )[0];

    await db
      .update(attendanceCorrections)
      .set({
        status: action,
        reviewedBy: userId,
        reviewedByName: reviewer?.name || null,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      })
      .where(eq(attendanceCorrections.correctionId, correctionId));

    // Apply approved correction to the attendance record
    if (action === 'APPROVED') {
      const updates: Record<string, unknown> = {};
      if (correction.requestedClockIn) updates.clockIn = new Date(correction.requestedClockIn);
      if (correction.requestedClockOut) updates.clockOut = new Date(correction.requestedClockOut);
      if (correction.requestedClockIn && correction.requestedClockOut) {
        const { hoursBetweenIST } = await import('@/lib/utils/attendance');
        const hours = hoursBetweenIST(
          new Date(correction.requestedClockIn),
          new Date(correction.requestedClockOut)
        );
        updates.hoursWorked = String(hours);
      }
      updates.updatedAt = new Date();
      updates.updatedBy = userId;

      await db
        .update(attendanceRecords)
        .set(updates)
        .where(eq(attendanceRecords.recordId, correction.attendanceRecordId));
    }

    await notifyUser({
      userId: correction.requestedBy,
      type: 'CORRECTION_UPDATE',
      title: `Correction ${action.toLowerCase()}`,
      message: `Your attendance correction request (${correctionId}) was ${action.toLowerCase()} by ${reviewer?.name || 'Admin'}`,
      link: '/hr/corrections',
      clinicId: correction.clinicId,
    });

    return NextResponse.json({ success: true, status: action });
  } catch (error) {
    console.error('Review Correction Error:', error);
    return NextResponse.json({ error: 'Failed to review correction' }, { status: 500 });
  }
}