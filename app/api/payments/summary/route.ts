import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { patientPayments, paymentModeEnum } from '@/lib/db/schema/patientPayments';
import { canManagePatients, isSuperAdmin } from '@/lib/auth/claims';
import { eq, and, gte, lte } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!canManagePatients(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get('clinicId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    const conditions = [];
    // Super admin can filter by clinic; others always scoped to own clinic.
    const isSuper = isSuperAdmin(sessionClaims);
    if (clinicId) {
      conditions.push(eq(patientPayments.clinicId, clinicId));
    } else if (!isSuper) {
      conditions.push(eq(patientPayments.clinicId, (sessionClaims?.primaryClinicId as string) || ''));
    }
    if (startDate) conditions.push(gte(patientPayments.date, new Date(`${startDate}T00:00:00.000Z`)));
    if (endDate) conditions.push(lte(patientPayments.date, new Date(`${endDate}T23:59:59.999Z`)));

    const results = await db
      .select()
      .from(patientPayments)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const byMode: Record<string, number> = {};
    let total = 0;

    for (const p of results) {
      const amount = Number(p.amount || 0);
      byMode[p.mode] = (byMode[p.mode] || 0) + amount;
      total += amount;
    }

    const breakdown = paymentModeEnum.enumValues.map((mode) => ({
      mode,
      amount: Number((byMode[mode] || 0).toFixed(2)),
    }));

    return NextResponse.json({
      total: Number(total.toFixed(2)),
      breakdown,
      byMode: Object.fromEntries(
        Object.entries(byMode).map(([k, v]) => [k, Number(v.toFixed(2))])
      ),
    });
  } catch (error) {
    console.error('Payment Summary Error:', error);
    return NextResponse.json({ error: 'Failed to fetch payment summary' }, { status: 500 });
  }
}
