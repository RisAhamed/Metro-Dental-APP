import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { clinicalNotes } from '@/lib/db/schema/clinicalNotes';
import { canManageClinical } from '@/lib/auth/claims';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { sessionClaims } = await auth();
  if (!sessionClaims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { patientId } = await params;

  try {
    const results = await db
      .select()
      .from(clinicalNotes)
      .where(eq(clinicalNotes.patientId, patientId))
      .orderBy(desc(clinicalNotes.date));

    return NextResponse.json({ notes: results });
  } catch (error) {
    console.error('Get Clinical Notes Error:', error);
    return NextResponse.json({ error: 'Failed to fetch clinical notes' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { sessionClaims, userId } = await auth();
  if (!canManageClinical(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { patientId } = await params;
  const body = await req.json();
  const { clinicId, doctorId, doctorName, chiefComplaints, observations, diagnoses, investigations, notes } = body;

  if (!clinicId) {
    return NextResponse.json({ error: 'Missing clinicId' }, { status: 400 });
  }

  try {
    const noteId = `cn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const result = await db
      .insert(clinicalNotes)
      .values({
        noteId,
        patientId,
        clinicId,
        doctorId,
        doctorName: doctorName || '',
        chiefComplaints: chiefComplaints || [],
        observations: observations || [],
        diagnoses: diagnoses || [],
        investigations: investigations || [],
        notes: notes || null,
        createdBy: userId,
      })
      .returning();

    return NextResponse.json({ note: result[0] });
  } catch (error) {
    console.error('Create Clinical Note Error:', error);
    return NextResponse.json({ error: 'Failed to create clinical note' }, { status: 500 });
  }
}
