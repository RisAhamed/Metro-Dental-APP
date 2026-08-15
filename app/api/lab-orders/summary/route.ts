import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { labOrders } from '@/lib/db/schema/labOrders';
import { labBilling } from '@/lib/db/schema/labBilling';
import { users } from '@/lib/db/schema/users';
import { eq, and, sql } from 'drizzle-orm';
import { clinicName } from '@/lib/constants/clinics';

export async function GET(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (sessionClaims?.role !== 'LAB_TECHNICIAN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clinicFilter = searchParams.get('clinicId') || null;

  try {
    const userSnap = await db
      .select({ labId: users.labId })
      .from(users)
      .where(eq(users.uid, userId || ''))
      .limit(1);
    const labId = userSnap[0]?.labId || null;

    if (!labId) {
      return NextResponse.json({ error: 'No lab assigned to this user' }, { status: 400 });
    }

    // Build per-clinic breakdown for the tech's lab
    const clinics = ['clinic_a', 'clinic_b'];
    const byClinic: Record<
      string,
      {
        clinicId: string;
        clinicName: string;
        total: number;
        pending: number;
        inProgress: number;
        completed: number;
        cancelled: number;
        openIssues: number;
        paidCount: number;
        partialCount: number;
        unpaidCount: number;
        amountPaid: number;
        amountOutstanding: number;
      }
    > = {};

    for (const clinicId of clinics) {
      const orders = await db
        .select()
        .from(labOrders)
        .where(and(eq(labOrders.labId, labId), eq(labOrders.clinicId, clinicId)));

      const orderIds = orders.map((o) => o.orderId);
      const billings =
        orderIds.length > 0
          ? await db
              .select()
              .from(labBilling)
              .where(sql`${labBilling.orderId} = ANY(${orderIds})`)
          : [];

      let paidCount = 0;
      let partialCount = 0;
      let unpaidCount = 0;
      let amountPaid = 0;
      let amountOutstanding = 0;

      for (const b of billings) {
        const total = Number(b.totalCost || 0);
        const paid = Number(b.amountPaid || 0);
        amountPaid += paid;
        amountOutstanding += Math.max(0, total - paid);
        if (b.paymentStatus === 'PAID') paidCount += 1;
        else if (b.paymentStatus === 'PARTIALLY_PAID') partialCount += 1;
        else unpaidCount += 1;
      }

      byClinic[clinicId] = {
        clinicId,
        clinicName: clinicName(clinicId),
        total: orders.length,
        pending: orders.filter((o) => o.status === 'PENDING').length,
        inProgress: orders.filter((o) => o.status === 'IN_PROGRESS').length,
        completed: orders.filter((o) => o.status === 'COMPLETED').length,
        cancelled: orders.filter((o) => o.status === 'CANCELLED').length,
        openIssues: orders.reduce(
          (sum, o) => sum + (o.issues || []).filter((i) => i.status === 'OPEN').length,
          0
        ),
        paidCount,
        partialCount,
        unpaidCount,
        amountPaid,
        amountOutstanding,
      };
    }

    // Combined totals
    const clinicsArr = Object.values(byClinic);
    const combined = clinicsArr.reduce(
      (acc, c) => ({
        total: acc.total + c.total,
        pending: acc.pending + c.pending,
        inProgress: acc.inProgress + c.inProgress,
        completed: acc.completed + c.completed,
        cancelled: acc.cancelled + c.cancelled,
        openIssues: acc.openIssues + c.openIssues,
        paidCount: acc.paidCount + c.paidCount,
        partialCount: acc.partialCount + c.partialCount,
        unpaidCount: acc.unpaidCount + c.unpaidCount,
        amountPaid: acc.amountPaid + c.amountPaid,
        amountOutstanding: acc.amountOutstanding + c.amountOutstanding,
      }),
      {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        openIssues: 0,
        paidCount: 0,
        partialCount: 0,
        unpaidCount: 0,
        amountPaid: 0,
        amountOutstanding: 0,
      }
    );

    const all = clinicFilter ? byClinic[clinicFilter] || null : combined;
    return NextResponse.json({ byClinic, combined, all });
  } catch (error) {
    console.error('Lab Summary Error:', error);
    return NextResponse.json({ error: 'Failed to fetch lab summary' }, { status: 500 });
  }
}
