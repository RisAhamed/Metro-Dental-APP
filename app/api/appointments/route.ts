import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { appointments } from '@/lib/db/schema/appointments';
import { appointmentSlots } from '@/lib/db/schema/appointmentSlots';
import { isStaff } from '@/lib/auth/claims';
import { eq, and, between, inArray, sql } from 'drizzle-orm';
import { slotKey } from '@/lib/utils/slotKey';

const ACTIVE_STATUSES = ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] as const;

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!isStaff(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get('clinicId');
  const doctorId = searchParams.get('doctorId');
  const patientId = searchParams.get('patientId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!clinicId || !startDate || !endDate) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 });
  }

  try {
    const start = new Date(startDate);
    // End of requested day (inclusive)
    const endExclusive = new Date(new Date(endDate).setHours(23, 59, 59, 999));

    const conditions = [
      eq(appointments.clinicId, clinicId),
      between(appointments.appointmentDate, start, endExclusive),
    ];

    if (patientId) {
      conditions.push(eq(appointments.patientId, patientId));
    }

    if (doctorId && doctorId !== 'all') {
      conditions.push(eq(appointments.doctorId, doctorId));
    }

    // Show all active statuses so calendar stays meaningful
    conditions.push(inArray(appointments.status, [...ACTIVE_STATUSES]));

    const results = await db
      .select()
      .from(appointments)
      .where(and(...conditions))
      .orderBy(appointments.appointmentDate);

    return NextResponse.json({ appointments: results });
  } catch (error) {
    console.error('Get Appointments Error:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isStaff(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const {
    patientId, patientName, clinicId, doctorId, doctorName,
    appointmentDate, durationMinutes, categoryId, categoryName,
    categoryColor, isWalkIn, tokenNumber, abhaId,
    plannedProcedures, notes,
    surgeryTypeId, surgeryTypeName, referredById, referredByName, isReferral,
  } = body;

  if (!patientId || !doctorId || !appointmentDate || !clinicId || !patientName) {
    return NextResponse.json(
      { error: 'Missing required fields: patientId, patientName, doctorId, appointmentDate, clinicId' },
      { status: 400 }
    );
  }

  const apptDate = new Date(appointmentDate);

  try {
    // Auto-generate token number for walk-ins (per day, per clinic)
    let finalTokenNumber = tokenNumber || null;
    if (isWalkIn && !finalTokenNumber) {
      const dayStart = new Date(apptDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const todaysTokens = await db
        .select({ tokenNumber: appointments.tokenNumber })
        .from(appointments)
        .where(
          and(
            eq(appointments.clinicId, clinicId),
            between(appointments.appointmentDate, dayStart, dayEnd)
          )
        );

      const usedNumbers = todaysTokens
        .map((t) => t.tokenNumber)
        .filter((t): t is string => !!t)
        .map((t) => parseInt(t.replace(/^T-?/i, ''), 10))
        .filter((n) => !isNaN(n));

      const nextToken = (usedNumbers.length > 0 ? Math.max(...usedNumbers) : 0) + 1;
      finalTokenNumber = `T-${String(nextToken).padStart(3, '0')}`;
    }

    // Generate slot key
    const key = slotKey(doctorId, apptDate);

    // Use transaction to prevent double-booking
    const result = await db.transaction(async (tx) => {
      // Check if slot is taken
      const existingSlot = await tx
        .select()
        .from(appointmentSlots)
        .where(eq(appointmentSlots.slotKey, key))
        .limit(1);

      if (existingSlot.length > 0) {
        throw new Error('SLOT_TAKEN');
      }

      // Generate appointment ID
      const counterResult = await tx.execute(
        sql`INSERT INTO counters (key, value) VALUES ('appointments', 1)
            ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
            RETURNING value`
      );
      const next = Number(counterResult[0]?.value ?? 1);
      const appointmentId = `APT-${String(next).padStart(5, '0')}`;

      // Create appointment
      await tx.insert(appointments).values({
        appointmentId,
        patientId,
        patientName,
        clinicId,
        doctorId,
        doctorName,
        appointmentDate: apptDate,
        durationMinutes: durationMinutes || 30,
        categoryId: categoryId || null,
        categoryName: categoryName || null,
        categoryColor: categoryColor || null,
        status: isWalkIn ? 'CONFIRMED' : 'SCHEDULED',
        isWalkIn: isWalkIn || false,
        tokenNumber: finalTokenNumber,
        abhaId: abhaId || null,
        plannedProcedures: plannedProcedures || null,
        notes: notes || null,
        surgeryTypeId: surgeryTypeId || null,
        surgeryTypeName: surgeryTypeName || null,
        referredById: referredById || null,
        referredByName: referredByName || null,
        isReferral: isReferral || false,
        createdBy: userId,
        updatedBy: userId,
      });

      // Create slot lock
      await tx.insert(appointmentSlots).values({
        slotKey: key,
        doctorId,
        appointmentId,
        bookedAt: new Date(),
      });

      return { appointmentId };
    });

    return NextResponse.json({
      success: true,
      appointmentId: result.appointmentId,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    if (err.message === 'SLOT_TAKEN') {
      return NextResponse.json(
        { error: 'This slot is already booked. Please choose another time.' },
        { status: 409 }
      );
    }
    console.error('Create Appointment Error:', error);
    return NextResponse.json(
      { error: err.message || 'Failed to create appointment' },
      { status: 500 }
    );
  }
}