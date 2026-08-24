import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { invoices } from '@/lib/db/schema/invoices';
import { canViewClinical } from '@/lib/auth/claims';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { sessionClaims } = await auth();
  if (!canViewClinical(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { patientId } = await params;

  try {
    const rows = await db
      .select()
      .from(invoices)
      .where(eq(invoices.patientId, patientId))
      .orderBy(desc(invoices.createdAt));

    return NextResponse.json({ invoices: rows });
  } catch (error) {
    console.error('Get Patient Invoices Error:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}
