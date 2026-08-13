import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { labBilling as labBillingTable } from '@/lib/db/schema/labBilling';
import { isDoctor } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { sessionClaims } = await auth();
  if (!isDoctor(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized - Doctors only' }, { status: 403 });
  }

  const { orderId } = await params;

  try {
    const result = await db
      .select()
      .from(labBillingTable)
      .where(eq(labBillingTable.orderId, orderId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: 'Billing not found' }, { status: 404 });
    }

    return NextResponse.json({ billing: result[0] });
  } catch (error) {
    console.error('Get Billing Error:', error);
    return NextResponse.json({ error: 'Failed to fetch billing' }, { status: 500 });
  }
}