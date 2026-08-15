import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { purchaseOrders } from '@/lib/db/schema/purchaseOrders';
import { users } from '@/lib/db/schema/users';
import { eq, and, desc } from 'drizzle-orm';
import type { POLineItem } from '@/lib/db/schema/purchaseOrders';

export async function GET(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  const role = sessionClaims?.role || '';

  if (role !== 'VENDOR') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let vendorId = sessionClaims?.vendorId as string | undefined;
  if (!vendorId && userId) {
    const userSnap = await db
      .select({ vendorId: users.vendorId })
      .from(users)
      .where(eq(users.uid, userId))
      .limit(1);
    vendorId = userSnap[0]?.vendorId || undefined;
  }

  if (!vendorId) {
    return NextResponse.json({ orders: [] });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  try {
    const conditions = [
      eq(purchaseOrders.vendorId, vendorId),
      status ? eq(purchaseOrders.status, status as never) : undefined,
    ].filter(Boolean);
    const results = await db
      .select()
      .from(purchaseOrders)
      .where(and(...conditions))
      .orderBy(desc(purchaseOrders.orderDate));
    return NextResponse.json({ orders: results, vendorId });
  } catch (error) {
    console.error('Get Vendor Orders Error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  const role = sessionClaims?.role || '';

  if (role !== 'VENDOR') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let vendorId = sessionClaims?.vendorId as string | undefined;
  if (!vendorId && userId) {
    const userSnap = await db
      .select({ vendorId: users.vendorId })
      .from(users)
      .where(eq(users.uid, userId))
      .limit(1);
    vendorId = userSnap[0]?.vendorId || undefined;
  }

  if (!vendorId) {
    return NextResponse.json({ error: 'No vendor assigned' }, { status: 400 });
  }

  const body = await req.json();
  const { orderId, lineItems, status, invoiceFileId, notes } = body;

  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
  }

  try {
    const existing = await db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.orderId, orderId), eq(purchaseOrders.vendorId, vendorId)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = existing[0];
    const updatedLineItems: POLineItem[] = lineItems || order.lineItems;

    let allDelivered = true;
    let anyDelivered = false;
    for (const item of updatedLineItems) {
      const qty = item.quantityDelivered || 0;
      if (qty > 0) anyDelivered = true;
      if (qty < (item.quantityOrdered || 0)) allDelivered = false;
    }

    let nextStatus = status || order.status;
    if (!status && anyDelivered) {
      nextStatus = allDelivered ? 'DELIVERED' : 'PARTIALLY_DELIVERED';
    }

    await db
      .update(purchaseOrders)
      .set({
        lineItems: updatedLineItems,
        status: nextStatus as never,
        invoiceFileId: invoiceFileId ?? order.invoiceFileId,
        deliveredDate: nextStatus === 'DELIVERED' ? new Date() : order.deliveredDate,
        notes: notes ?? order.notes,
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.orderId, orderId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update Order Error:', error);
    return NextResponse.json(
      { error: (error as { message?: string }).message || 'Failed to update order' },
      { status: 500 }
    );
  }
}
