import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { purchases, type PurchaseLineItem } from '@/lib/db/schema/purchases';
import { inventoryItems } from '@/lib/db/schema/inventoryItems';
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
  try {
    const conditions = [vendorId ? eq(purchases.vendorId, vendorId) : undefined].filter(Boolean);
    const results = await db
      .select()
      .from(purchases)
      .where(conditions.length > 0 ? and(...(conditions as never[])) : undefined)
      .orderBy(desc(purchases.purchaseDate));
    const show = canSeeFinancials(sessionClaims);
    return NextResponse.json({ purchases: results.map((r) => stripFinancials(r, show)) });
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
  const { vendorId, vendorName, clinicId, purchaseDate, invoiceNumber, lineItems, notes } = body;
  if (!vendorId || !vendorName || !lineItems || lineItems.length === 0) {
    return NextResponse.json({ error: 'Missing vendorId, vendorName, lineItems' }, { status: 400 });
  }
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
      totalAmount: total.toFixed(2),
      amountPaid: '0',
      balanceDue: total.toFixed(2),
      paymentStatus: 'UNPAID',
      notes: notes || null,
      createdBy: userId,
    });

    // Update inventory stock + last purchase info
    for (const li of items) {
      try {
        const existing = await db.select().from(inventoryItems).where(eq(inventoryItems.itemId, li.itemId)).limit(1);
        if (existing.length > 0) {
          await db
            .update(inventoryItems)
            .set({
              quantityInStock: (existing[0].quantityInStock || 0) + li.quantity,
              unitPrice: String(li.unitPrice),
              lastPurchasePrice: String(li.unitPrice),
              lastPurchaseDate: new Date(),
              vendorId,
              purchaseId,
              updatedAt: new Date(),
            })
            .where(eq(inventoryItems.itemId, li.itemId));
        }
      } catch (e) {
        console.error('Inventory update failed for', li.itemId, e);
      }
    }

    const userSnap = await db.select({ name: users.name }).from(users).where(eq(users.uid, userId)).limit(1);
    void userSnap;

    return NextResponse.json({ success: true, purchaseId, purchaseNumber });
  } catch (error) {
    console.error('Create Purchase Error:', error);
    return NextResponse.json({ error: 'Failed to create purchase' }, { status: 500 });
  }
}
