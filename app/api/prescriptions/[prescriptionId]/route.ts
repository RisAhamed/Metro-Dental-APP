import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { prescriptions, type PrescriptionMedicine } from '@/lib/db/schema/prescriptions';
import { isStaff, canManageClinical, isSuperAdmin } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

interface DrugInput {
  drugName: string;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
}

function normalizeMedicines(body: { medicines?: unknown; drugs?: unknown }): PrescriptionMedicine[] | null {
  if (Array.isArray(body.medicines) && body.medicines.length > 0) {
    const medicines = body.medicines as Array<Partial<PrescriptionMedicine>>;
    if (medicines.some((m) => !String(m.drugName || '').trim())) return null;
    return medicines.map((m) => ({
      drugName: String(m.drugName).trim(),
      strength: m.strength ? String(m.strength).trim() : null,
      strengthUnit: m.strengthUnit ? String(m.strengthUnit).trim() : null,
      duration: m.duration ? String(m.duration).trim() : null,
      durationUnit: m.durationUnit ? String(m.durationUnit).trim() : null,
      morning: m.morning ? String(m.morning).trim() : null,
      noon: m.noon ? String(m.noon).trim() : null,
      night: m.night ? String(m.night).trim() : null,
      beforeAfterFood: m.beforeAfterFood ? String(m.beforeAfterFood).trim() : null,
      instruction: m.instruction ? String(m.instruction).trim() : null,
    }));
  }

  const drugs = body.drugs as DrugInput[] | undefined;
  if (!Array.isArray(drugs) || drugs.length === 0 || drugs.some((d) => !String(d?.drugName || '').trim())) {
    return null;
  }
  return drugs.map((d) => ({
    drugName: String(d.drugName).trim(),
    strength: d.dosage?.trim() || null,
    strengthUnit: null,
    duration: d.duration?.trim() || null,
    durationUnit: null,
    morning: null,
    noon: null,
    night: null,
    beforeAfterFood: null,
    instruction: d.instructions?.trim() || d.frequency?.trim() || null,
  }));
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

  const medicines = normalizeMedicines(body);
  if (!medicines) {
    return NextResponse.json(
      { error: 'At least one medicine with a name is required' },
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
        drugs: medicines.map((m) => ({
          drugName: m.drugName,
          dosage: [m.strength, m.strengthUnit].filter(Boolean).join(' ') || null,
          frequency: [m.morning, m.noon, m.night].some(Boolean)
            ? [m.morning || '0', m.noon || '0', m.night || '0'].join('-')
            : null,
          duration: [m.duration, m.durationUnit].filter(Boolean).join(' ') || m.duration,
          instructions: m.instruction,
        })),
        medicines,
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
  if (!isStaff(sessionClaims) || !isSuperAdmin(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized - Super admin only' }, { status: 403 });
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
