import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { isSuperAdmin } from '@/lib/auth/claims';
import { appointments } from '@/lib/db/schema/appointments';
import { patients } from '@/lib/db/schema/patients';
import { labOrders } from '@/lib/db/schema/labOrders';
import { purchaseOrders } from '@/lib/db/schema/purchaseOrders';
import { patientPayments } from '@/lib/db/schema/patientPayments';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { istDayStart, istDayEnd, toISTDateString } from '@/lib/date';

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!isSuperAdmin(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get('clinicId');
  const dateParam = searchParams.get('date') || toISTDateString(new Date());

  const date = new Date(`${dateParam}T12:00:00.000Z`);
  const dayStart = istDayStart(date);
  const dayEnd = istDayEnd(date);

  const clinicFilter = (col: { clinicId: PgColumn }) =>
    clinicId && clinicId !== 'both' ? eq(col.clinicId, clinicId) : undefined;

  try {
    const [patientsSeen, newRegistrations, walkIns, labOrdersCount, purchaseOrdersCount, payments] =
      await Promise.all([
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(appointments)
          .where(
            and(
              clinicFilter(appointments),
              gte(appointments.appointmentDate, dayStart),
              lte(appointments.appointmentDate, dayEnd),
              eq(appointments.status, 'COMPLETED')
            )
          ),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(patients)
          .where(
            and(
              clinicId && clinicId !== 'both'
                ? eq(patients.registeredClinicId, clinicId)
                : undefined,
              gte(patients.createdAt, dayStart),
              lte(patients.createdAt, dayEnd)
            )
          ),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(appointments)
          .where(
            and(
              clinicFilter(appointments),
              gte(appointments.appointmentDate, dayStart),
              lte(appointments.appointmentDate, dayEnd),
              eq(appointments.isWalkIn, true)
            )
          ),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(labOrders)
          .where(
            and(
              clinicFilter(labOrders),
              gte(labOrders.createdAt, dayStart),
              lte(labOrders.createdAt, dayEnd)
            )
          ),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(purchaseOrders)
          .where(
            and(
              clinicFilter(purchaseOrders),
              gte(purchaseOrders.createdAt, dayStart),
              lte(purchaseOrders.createdAt, dayEnd)
            )
          ),
        db
          .select({ amount: patientPayments.amount, mode: patientPayments.mode })
          .from(patientPayments)
          .where(
            and(
              clinicFilter(patientPayments),
              gte(patientPayments.date, dayStart),
              lte(patientPayments.date, dayEnd)
            )
          ),
      ]);

    const count = (rows: { count: number }[]) => Number(rows[0]?.count || 0);

    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const revenueByMode: Record<string, number> = {};
    for (const p of payments) {
      revenueByMode[p.mode] = (revenueByMode[p.mode] || 0) + Number(p.amount || 0);
    }

    return NextResponse.json({
      date: dateParam,
      patientsSeen: count(patientsSeen),
      newRegistrations: count(newRegistrations),
      walkIns: count(walkIns),
      labOrders: count(labOrdersCount),
      purchaseOrders: count(purchaseOrdersCount),
      revenue: Number(totalRevenue.toFixed(2)),
      revenueByMode,
    });
  } catch (error) {
    console.error('Dashboard Summary Error:', error);
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 });
  }
}
