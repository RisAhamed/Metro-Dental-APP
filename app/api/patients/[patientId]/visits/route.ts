import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { visits } from '@/lib/db/schema/visits';
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
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50') || 50, 200);
  const offset = parseInt(searchParams.get('offset') || '0') || 0;

  try {
    const results = await db
      .select()
      .from(visits)
      .where(eq(visits.patientId, patientId))
      .orderBy(desc(visits.visitDate), desc(visits.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ visits: results });
  } catch (error) {
    console.error('Get Patient Visits Error:', error);
    return NextResponse.json({ error: 'Failed to fetch visits' }, { status: 500 });
  }
}