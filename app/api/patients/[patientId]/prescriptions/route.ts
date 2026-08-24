import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { prescriptions } from '@/lib/db/schema/prescriptions';
import { isStaff, canManageClinical } from '@/lib/auth/claims';
import { desc, eq, sql } from 'drizzle-orm';

interface DrugInput {
  drugName: string;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
}

function validateDrugs(drugs: unknown): drugs is DrugInput[] {
  return (
    Array.isArray(drugs) &&
    drugs.length > 0 &&
    drugs.every((d) => typeof d === 'object' && d !== null && !!String((d as DrugInput).drugName || '').trim())
  );
}

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
    const list = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.patientId, patientId))
      .orderBy(desc(prescriptions.date));

    return NextResponse.json({ prescriptions: list });
  } catch (error) {
    console.error('Get Prescriptions Error:', error);
    return NextResponse.json({ error: 'Failed to fetch prescriptions' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { sessionClaims, userId } = await auth();
  // Only clinical staff can write prescriptions
  if (!isStaff(sessionClaims) || !canManageClinical(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized - Clinical staff only' }, { status: 403 });
  }

  const { patientId } = await params;
  const body = await req.json();

  if (!validateDrugs(body.drugs)) {
    return NextResponse.json(
      { error: 'At least one drug with a name is required' },
      { status: 400 }
    );
  }
  if (!body.clinicId || !body.patientName) {
    return NextResponse.json({ error: 'Missing clinicId or patientName' }, { status: 400 });
  }

  try {
    const counterResult = await db.execute(
      sql`INSERT INTO counters (key, value) VALUES ('prescriptions', 1)
          ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
          RETURNING value`
    );
    const next = Number(counterResult[0]?.value ?? 1);
    const prescriptionId = `RX-${String(next).padStart(5, '0')}`;

    await db.insert(prescriptions).values({
      prescriptionId,
      patientId,
      patientName: String(body.patientName),
      clinicId: String(body.clinicId),
      date: body.date ? new Date(body.date) : new Date(),
      doctorId: body.doctorId || null,
      doctorName: body.doctorName || null,
      drugs: body.drugs.map((d: DrugInput) => ({
        drugName: String(d.drugName).trim(),
        dosage: d.dosage?.trim() || null,
        frequency: d.frequency?.trim() || null,
        duration: d.duration?.trim() || null,
        instructions: d.instructions?.trim() || null,
      })),
      notes: body.notes?.trim() || null,
      createdBy: userId,
    });

    const created = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.prescriptionId, prescriptionId))
      .limit(1);

    return NextResponse.json({ success: true, prescription: created[0] }, { status: 201 });
  } catch (error) {
    console.error('Create Prescription Error:', error);
    return NextResponse.json({ error: 'Failed to create prescription' }, { status: 500 });
  }
}
