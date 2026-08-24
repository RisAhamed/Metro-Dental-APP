import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { prescriptions } from '@/lib/db/schema/prescriptions';
import { isStaff, canManageClinical } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

interface DrugInput {
  drugName: string;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ prescriptionId: string }> }
) {
  const { sessionClaims, userId } = await auth();
  if (!isStaff(sessionClaims) || !canManageClinical(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized - Clinical staff only' }, { status: 403 });
  }

  const { prescriptionId } = await params;
  const body = await req.json();

  const drugs = body.drugs as DrugInput[] | undefined;
  if (
    !Array.isArray(drugs) ||
    drugs.length === 0 ||
    drugs.some((d) => !d || !String(d.drugName || '').trim())
  ) {
    return NextResponse.json(
      { error: 'At least one drug with a name is required' },
      { status: 400 }
    );
  }

  try {
    const existing = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.prescriptionId, prescriptionId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
    }

    await db
      .update(prescriptions)
      .set({
        date: body.date ? new Date(body.date) : existing[0].date,
        doctorId: body.doctorId !== undefined ? body.doctorId || null : existing[0].doctorId,
        doctorName:
          body.doctorName !== undefined ? body.doctorName || null : existing[0].doctorName,
        drugs: drugs.map((d) => ({
          drugName: String(d.drugName).trim(),
          dosage: d.dosage?.trim() || null,
          frequency: d.frequency?.trim() || null,
          duration: d.duration?.trim() || null,
          instructions: d.instructions?.trim() || null,
        })),
        notes: body.notes !== undefined ? body.notes?.trim() || null : existing[0].notes,
        updatedAt: new Date(),
      })
      .where(eq(prescriptions.prescriptionId, prescriptionId));

    const updated = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.prescriptionId, prescriptionId))
      .limit(1);

    return NextResponse.json({ success: true, prescription: updated[0] });
  } catch (error) {
    console.error('Update Prescription Error:', error);
    return NextResponse.json({ error: 'Failed to update prescription' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ prescriptionId: string }> }
) {
  const { sessionClaims } = await auth();
  if (!isStaff(sessionClaims) || !canManageClinical(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized - Clinical staff only' }, { status: 403 });
  }

  const { prescriptionId } = await params;

  try {
    const result = await db
      .delete(prescriptions)
      .where(eq(prescriptions.prescriptionId, prescriptionId))
      .returning({ id: prescriptions.prescriptionId });

    if (result.length === 0) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Prescription Error:', error);
    return NextResponse.json({ error: 'Failed to delete prescription' }, { status: 500 });
  }
}
