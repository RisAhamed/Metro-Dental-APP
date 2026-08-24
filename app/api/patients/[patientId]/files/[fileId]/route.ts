import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { patientFiles } from '@/lib/db/schema/patientFiles';
import { deleteFromR2 } from '@/lib/r2';
import { canManageClinical, isStaff } from '@/lib/auth/claims';
import { and, eq } from 'drizzle-orm';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string; fileId: string }> }
) {
  const { sessionClaims } = await auth();
  // Deletion restricted to clinical management roles (not receptionists)
  if (!isStaff(sessionClaims) || !canManageClinical(sessionClaims)) {
    return NextResponse.json(
      { error: 'Unauthorized - Only clinical staff can delete files' },
      { status: 403 }
    );
  }

  const { patientId, fileId } = await params;

  try {
    const existing = await db
      .select()
      .from(patientFiles)
      .where(and(eq(patientFiles.fileId, fileId), eq(patientFiles.patientId, patientId)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const record = existing[0];

    // Remove the object from R2 (best-effort), then the metadata row
    try {
      await deleteFromR2(record.r2Key);
    } catch (r2Error) {
      console.error('R2 delete failed, removing metadata anyway:', r2Error);
    }

    await db
      .delete(patientFiles)
      .where(eq(patientFiles.fileId, fileId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Patient File Error:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
