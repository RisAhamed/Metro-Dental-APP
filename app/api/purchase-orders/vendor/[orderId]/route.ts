import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { purchaseOrders } from '@/lib/db/schema/purchaseOrders';
import { users } from '@/lib/db/schema/users';
import { eq, and } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
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

  const { orderId } = await params;

  try {
    const results = await db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.orderId, orderId),
          eq(purchaseOrders.vendorId, vendorId)
        )
      )
      .limit(1);

    if (results.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order: results[0] });
  } catch (error) {
    console.error('Get Vendor Order Error:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}
