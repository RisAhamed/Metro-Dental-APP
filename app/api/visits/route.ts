import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { visits } from '@/lib/db/schema/visits';
import { patients } from '@/lib/db/schema/patients';
import { canManageClinical } from '@/lib/auth/claims';
import { nextId } from '@/lib/utils/ids';
import { eq } from 'drizzle-orm';

const VISIT_TYPES = ['NEW_PROBLEM', 'FOLLOW_UP', 'EMERGENCY', 'ROUTINE'];

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!canManageClinical(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized - Clinical staff only' }, { status: 403 });
  }

  const body = await req.json();
  const {
    patientId,
    clinicId,
    visitDate,
    visitType,
    chiefComplaint,
    diagnosis,
    treatmentGiven,
    injectionGiven,
    doctorsInvolved,
    dentalChartEntries,
    vitalSigns,
    treatmentCost,
    amountPaid,
    paymentStatus,
    payments,
    fileIds,
    additionalNotes,
    nextVisitDate,
    status,
  } = body;

  if (!patientId || !clinicId) {
    return NextResponse.json(
      { error: 'Missing required fields: patientId, clinicId' },
      { status: 400 }
    );
  }

  if (visitType && !VISIT_TYPES.includes(visitType)) {
    return NextResponse.json({ error: `Invalid visit type: ${visitType}` }, { status: 400 });
  }

  try {
    // Resolve patient name
    const patientSnap = await db
      .select({ name: patients.name })
      .from(patients)
      .where(eq(patients.patientId, patientId))
      .limit(1);

    if (patientSnap.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const visitId = await nextId('visits', 'VIS-');

    const cost = treatmentCost === undefined ? 0 : Number(treatmentCost);
    const paid = amountPaid === undefined ? 0 : Number(amountPaid);
    let finalPaymentStatus = paymentStatus || 'UNPAID';
    if (paymentStatus === undefined) {
      finalPaymentStatus = paid >= cost && cost > 0 ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
    }

    await db.insert(visits).values({
      visitId,
      patientId,
      patientName: patientSnap[0].name,
      clinicId,
      visitDate: visitDate ? new Date(visitDate) : new Date(),
      visitType: visitType || 'NEW_PROBLEM',
      chiefComplaint: chiefComplaint || null,
      diagnosis: diagnosis || null,
      treatmentGiven: treatmentGiven || null,
      injectionGiven: injectionGiven ?? false,
      doctorsInvolved: doctorsInvolved || [],
      dentalChartEntries: dentalChartEntries || [],
      vitalSigns: vitalSigns || null,
      treatmentCost: String(cost),
      amountPaid: String(paid),
      paymentStatus: finalPaymentStatus,
      payments: payments || [],
      fileIds: fileIds || [],
      additionalNotes: additionalNotes || null,
      nextVisitDate: nextVisitDate ? new Date(nextVisitDate) : null,
      status: status || 'DRAFT',
      createdBy: userId,
      updatedBy: userId,
    });

    return NextResponse.json(
      { success: true, visitId, message: 'Visit created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create Visit Error:', error);
    return NextResponse.json({ error: 'Failed to create visit' }, { status: 500 });
  }
}