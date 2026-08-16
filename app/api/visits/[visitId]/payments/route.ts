import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { visits } from '@/lib/db/schema/visits';
import { users } from '@/lib/db/schema/users';
import { canManageClinical } from '@/lib/auth/claims';
import { nextId } from '@/lib/utils/ids';
import { eq } from 'drizzle-orm';

const PAYMENT_MODES = ['CASH', 'GPAY', 'PAYTM', 'DEBIT_CARD', 'CREDIT_CARD', 'OTHER'];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  const { sessionClaims, userId } = await auth();
  if (!canManageClinical(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized - Clinical staff only' }, { status: 403 });
  }

  const { visitId } = await params;
  const body = await req.json();
  const { amount, mode, date, notes } = body;

  if (!amount) {
    return NextResponse.json({ error: 'Missing required field: amount' }, { status: 400 });
  }

  const parsedAmount = Number(amount);
  if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  if (!PAYMENT_MODES.includes(mode)) {
    return NextResponse.json({ error: `Invalid mode. Must be one of: ${PAYMENT_MODES.join(', ')}` }, { status: 400 });
  }

  try {
    const existing = await db
      .select()
      .from(visits)
      .where(eq(visits.visitId, visitId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    const visit = existing[0];
    const currentPayments = visit.payments || [];

    let recordedByName = 'Unknown';
    const userSnap = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.uid, userId))
      .limit(1);
    if (userSnap[0]?.name) recordedByName = userSnap[0].name;

    const paymentId = await nextId('visits_payments', 'VPAY-', 6);

    const newPayment = {
      paymentId,
      amount: parsedAmount,
      mode,
      date: date ? String(date) : new Date().toISOString().slice(0, 10),
      recordedBy: userId,
      recordedByName: recordedByName || null,
      notes: notes || null,
    };

    const updatedPayments = [...currentPayments, newPayment];
    const newPaid = updatedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const cost = Number(visit.treatmentCost || 0);
    const paymentStatus = newPaid >= cost && cost > 0 ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';

    await db
      .update(visits)
      .set({
        payments: updatedPayments,
        amountPaid: String(newPaid),
        paymentStatus,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(visits.visitId, visitId));

    const updated = await db
      .select()
      .from(visits)
      .where(eq(visits.visitId, visitId))
      .limit(1);

    return NextResponse.json({
      success: true,
      payment: newPayment,
      visit: updated[0],
      message: 'Payment recorded successfully',
    });
  } catch (error) {
    console.error('Record Visit Payment Error:', error);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}