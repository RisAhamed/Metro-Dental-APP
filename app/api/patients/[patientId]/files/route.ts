import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { patientFiles } from '@/lib/db/schema/patientFiles';
import { uploadToR2 } from '@/lib/r2';
import { isStaff, getPrimaryClinicId } from '@/lib/auth/claims';
import { users } from '@/lib/db/schema/users';
import { eq, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { sessionClaims } = await auth();
  if (!isStaff(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { patientId } = await params;

  try {
    const files = await db
      .select()
      .from(patientFiles)
      .where(eq(patientFiles.patientId, patientId))
      .orderBy(desc(patientFiles.createdAt));

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Get Patient Files Error:', error);
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { sessionClaims, userId } = await auth();
  if (!isStaff(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized - Staff only' }, { status: 403 });
  }

  const { patientId } = await params;

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const notes = (formData.get('notes') as string | null)?.trim() || null;
    const visitId = (formData.get('visitId') as string | null)?.trim() || null;
    const clinicId =
      (formData.get('clinicId') as string | null) || getPrimaryClinicId(sessionClaims);

    if (!clinicId) {
      return NextResponse.json({ error: 'Missing clinicId' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const uniquePart = `pf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const key = `patients/${patientId}/${uniquePart}.${ext}`;

    await uploadToR2({
      key,
      body: bytes,
      contentType: file.type || 'application/octet-stream',
    });

    // Generate a sequential file ID
    const counterResult = await db.execute(
      sql`INSERT INTO counters (key, value) VALUES ('patient_files', 1)
          ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
          RETURNING value`
    );
    const next = Number(counterResult[0]?.value ?? 1);
    const fileId = `PF-${String(next).padStart(5, '0')}`;

    const userSnap = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.uid, userId))
      .limit(1);

    await db.insert(patientFiles).values({
      fileId,
      patientId,
      clinicId,
      fileName: file.name,
      r2Key: key,
      fileType: file.type || null,
      fileSize: String(file.size),
      notes,
      visitId,
      uploadedBy: userId,
      uploadedByName: userSnap[0]?.name || 'Staff',
    });

    const created = await db
      .select()
      .from(patientFiles)
      .where(eq(patientFiles.fileId, fileId))
      .limit(1);

    return NextResponse.json({ success: true, file: created[0] }, { status: 201 });
  } catch (error) {
    console.error('Upload Patient File Error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
