import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { labOrders } from '@/lib/db/schema/labOrders';
import { labBilling } from '@/lib/db/schema/labBilling';
import { users } from '@/lib/db/schema/users';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (sessionClaims?.role !== 'LAB_TECHNICIAN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get('clinicId') || null;
  const paymentStatus = searchParams.get('paymentStatus') || null;

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

    const conditions = [eq(labOrders.labId, labId)];
    if (clinicId) conditions.push(eq(labOrders.clinicId, clinicId));

    const orders = await db
      .select()
      .from(labOrders)
      .where(and(...conditions))
      .orderBy(desc(labOrders.createdAt));

    const orderIds = orders.map((o) => o.orderId);
    const billings =
      orderIds.length > 0
        ? await db
            .select()
            .from(labBilling)
            .where(sql`${labBilling.orderId} = ANY(${orderIds})`)
        : [];

    const billingByOrder = new Map(billings.map((b) => [b.orderId, b]));

    const rows = orders.map((o) => {
      const b = billingByOrder.get(o.orderId);
      return {
        orderId: o.orderId,
        clinicId: o.clinicId,
        patientName: o.patientName,
        orderedByDoctorName: o.orderedByDoctorName,
        status: o.status,
        createdAt: o.createdAt,
        totalCost: Number(b?.totalCost || 0),
        amountPaid: Number(b?.amountPaid || 0),
        paymentStatus: b?.paymentStatus || 'UNPAID',
      };
    });

    const filtered = paymentStatus
      ? rows.filter((r) => r.paymentStatus === paymentStatus)
      : rows;

    const totals = filtered.reduce(
      (acc, r) => ({
        billed: acc.billed + r.totalCost,
        paid: acc.paid + r.amountPaid,
        outstanding: acc.outstanding + Math.max(0, r.totalCost - r.amountPaid),
      }),
      { billed: 0, paid: 0, outstanding: 0 }
    );

    return NextResponse.json({ orders: filtered, totals });
  } catch (error) {
    console.error('Lab Finance Error:', error);
    return NextResponse.json({ error: 'Failed to fetch finance data' }, { status: 500 });
  }
}
