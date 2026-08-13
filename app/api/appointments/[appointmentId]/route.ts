import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { appointments, apptStatusEnum } from '@/lib/db/schema/appointments';
import { isStaff } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const { sessionClaims, userId } = await auth();
  if (!isStaff(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { appointmentId } = await params;
  const body = await req.json();
  const { status, notes } = body;

  if (status && !apptStatusEnum.enumValues.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  try {
    await db
      .update(appointments)
      .set({
        status: status || undefined,
        notes: notes || null,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(appointments.appointmentId, appointmentId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update Appointment Error:', error);
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    );
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const { sessionClaims } = await auth();
  if (!isStaff(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { appointmentId } = await params;

  try {
    const result = await db
      .select()
      .from(appointments)
      .where(eq(appointments.appointmentId, appointmentId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    return NextResponse.json({ appointment: result[0] });
  } catch (error) {
    console.error('Get Appointment Error:', error);
    return NextResponse.json({ error: 'Failed to fetch appointment' }, { status: 500 });
  }
}