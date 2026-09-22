import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { purchases, type PurchaseLineItem } from '@/lib/db/schema/purchases';
import { inventoryItems } from '@/lib/db/schema/inventoryItems';
import { purchasePayments } from '@/lib/db/schema/purchasePayments';
import { users } from '@/lib/db/schema/users';
import { canConsumeInventory, isSuperAdmin, isClinicAdmin } from '@/lib/auth/claims';
import { eq, and, desc, sql } from 'drizzle-orm';

function canSeeFinancials(claims: unknown): boolean {
  return isSuperAdmin(claims) || isClinicAdmin(claims);
}

function stripFinancials<T extends Record<string, unknown>>(row: T, show: boolean): T {
  if (show) return row;
  const rest = { ...row };
  delete rest.totalAmount;
  delete rest.amountPaid;
  delete rest.balanceDue;
  delete rest.paymentStatus;
  return rest;
}

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!canConsumeInventory(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const vendorId = searchParams.get('vendorId');
  const search = (searchParams.get('search') || '').trim().toLowerCase();
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const paymentStatus = searchParams.get('paymentStatus');
  const sort = searchParams.get('sort') || 'newest';
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 200);
  const offset = parseInt(searchParams.get('offset') || '0', 10) || 0;
  try {
    const conditions = [vendorId ? eq(purchases.vendorId, vendorId) : undefined].filter(Boolean);
    const results = await db
      .select()
      .from(purchases)
      .where(conditions.length > 0 ? and(...(conditions as never[])) : undefined)
      .orderBy(desc(purchases.purchaseDate));
    let filtered = results;
    if (from) {
      const fromDate = new Date(from);
      filtered = filtered.filter((p) => new Date(p.purchaseDate) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((p) => new Date(p.purchaseDate) <= toDate);
    }
    if (paymentStatus && paymentStatus !== 'all') {
      filtered = filtered.filter((p) => p.paymentStatus === paymentStatus);
    }
    if (search) {
      filtered = filtered.filter((p) => {
        if (p.purchaseNumber?.toLowerCase().includes(search)) return true;
        if (p.vendorName?.toLowerCase().includes(search)) return true;
        if (p.invoiceNumber?.toLowerCase().includes(search)) return true;
        if (String(p.totalAmount || '').includes(search)) return true;
        const items = (p.lineItems as Array<{ itemName?: string }> | null) || [];
        if (items.some((li) => li.itemName?.toLowerCase().includes(search))) return true;
        return false;
      });
    }
    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sort === 'oldest') return new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
      if (sort === 'highest') return Number(b.totalAmount || 0) - Number(a.totalAmount || 0);
      if (sort === 'lowest') return Number(a.totalAmount || 0) - Number(b.totalAmount || 0);
      return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
    });
    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit);
    const show = canSeeFinancials(sessionClaims);
    return NextResponse.json({ purchases: paged.map((r) => stripFinancials(r, show)), total });
  } catch (error) {
    console.error('Get Purchases Error:', error);
    return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!canConsumeInventory(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const body = await req.json();
  const { vendorId, vendorName, clinicId, purchaseDate, invoiceNumber, lineItems, notes, amountPaid, paymentMode, paymentReference, fullAmount } = body;
  if (!vendorId || !vendorName || !lineItems || lineItems.length === 0) {
    return NextResponse.json({ error: 'Missing vendorId, vendorName, lineItems' }, { status: 400 });
  }
  const paidAmount = Number(amountPaid || 0);
  const total = fullAmount ? Number(fullAmount) : lineItems.reduce((s: number, li: { quantity: number; unitPrice: number }) => s + Number(li.quantity) * Number(li.unitPrice), 0);
  const finalAmount = fullAmount ? total : total;
  const finalPaid = Math.min(paidAmount, finalAmount);
  const finalBalance = finalAmount - finalPaid;
  const finalStatus = finalPaid <= 0 ? 'UNPAID' : finalPaid >= finalAmount ? 'PAID' : 'PARTIALLY_PAID';
  const sharedClinicId = clinicId || 'shared';
  try {
    const counterResult = await db.execute(
      sql`INSERT INTO counters (key, value) VALUES ('purchases', 1)
          ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
          RETURNING value`
    );
    const next = Number(counterResult[0]?.value ?? 1);
    const purchaseNumber = `PUR-${String(next).padStart(5, '0')}`;
    const purchaseId = purchaseNumber;

    let total = 0;
    const items: PurchaseLineItem[] = (lineItems as Array<Omit<PurchaseLineItem, 'totalPrice'>>).map((li) => {
      const t = Number(li.quantity) * Number(li.unitPrice);
      total += t;
      return { ...li, quantity: Number(li.quantity), unitPrice: Number(li.unitPrice), totalPrice: t };
    });

    await db.insert(purchases).values({
      purchaseId,
      purchaseNumber,
      vendorId,
      vendorName,
      clinicId: sharedClinicId,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      invoiceNumber: invoiceNumber || null,
      lineItems: items,
      totalAmount: finalAmount.toFixed(2),
      amountPaid: finalPaid.toFixed(2),
      balanceDue: finalBalance.toFixed(2),
      paymentStatus: finalStatus,
      notes: notes || null,
      createdBy: userId,
    });

    const userSnap = await db.select({ name: users.name }).from(users).where(eq(users.uid, userId)).limit(1);
    void userSnap;

    // Insert payment record if paid
    if (finalPaid > 0 && paymentMode) {
      try {
        const counterRes = await db.execute(
          sql`INSERT INTO counters (key, value) VALUES ('purchase_payments', 1)
              ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
              RETURNING value`
        );
        const payNext = Number(counterRes[0]?.value ?? 1);
        const paymentId = `PAY-${String(payNext).padStart(5, '0')}`;
        await db.insert(purchasePayments).values({
          paymentId,
          purchaseId,
          vendorId,
          clinicId: sharedClinicId,
          amount: finalPaid.toFixed(2),
          paymentDate: purchaseDate ? new Date(purchaseDate) : new Date(),
          mode: paymentMode,
          reference: paymentReference || null,
          notes: notes || null,
          recordedBy: userId,
          recordedByName: userSnap[0]?.name || 'Unknown',
          createdAt: new Date(),
        });
      } catch (payErr) {
        console.error('Payment insert failed', payErr);
      }
    }

    // Update inventory stock + last purchase info

    return NextResponse.json({ success: true, purchaseId, purchaseNumber });
  } catch (error) {
    console.error('Create Purchase Error:', error);
    return NextResponse.json({ error: 'Failed to create purchase' }, { status: 500 });
  }
}
