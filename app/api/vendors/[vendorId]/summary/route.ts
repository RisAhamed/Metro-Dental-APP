import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { vendors } from '@/lib/db/schema/vendors';
import { purchases } from '@/lib/db/schema/purchases';
import { isSuperAdmin, isClinicAdmin, canManageInventory } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ vendorId: string }> }) {
  const { sessionClaims } = await auth();
  if (!canManageInventory(sessionClaims)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const { vendorId } = await params;
  try {
    const vRows = await db.select().from(vendors).where(eq(vendors.vendorId, vendorId)).limit(1);
    if (!vRows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const pRows = await db.select().from(purchases).where(eq(purchases.vendorId, vendorId));
    const totalPurchased = pRows.reduce((s, p) => s + Number(p.totalAmount || 0), 0);
    const totalPaid = pRows.reduce((s, p) => s + Number(p.amountPaid || 0), 0);
    const outstanding = Math.max(0, totalPurchased - totalPaid);
    const show = isSuperAdmin(sessionClaims) || isClinicAdmin(sessionClaims);
    const purchasesList = pRows
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
      .map((p) => ({
        purchaseId: p.purchaseId,
        purchaseNumber: p.purchaseNumber,
        purchaseDate: p.purchaseDate,
        totalAmount: show ? p.totalAmount : undefined,
        amountPaid: show ? p.amountPaid : undefined,
        balanceDue: show ? p.balanceDue : undefined,
        paymentStatus: show ? p.paymentStatus : undefined,
      }));
    return NextResponse.json({
      vendor: vRows[0],
      totalPurchased: show ? totalPurchased : undefined,
      totalPaid: show ? totalPaid : undefined,
      outstanding: show ? outstanding : undefined,
      purchases: purchasesList,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
