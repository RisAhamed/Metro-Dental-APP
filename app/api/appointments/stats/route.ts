import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { appointments } from '@/lib/db/schema/appointments';
import { patients } from '@/lib/db/schema/patients';
import { isStaff } from '@/lib/auth/claims';
import { and, eq, gte, lt, inArray } from 'drizzle-orm';

const ACTIVE_STATUSES = ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] as const;

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!isStaff(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get('clinicId');
  const dateStr = searchParams.get('date');

  if (!clinicId || !dateStr) {
    return NextResponse.json({ error: 'Missing required params: clinicId, date' }, { status: 400 });
  }

  try {
    const dayStart = new Date(`${dateStr}T00:00:00`);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const results = await db
      .select({
        appointmentId: appointments.appointmentId,
        patientId: appointments.patientId,
        patientName: appointments.patientName,
        doctorId: appointments.doctorId,
        doctorName: appointments.doctorName,
        appointmentDate: appointments.appointmentDate,
        durationMinutes: appointments.durationMinutes,
        categoryId: appointments.categoryId,
        categoryName: appointments.categoryName,
        categoryColor: appointments.categoryColor,
        status: appointments.status,
        isWalkIn: appointments.isWalkIn,
        tokenNumber: appointments.tokenNumber,
        gender: patients.gender,
        age: patients.age,
        primaryPhone: patients.primaryPhone,
        email: patients.email,
        totalDue: patients.totalDue,
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.patientId))
      .where(
        and(
          eq(appointments.clinicId, clinicId),
          gte(appointments.appointmentDate, dayStart),
          lt(appointments.appointmentDate, dayEnd),
          inArray(appointments.status, [...ACTIVE_STATUSES])
        )
      )
      .orderBy(appointments.appointmentDate);

    const stats = {
      TODAY: results.length,
      WAITING: results.filter((r) => r.status === 'SCHEDULED' || r.status === 'CONFIRMED').length,
      ENGAGED: results.filter((r) => r.status === 'IN_PROGRESS').length,
      DONE: results.filter((r) => r.status === 'COMPLETED').length,
    };

    return NextResponse.json({ stats, appointments: results });
  } catch (error) {
    console.error('Get Appointment Stats Error:', error);
    return NextResponse.json({ error: 'Failed to fetch appointment stats' }, { status: 500 });
  }
}
