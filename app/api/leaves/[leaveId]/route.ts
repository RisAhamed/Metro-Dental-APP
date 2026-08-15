import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { leaves } from '@/lib/db/schema/leaves';
import { attendanceRecords } from '@/lib/db/schema/attendance';
import { users } from '@/lib/db/schema/users';
import { eq } from 'drizzle-orm';
import { toISTDateString } from '@/lib/utils/attendance';
import { notifyUser } from '@/lib/notifications';

type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leaveId: string }> }
) {
  const { sessionClaims, userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const role = sessionClaims?.role as string;
  const isClinicAdmin = role === 'CLINIC_ADMIN';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  if (!isClinicAdmin && !isSuperAdmin) {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  }

  const { leaveId } = await params;
  const body = await req.json();
  const { action, reviewNotes } = body;
  if (action !== 'APPROVED' && action !== 'REJECTED') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  try {
    const leave = (
      await db.select().from(leaves).where(eq(leaves.leaveId, leaveId)).limit(1)
    )[0];

    if (!leave) {
      return NextResponse.json({ error: 'Leave not found' }, { status: 404 });
    }
    if (leave.status !== 'PENDING') {
      return NextResponse.json({ error: 'Leave already reviewed' }, { status: 409 });
    }

    // Rule: Clinic Admin approves staff requests; Super Admin approves Admin/any requests
    const requesterIsAdmin =
      leave.requesterRole === 'CLINIC_ADMIN' || leave.requesterRole === 'SUPER_ADMIN';
    if (requesterIsAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Only Super Admin can review admin leave requests' },
        { status: 403 }
      );
    }

    const reviewer = (
      await db.select({ name: users.name }).from(users).where(eq(users.uid, userId)).limit(1)
    )[0];

    await db
      .update(leaves)
      .set({
        status: action as LeaveStatus,
        reviewedBy: userId,
        reviewedByName: reviewer?.name || null,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      })
      .where(eq(leaves.leaveId, leaveId));

    // Approved leave auto-creates attendance records as ON_LEAVE
    if (action === 'APPROVED') {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const days: string[] = [];
      const cursor = new Date(start);
      while (cursor <= end) {
        const ds = toISTDateString(cursor);
        if (!days.includes(ds)) days.push(ds);
        cursor.setDate(cursor.getDate() + 1);
      }

      for (const ds of days) {
        const recordId = `${leave.userId}_${leave.clinicId}_${ds}`;
        await db
          .insert(attendanceRecords)
          .values({
            recordId,
            userId: leave.userId,
            userName: leave.userName,
            userRole: leave.userRole,
            clinicId: leave.clinicId,
            date: new Date(ds),
            dateString: ds,
            status: 'ON_LEAVE',
            recordedBy: userId,
            updatedBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoNothing();
      }
    }

    await notifyUser({
      userId: leave.userId,
      type: 'LEAVE_UPDATE',
      title: `Leave ${action.toLowerCase()}`,
      message: `Your ${leave.leaveType} request (${leave.leaveId}) was ${action.toLowerCase()} by ${reviewer?.name || 'Admin'}`,
      link: '/hr/leaves',
      clinicId: leave.clinicId,
    });

    return NextResponse.json({ success: true, status: action });
  } catch (error) {
    console.error('Review Leave Error:', error);
    return NextResponse.json({ error: 'Failed to review leave' }, { status: 500 });
  }
}