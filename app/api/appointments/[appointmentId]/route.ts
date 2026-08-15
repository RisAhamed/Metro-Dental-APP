import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { appointments, apptStatusEnum } from '@/lib/db/schema/appointments';
import { isStaff, isSuperAdmin } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';
import { createIncentive } from '@/lib/payroll/incentives';
import { users } from '@/lib/db/schema/users';
import { logActivity } from '@/lib/activity';

const REFERRAL_MIN_REVENUE = 20000;

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
    const existingResult = await db
      .select()
      .from(appointments)
      .where(eq(appointments.appointmentId, appointmentId))
      .limit(1);

    if (existingResult.length === 0) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const existing = existingResult[0];

    const updateFields: Record<string, unknown> = {
      status: status || undefined,
      notes: notes || null,
      updatedBy: userId,
      updatedAt: new Date(),
    };

    // Allow surgery/referral metadata to be set (chief doctor workflow)
    if (body.surgeryTypeId !== undefined) updateFields.surgeryTypeId = body.surgeryTypeId || null;
    if (body.surgeryTypeName !== undefined) updateFields.surgeryTypeName = body.surgeryTypeName || null;
    if (body.referredById !== undefined) updateFields.referredById = body.referredById || null;
    if (body.referredByName !== undefined) updateFields.referredByName = body.referredByName || null;
    if (body.isReferral !== undefined) updateFields.isReferral = Boolean(body.isReferral);
    if (body.chiefDoctorRevenue !== undefined) {
      updateFields.chiefDoctorRevenue = body.chiefDoctorRevenue === null
        ? null
        : String(body.chiefDoctorRevenue);
    }

    await db
      .update(appointments)
      .set(updateFields)
      .where(eq(appointments.appointmentId, appointmentId));

    // Log check-in / completion activity
    if (status === 'IN_PROGRESS' || status === 'COMPLETED') {
      const userSnap = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.uid, userId))
        .limit(1);
      const actorName = userSnap[0]?.name || 'Staff';

      if (status === 'IN_PROGRESS') {
        await logActivity({
          clinicId: existing.clinicId,
          type: 'PATIENT_CHECKIN',
          message: `${existing.patientName} checked in for appointment ${appointmentId}`,
          userId,
          userName: actorName,
          userRole: (sessionClaims?.role as string) || undefined,
          relatedEntityType: 'appointment',
          relatedEntityId: appointmentId,
          metadata: { patientId: existing.patientId },
        });
      } else if (status === 'COMPLETED') {
        await logActivity({
          clinicId: existing.clinicId,
          type: 'APPOINTMENT_COMPLETED',
          message: `Appointment for ${existing.patientName} completed with ${existing.doctorName}`,
          userId,
          userName: actorName,
          userRole: (sessionClaims?.role as string) || undefined,
          relatedEntityType: 'appointment',
          relatedEntityId: appointmentId,
          metadata: { patientId: existing.patientId },
        });
      }
    }

    const newStatus = status || existing.status;
    const newRevenue =
      body.chiefDoctorRevenue !== undefined
        ? body.chiefDoctorRevenue === null
          ? null
          : Number(body.chiefDoctorRevenue)
        : existing.chiefDoctorRevenue
        ? Number(existing.chiefDoctorRevenue)
        : null;

    const isReferral = body.isReferral !== undefined ? Boolean(body.isReferral) : existing.isReferral;
    const referredById = body.referredById !== undefined ? (body.referredById || null) : existing.referredById;

    // Referral incentive trigger:
    // COMPLETED + referral flag + referring doctor set + SUPER_ADMIN completes + revenue >= 20000
    const shouldCreditReferral =
      newStatus === 'COMPLETED' &&
      isReferral &&
      !!referredById &&
      isSuperAdmin(sessionClaims) &&
      newRevenue !== null &&
      newRevenue >= REFERRAL_MIN_REVENUE;

    if (shouldCreditReferral) {
      const patientId = existing.patientId;
      const patientName = existing.patientName;
      const surgeryTypeId = body.surgeryTypeId ?? existing.surgeryTypeId ?? null;
      const surgeryTypeName = body.surgeryTypeName ?? existing.surgeryTypeName ?? null;

      await createIncentive({
        recipientUserId: referredById,
        clinicId: existing.clinicId,
        type: 'REFERRAL_1500',
        amount: 1500,
        date: new Date(existing.appointmentDate),
        createdBy: userId,
        referredPatientId: patientId,
        referredPatientName: patientName,
        surgeryTypeId: surgeryTypeId || undefined,
        surgeryTypeName: surgeryTypeName || undefined,
        chiefDoctorRevenue: newRevenue ?? undefined,
        description: `Referral: ${patientName}${surgeryTypeName ? ` (${surgeryTypeName})` : ''} completed with revenue ₹${newRevenue.toLocaleString('en-IN')}`,
        notifTitle: 'Referral Incentive',
        notifMessage: `₹1,500 referral incentive credited for patient ${patientName}`,
      });
    }

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