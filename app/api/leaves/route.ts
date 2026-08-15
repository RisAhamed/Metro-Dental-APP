import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { leaves } from '@/lib/db/schema/leaves';
import { users } from '@/lib/db/schema/users';
import { isStaff } from '@/lib/auth/claims';
import { eq, desc, and, or, arrayContains, sql } from 'drizzle-orm';
import { notifyUser } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isStaff(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get('clinicId');
  const mine = searchParams.get('mine') === 'true';
  const status = searchParams.get('status');

  try {
    const conditions = [];
    if (clinicId) conditions.push(eq(leaves.clinicId, clinicId));
    if (mine) conditions.push(eq(leaves.userId, userId));
    if (status) conditions.push(eq(leaves.status, status as LeaveStatus));

    const results = await db
      .select()
      .from(leaves)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(leaves.appliedAt));

    return NextResponse.json({ leaves: results });
  } catch (error) {
    console.error('Get Leaves Error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaves' }, { status: 500 });
  }
}

type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
type LeaveType = 'FULL_DAY' | 'HALF_DAY' | 'EMERGENCY' | 'SICK' | 'PERMISSION';
type HalfDaySlot = 'MORNING' | 'AFTERNOON';

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isStaff(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const {
    clinicId,
    leaveType,
    startDate,
    endDate,
    halfDaySlot,
    reason,
  } = body;

  if (!clinicId || !leaveType || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'Missing required fields: clinicId, leaveType, startDate, endDate' },
      { status: 400 }
    );
  }

  try {
    // Resolve user details
    const userSnap = await db
      .select({ name: users.name, role: users.role })
      .from(users)
      .where(eq(users.uid, userId))
      .limit(1);
    const userName = userSnap[0]?.name || 'Staff';
    const userRole = userSnap[0]?.role || 'STAFF';

    const start = new Date(startDate);
    const end = new Date(endDate);
    let totalDays: number;

    const sameDayMonths = (end.getTime() - start.getTime());
    if ((leaveType as LeaveType) === 'HALF_DAY') {
      totalDays = 0.5;
    } else {
      totalDays = Math.round((sameDayMonths / (1000 * 60 * 60 * 24)) + 1);
    }

    // Generate leave ID
    const counterResult = await db.execute(
      sql`INSERT INTO counters (key, value) VALUES ('leaves', 1)
          ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
          RETURNING value`
    );
    const next = Number(counterResult[0]?.value ?? 1);
    const leaveId = `LV-${String(next).padStart(5, '0')}`;

    await db.insert(leaves).values({
      leaveId,
      userId,
      userName,
      userRole,
      requesterRole: userRole,
      clinicId,
      leaveType: leaveType as LeaveType,
      startDate: start,
      endDate: end,
      totalDays: String(totalDays),
      halfDaySlot: (halfDaySlot as HalfDaySlot) || null,
      reason: reason || null,
      status: 'PENDING',
      appliedAt: new Date(),
    });

    // Notify clinic admins about the new request
    const clinicAdmins = await db
      .select({ uid: users.uid })
      .from(users)
      .where(
        and(
          or(eq(users.primaryClinicId, clinicId), arrayContains(users.clinicIds, [clinicId])),
          sql`${users.role} IN ('SUPER_ADMIN', 'CLINIC_ADMIN')`
        )
      );

    for (const admin of clinicAdmins) {
      await notifyUser({
        userId: admin.uid,
        type: 'LEAVE_REQUEST',
        title: 'New Leave Request',
        message: `${userName} applied for ${leaveType} (${start.toDateString()} to ${end.toDateString()})`,
        link: '/hr/leaves/review',
        clinicId,
      });
    }

    return NextResponse.json({ success: true, leaveId });
  } catch (error) {
    console.error('Apply Leave Error:', error);
    return NextResponse.json({ error: 'Failed to apply for leave' }, { status: 500 });
  }
}