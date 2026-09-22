import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { purchases } from '@/lib/db/schema/purchases';
import { purchasePayments } from '@/lib/db/schema/purchasePayments';
import { users } from '@/lib/db/schema/users';
import { isSuperAdmin, isClinicAdmin } from '@/lib/auth/claims';
import { eq, sql } from 'drizzle-orm';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ purchaseId: string }> }) {
  const { sessionClaims } = await auth();
  if (!isSuperAdmin(sessionClaims) && !isClinicAdmin(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const { purchaseId } = await params;
  const rows = await db.select().from(purchasePayments).where(eq(purchasePayments.purchaseId, purchaseId));
  return NextResponse.json({ payments: rows });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ purchaseId: string }> }) {
  const { sessionClaims, userId } = await auth();
  if ((!isSuperAdmin(sessionClaims) && !isClinicAdmin(sessionClaims)) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const { purchaseId } = await params;
  const body = await req.json();
  const { amount, mode, reference, notes, paymentDate } = body;
  const amt = Number(amount);
  if (!amt || amt <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  try {
    const rows = await db.select().from(purchases).where(eq(purchases.purchaseId, purchaseId)).limit(1);
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const purchase = rows[0];
    const counter = await db.execute(
      sql`INSERT INTO counters (key, value) VALUES ('purchase_payments', 1)
          ON CONFLICT (key) DO UPDATE SET value = counters.value + 1 RETURNING value`
    );
    const next = Number(counter[0]?.value ?? 1);
    const paymentId = `PPAY-${String(next).padStart(5, '0')}`;
    const userSnap = await db.select({ name: users.name }).from(users).where(eq(users.uid, userId)).limit(1);
    await db.insert(purchasePayments).values({
      paymentId,
      purchaseId,
      vendorId: purchase.vendorId,
      clinicId: purchase.clinicId,
      amount: amt.toFixed(2),
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      mode: mode || null,
      reference: reference || null,
      notes: notes || null,
      recordedBy: userId,
      recordedByName: userSnap[0]?.name || 'Staff',
    });
    const newPaid = Number(purchase.amountPaid || 0) + amt;
    const total = Number(purchase.totalAmount || 0);
    const balance = Math.max(0, total - newPaid);
    const status = newPaid >= total ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
    const updated = await db
      .update(purchases)
      .set({ amountPaid: newPaid.toFixed(2), balanceDue: balance.toFixed(2), paymentStatus: status, updatedAt: new Date() })
      .where(eq(purchases.purchaseId, purchaseId))
      .returning();
    return NextResponse.json({ success: true, purchase: updated[0] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}
