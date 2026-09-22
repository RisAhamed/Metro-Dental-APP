import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { purchases } from '@/lib/db/schema/purchases';
import { purchasePayments } from '@/lib/db/schema/purchasePayments';
import { canConsumeInventory, isSuperAdmin, isClinicAdmin } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

function canSeeFinancials(claims: unknown): boolean {
  return isSuperAdmin(claims) || isClinicAdmin(claims);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ purchaseId: string }> }) {
  const { sessionClaims } = await auth();
  if (!canConsumeInventory(sessionClaims)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const { purchaseId } = await params;
  try {
    const rows = await db.select().from(purchases).where(eq(purchases.purchaseId, purchaseId)).limit(1);
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const payments = await db.select().from(purchasePayments).where(eq(purchasePayments.purchaseId, purchaseId));
    const show = canSeeFinancials(sessionClaims);
    const purchase = show ? rows[0] : { ...rows[0], totalAmount: '0', amountPaid: '0', balanceDue: '0', paymentStatus: 'UNPAID' as const };
    return NextResponse.json({ purchase, payments: show ? payments : [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
