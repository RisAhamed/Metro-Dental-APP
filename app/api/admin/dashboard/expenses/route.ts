import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { isSuperAdmin } from '@/lib/auth/claims';
import { patientPayments } from '@/lib/db/schema/patientPayments';
import { labBilling } from '@/lib/db/schema/labBilling';
import { labOrders } from '@/lib/db/schema/labOrders';
import { purchaseOrders } from '@/lib/db/schema/purchaseOrders';
import { and, eq, gte, lte } from 'drizzle-orm';
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
    // Inflows: patient payments by mode
    const payments = await db
      .select({ amount: patientPayments.amount, mode: patientPayments.mode })
      .from(patientPayments)
      .where(
        and(
          clinicFilter(patientPayments),
          gte(patientPayments.date, dayStart),
          lte(patientPayments.date, dayEnd)
        )
      );

    const byMode: Record<string, number> = {};
    let inflowTotal = 0;
    for (const p of payments) {
      const amt = Number(p.amount || 0);
      byMode[p.mode] = (byMode[p.mode] || 0) + amt;
      inflowTotal += amt;
    }

    const modeGroup = (modes: string[]) =>
      modes.reduce((sum, m) => sum + (byMode[m] || 0), 0);

    // Outflows: lab payments made this day (from lab_billing payment_history)
    const labOrdersForClinic = clinicId && clinicId !== 'both'
      ? await db
          .select({ orderId: labOrders.orderId })
          .from(labOrders)
          .where(eq(labOrders.clinicId, clinicId))
      : null;

    const labIds =
      labOrdersForClinic && labOrdersForClinic.length > 0
        ? labOrdersForClinic.map((o) => o.orderId)
        : null;

    const labBillings = await db.select().from(labBilling);

    let totalLab = 0;
    for (const b of labBillings) {
      if (labIds && !labIds.includes(b.orderId)) continue;
      const paidOnDay = (b.paymentHistory || []).reduce((sum, ph) => {
        const phDate = new Date(ph.date);
        if (phDate >= dayStart && phDate <= dayEnd) return sum + Number(ph.amount || 0);
        return sum;
      }, 0);
      totalLab += paidOnDay;
    }

    // Outflows: purchase order payments made this day
    const pos = await db
      .select({
        orderId: purchaseOrders.orderId,
        clinicId: purchaseOrders.clinicId,
        paymentHistory: purchaseOrders.paymentHistory,
      })
      .from(purchaseOrders)
      .where(clinicFilter(purchaseOrders));

    let totalVendor = 0;
    for (const po of pos) {
      const paidOnDay = (po.paymentHistory || []).reduce((sum, ph) => {
        const phDate = new Date(ph.date);
        if (phDate >= dayStart && phDate <= dayEnd) return sum + Number(ph.amount || 0);
        return sum;
      }, 0);
      totalVendor += paidOnDay;
    }

    const inflowTotalRounded = Number(inflowTotal.toFixed(2));
    const outflowTotalRounded = Number((totalLab + totalVendor).toFixed(2));

    return NextResponse.json({
      date: dateParam,
      inflows: {
        cash: Number(modeGroup(['CASH']).toFixed(2)),
        gpay: Number(modeGroup(['GPAY', 'PAYTM']).toFixed(2)),
        card: Number(modeGroup(['DEBIT_CARD', 'CREDIT_CARD']).toFixed(2)),
        other: Number(modeGroup(['OTHER']).toFixed(2)),
        total: inflowTotalRounded,
      },
      outflows: {
        lab: Number(totalLab.toFixed(2)),
        vendor: Number(totalVendor.toFixed(2)),
        total: outflowTotalRounded,
      },
      net: Number((inflowTotalRounded - outflowTotalRounded).toFixed(2)),
    });
  } catch (error) {
    console.error('Expense Overview Error:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}
