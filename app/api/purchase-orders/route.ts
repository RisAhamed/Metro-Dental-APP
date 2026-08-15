import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { purchaseOrders } from '@/lib/db/schema/purchaseOrders';
import { canManageInventory } from '@/lib/auth/claims';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { POLineItem } from '@/lib/db/schema/purchaseOrders';

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!canManageInventory(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const vendorId = searchParams.get('vendorId');
  const status = searchParams.get('status');

  try {
    // Purchase orders are shared globally across admins (no clinicId filtering).
    const conditions = [
      vendorId ? eq(purchaseOrders.vendorId, vendorId) : undefined,
      status ? eq(purchaseOrders.status, status as never) : undefined,
    ].filter(Boolean);

    const results = await db
      .select()
      .from(purchaseOrders)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(purchaseOrders.orderDate));

    return NextResponse.json({ orders: results });
  } catch (error) {
    console.error('Get Purchase Orders Error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!canManageInventory(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { vendorId, vendorName, clinicId, lineItems, expectedDeliveryDate, notes } = body;

  if (!vendorId || !lineItems || lineItems.length === 0) {
    return NextResponse.json(
      { error: 'Missing required fields: vendorId, lineItems' },
      { status: 400 }
    );
  }

  // Purchase orders are shared globally.
  const sharedClinicId = clinicId || 'shared';

  try {
    const counterResult = await db.execute(
      sql`INSERT INTO counters (key, value) VALUES ('purchase_orders', 1)
          ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
          RETURNING value`
    );
    const next = Number(counterResult[0]?.value ?? 1);
    const poNumber = `PO-${String(next).padStart(5, '0')}`;
    const orderId = `PO-${String(next).padStart(5, '0')}`;

    let totalOrderAmount = 0;
    const items: POLineItem[] = (lineItems as Array<Omit<POLineItem, 'quantityDelivered' | 'totalPrice'>>).map((item) => {
      const total = item.quantityOrdered * item.unitPrice;
      totalOrderAmount += total;
      return {
        itemId: item.itemId,
        itemName: item.itemName,
        category: item.category,
        unit: item.unit,
        quantityOrdered: item.quantityOrdered,
        quantityDelivered: 0,
        unitPrice: item.unitPrice,
        totalPrice: total,
      };
    });

    const totalOrderAmountStr = totalOrderAmount.toFixed(2);
    const balanceDueStr = totalOrderAmount.toFixed(2);

    await db.insert(purchaseOrders).values({
      orderId,
      poNumber,
      vendorId,
      vendorName,
      clinicId: sharedClinicId,
      orderDate: new Date(),
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
      status: 'PENDING',
      lineItems: items,
      returns: [],
      totalOrderAmount: totalOrderAmountStr,
      totalReturnAmount: '0',
      netAmount: totalOrderAmountStr,
      amountPaid: '0',
      balanceDue: balanceDueStr,
      paymentStatus: 'UNPAID',
      paymentHistory: [],
      notes: notes || null,
      createdBy: userId,
    });

    return NextResponse.json({
      success: true,
      orderId,
      poNumber,
      message: 'Purchase order created successfully',
    });
  } catch (error) {
    console.error('Create Purchase Order Error:', error);
    return NextResponse.json(
      { error: (error as { message?: string }).message || 'Failed to create purchase order' },
      { status: 500 }
    );
  }
}
