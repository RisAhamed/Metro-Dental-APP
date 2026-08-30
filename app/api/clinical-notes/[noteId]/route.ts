import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { clinicalNotes } from '@/lib/db/schema/clinicalNotes';
import { canManageClinical } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const { sessionClaims, userId } = await auth();
  if (!canManageClinical(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { noteId } = await params;
  const body = await req.json();
  const { chiefComplaints, observations, diagnoses, investigations, notes } = body;

  try {
    const result = await db
      .update(clinicalNotes)
      .set({
        chiefComplaints,
        observations,
        diagnoses,
        investigations,
        notes,
        updatedAt: new Date(),
      })
      .where(eq(clinicalNotes.noteId, noteId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ note: result[0] });
  } catch (error) {
    console.error('Update Clinical Note Error:', error);
    return NextResponse.json({ error: 'Failed to update clinical note' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const { sessionClaims } = await auth();
  if (!canManageClinical(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { noteId } = await params;

  try {
    const result = await db
      .delete(clinicalNotes)
      .where(eq(clinicalNotes.noteId, noteId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Clinical Note Error:', error);
    return NextResponse.json({ error: 'Failed to delete clinical note' }, { status: 500 });
  }
}
