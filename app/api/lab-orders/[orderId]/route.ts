import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { labOrders } from '@/lib/db/schema/labOrders';
import { isStaff } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { sessionClaims } = await auth();
  const role = sessionClaims?.role;
  if (!isStaff(sessionClaims) && role !== 'LAB_TECHNICIAN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { orderId } = await params;

  try {
    const result = await db
      .select()
      .from(labOrders)
      .where(eq(labOrders.orderId, orderId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order: result[0] });
  } catch (error) {
    console.error('Get Lab Order Error:', error);
    return NextResponse.json({ error: 'Failed to fetch lab order' }, { status: 500 });
  }
}