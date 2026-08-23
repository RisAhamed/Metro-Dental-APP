import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { appointments, apptStatusEnum } from '@/lib/db/schema/appointments';
import { isStaff } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';
import { logActivity } from '@/lib/activity';
import { users } from '@/lib/db/schema/users';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const { sessionClaims, userId } = await auth();
  if (!isStaff(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { appointmentId } = await params;
  const body = await req.json();
  const { status } = body;

  if (!status || !apptStatusEnum.enumValues.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${apptStatusEnum.enumValues.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const existingResult = await db
      .select()
      .from(appointments)
      .where(eq(appointments.appointmentId, appointmentId))
      .limit(1);

    if (existingResult.length === 0) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const existing = existingResult[0];

    await db
      .update(appointments)
      .set({ status, updatedAt: new Date(), updatedBy: userId })
      .where(eq(appointments.appointmentId, appointmentId));

    if (status === 'IN_PROGRESS' || status === 'COMPLETED' || status === 'NO_SHOW') {
      const userSnap = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.uid, userId))
        .limit(1);
      const actorName = userSnap[0]?.name || 'Staff';

      const messages: Record<string, string> = {
        IN_PROGRESS: `${existing.patientName} checked in for appointment ${appointmentId}`,
        COMPLETED: `Appointment for ${existing.patientName} completed with ${existing.doctorName}`,
        NO_SHOW: `${existing.patientName} marked as no-show for appointment ${appointmentId}`,
      };
      const types: Record<string, 'PATIENT_CHECKIN' | 'APPOINTMENT_COMPLETED' | 'APPOINTMENT_NO_SHOW'> = {
        IN_PROGRESS: 'PATIENT_CHECKIN',
        COMPLETED: 'APPOINTMENT_COMPLETED',
        NO_SHOW: 'APPOINTMENT_NO_SHOW',
      };

      await logActivity({
        clinicId: existing.clinicId,
        type: types[status],
        message: messages[status],
        userId,
        userName: actorName,
        userRole: (sessionClaims?.role as string) || undefined,
        relatedEntityType: 'appointment',
        relatedEntityId: appointmentId,
        metadata: { patientId: existing.patientId },
      });
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('Update Appointment Status Error:', error);
    return NextResponse.json({ error: 'Failed to update appointment status' }, { status: 500 });
  }
}
