import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { invoices } from '@/lib/db/schema/invoices';
import { canViewClinical } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

const VALID_STATUSES = ['UNPAID', 'PARTIALLY_PAID', 'PAID'];

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { sessionClaims, userId } = await auth();
  if (!canViewClinical(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { invoiceId } = await params;
  const body = await req.json();
  const status = String(body.paymentStatus || '').toUpperCase();
  const amountPaid = body.amountPaid !== undefined ? String(body.amountPaid) : undefined;

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `Invalid payment status: ${status}` }, { status: 400 });
  }

  try {
    const existing = await db.select().from(invoices).where(eq(invoices.invoiceId, invoiceId)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      paymentStatus: status,
      updatedAt: new Date(),
    };
    if (amountPaid !== undefined) updates.amountPaid = amountPaid;

    await db.update(invoices).set(updates).where(eq(invoices.invoiceId, invoiceId));
    const updated = await db.select().from(invoices).where(eq(invoices.invoiceId, invoiceId)).limit(1);
    return NextResponse.json({ success: true, invoice: updated[0] });
  } catch (error) {
    console.error('Update Invoice Payment Error:', error);
    return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 });
  }
}
