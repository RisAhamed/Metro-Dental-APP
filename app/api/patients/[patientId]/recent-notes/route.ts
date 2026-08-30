import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { clinicalNotes } from '@/lib/db/schema/clinicalNotes';
import { isStaff } from '@/lib/auth/claims';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { sessionClaims } = await auth();
  if (!isStaff(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { patientId } = await params;
  const url = new URL(_req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '1', 10), 10);

  try {
    const results = await db
      .select()
      .from(clinicalNotes)
      .where(eq(clinicalNotes.patientId, patientId))
      .orderBy(desc(clinicalNotes.date))
      .limit(limit);

    return NextResponse.json({ notes: results });
  } catch (error) {
    console.error('Get Recent Clinical Notes Error:', error);
    return NextResponse.json({ error: 'Failed to fetch recent notes' }, { status: 500 });
  }
}
