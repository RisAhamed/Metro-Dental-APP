import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { purchaseOrders } from '@/lib/db/schema/purchaseOrders';
import { inventoryItems } from '@/lib/db/schema/inventoryItems';
import { canManageInventory } from '@/lib/auth/claims';
import { eq, sql } from 'drizzle-orm';
import type { POLineItem, POReturn, POPayment } from '@/lib/db/schema/purchaseOrders';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { sessionClaims } = await auth();
  if (!canManageInventory(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { orderId } = await params;

  try {
    const results = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.orderId, orderId))
      .limit(1);

    if (results.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order: results[0] });
  } catch (error) {
    console.error('Get Purchase Order Error:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { sessionClaims, userId } = await auth();
  if (!canManageInventory(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { orderId } = await params;
  const body = await req.json();

  try {
    const results = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.orderId, orderId))
      .limit(1);

    if (results.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = results[0];

    // Record a payment
    if (body.action === 'record-payment') {
      const { amount, method, notes } = body;
      const paymentAmount = Number(amount) || 0;
      if (paymentAmount <= 0) {
        return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
      }

      const currentPaid = Number(order.amountPaid) || 0;
      const net = Number(order.netAmount) || 0;
      const newPaid = currentPaid + paymentAmount;
      const paymentStatus = newPaid >= net ? 'PAID' : 'PARTIALLY_PAID';

      const payment: POPayment = {
        paymentId: `PAY-${Date.now()}`,
        amount: paymentAmount,
        date: new Date().toISOString(),
        method: method || 'CASH',
        recordedBy: userId,
        notes: notes || null,
      };

      await db
        .update(purchaseOrders)
        .set({
          amountPaid: newPaid.toFixed(2),
          balanceDue: Math.max(net - newPaid, 0).toFixed(2),
          paymentStatus: paymentStatus as 'UNPAID' | 'PARTIALLY_PAID' | 'PAID',
          paymentHistory: [...(order.paymentHistory || []), payment],
          updatedAt: new Date(),
        })
        .where(eq(purchaseOrders.orderId, orderId));

      return NextResponse.json({ success: true });
    }

    // Add a return (original order unchanged; reduces net amount)
    if (body.action === 'add-return') {
      const { itemId, itemName, quantity, reason } = body;
      const returnQty = Number(quantity) || 0;
      if (!itemId || !itemName || returnQty <= 0) {
        return NextResponse.json({ error: 'Invalid return data' }, { status: 400 });
      }

      const items: POLineItem[] = order.lineItems || [];
      const line = items.find((i) => i.itemId === itemId);
      const unitPrice = line ? Number(line.unitPrice) || 0 : 0;
      const amount = unitPrice * returnQty;

      const currentReturns: POReturn[] = order.returns || [];
      const newReturn: POReturn = {
        returnId: `RET-${Date.now()}`,
        itemId,
        itemName,
        quantity: returnQty,
        reason: reason || '',
        amount,
        date: new Date().toISOString(),
      };

      const totalReturnAmount = (Number(order.totalReturnAmount) || 0) + amount;
      const netAmount = Math.max(Number(order.totalOrderAmount) || 0 - totalReturnAmount, 0);
      const balanceDue = Math.max(netAmount - (Number(order.amountPaid) || 0), 0);

      await db
        .update(purchaseOrders)
        .set({
          returns: [...currentReturns, newReturn],
          totalReturnAmount: totalReturnAmount.toFixed(2),
          netAmount: netAmount.toFixed(2),
          balanceDue: balanceDue.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(purchaseOrders.orderId, orderId));

      return NextResponse.json({ success: true });
    }

    // Confirm delivery of delivered quantities -> updates stock + status
    if (body.action === 'confirm-delivery') {
      const { lineItems, status, invoiceFileId } = body;
      const deliveredItems: POLineItem[] = lineItems || order.lineItems;
      const totalOrderAmount = Number(order.totalOrderAmount) || 0;
      const totalReturnAmount = Number(order.totalReturnAmount) || 0;
      const netAmount = Math.max(totalOrderAmount - totalReturnAmount, 0);
      const amountPaid = Number(order.amountPaid) || 0;
      const newBalance = Math.max(netAmount - amountPaid, 0);

      const paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' =
        amountPaid >= netAmount && netAmount > 0
          ? 'PAID'
          : amountPaid > 0
            ? 'PARTIALLY_PAID'
            : 'UNPAID';

      await db
        .update(purchaseOrders)
        .set({
          lineItems: deliveredItems,
          status: status || 'DELIVERED',
          invoiceFileId: invoiceFileId ?? order.invoiceFileId,
          deliveredDate: status === 'DELIVERED' ? new Date() : order.deliveredDate,
          netAmount: netAmount.toFixed(2),
          balanceDue: newBalance.toFixed(2),
          paymentStatus,
          updatedAt: new Date(),
        })
        .where(eq(purchaseOrders.orderId, orderId));

      // Increase stock for each newly delivered quantity
      const alreadyIncluded = order.lineItems || [];
      for (const item of deliveredItems) {
        const prev = alreadyIncluded.find((i) => i.itemId === item.itemId);
        const prevDelivered = prev?.quantityDelivered || 0;
        const newDelivered = item.quantityDelivered || 0;
        const diff = newDelivered - prevDelivered;
        if (diff > 0) {
          await db
            .update(inventoryItems)
            .set({
              quantityInStock: sql`${inventoryItems.quantityInStock} + ${diff}`,
              updatedAt: new Date(),
            })
            .where(eq(inventoryItems.itemId, item.itemId));
        }
      }

      return NextResponse.json({ success: true });
    }

    // Cancel the order
    if (body.action === 'cancel') {
      await db
        .update(purchaseOrders)
        .set({ status: 'CANCELLED', updatedAt: new Date() })
        .where(eq(purchaseOrders.orderId, orderId));

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Update Purchase Order Error:', error);
    return NextResponse.json(
      { error: (error as { message?: string }).message || 'Failed to update order' },
      { status: 500 }
    );
  }
}
