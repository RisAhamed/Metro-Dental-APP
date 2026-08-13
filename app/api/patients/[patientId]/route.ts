import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { patients } from '@/lib/db/schema/patients';
import { canManagePatients } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { sessionClaims } = await auth();
  if (!canManagePatients(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized - Staff only' }, { status: 403 });
  }

  const { patientId } = await params;

  try {
    const result = await db
      .select()
      .from(patients)
      .where(eq(patients.patientId, patientId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    return NextResponse.json({ patient: result[0] });
  } catch (error) {
    console.error('Get Patient Error:', error);
    return NextResponse.json({ error: 'Failed to fetch patient' }, { status: 500 });
  }
}
