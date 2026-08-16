import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { visits } from '@/lib/db/schema/visits';
import { canViewClinical, canManageClinical, isReceptionist } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

const VISIT_TYPES = ['NEW_PROBLEM', 'FOLLOW_UP', 'EMERGENCY', 'ROUTINE'];
const VISIT_STATUSES = ['DRAFT', 'COMPLETED'];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  const { sessionClaims } = await auth();
  if (!canViewClinical(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { visitId } = await params;

  try {
    const result = await db
      .select()
      .from(visits)
      .where(eq(visits.visitId, visitId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    return NextResponse.json({ visit: result[0] });
  } catch (error) {
    console.error('Get Visit Error:', error);
    return NextResponse.json({ error: 'Failed to fetch visit' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  const { sessionClaims, userId } = await auth();
  const canFullEdit = canManageClinical(sessionClaims);
  const canBillingEdit = isReceptionist(sessionClaims);
  if ((!canFullEdit && !canBillingEdit) || !userId) {
    return NextResponse.json({ error: 'Unauthorized - No permission to edit sessions' }, { status: 403 });
  }

  const { visitId } = await params;
  const body = await req.json();

  if (body.visitType && !VISIT_TYPES.includes(body.visitType)) {
    return NextResponse.json({ error: `Invalid visit type: ${body.visitType}` }, { status: 400 });
  }
  if (body.status && !VISIT_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: `Invalid status: ${body.status}` }, { status: 400 });
  }

  // Receptionists may only update billing/payment fields
  if (canBillingEdit && !canFullEdit) {
    const billingOnly = ['treatmentCost', 'amountPaid', 'paymentStatus', 'payments'];
    const blocked = Object.keys(body).filter((k) => !billingOnly.includes(k));
    if (blocked.length > 0) {
      return NextResponse.json(
        { error: 'Receptionists can only update billing/payment fields' },
        { status: 403 }
      );
    }
  }

  try {
    const existing = await db
      .select()
      .from(visits)
      .where(eq(visits.visitId, visitId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    const prev = existing[0];
    const cost = body.treatmentCost === undefined ? Number(prev.treatmentCost) : Number(body.treatmentCost);
    const paid = body.amountPaid === undefined ? Number(prev.amountPaid) : Number(body.amountPaid);
    let finalPaymentStatus = body.paymentStatus || prev.paymentStatus || 'UNPAID';
    if (!body.paymentStatus) {
      finalPaymentStatus = paid >= cost && cost > 0 ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: userId,
    };

    if (canFullEdit) {
      updates.visitDate = body.visitDate ? new Date(body.visitDate) : prev.visitDate;
      updates.visitType = body.visitType || prev.visitType;
      updates.chiefComplaint = body.chiefComplaint !== undefined ? body.chiefComplaint : prev.chiefComplaint;
      updates.diagnosis = body.diagnosis !== undefined ? body.diagnosis : prev.diagnosis;
      updates.treatmentGiven = body.treatmentGiven !== undefined ? body.treatmentGiven : prev.treatmentGiven;
      updates.injectionGiven = body.injectionGiven !== undefined ? body.injectionGiven : prev.injectionGiven;
      updates.doctorsInvolved = body.doctorsInvolved !== undefined ? body.doctorsInvolved : prev.doctorsInvolved;
      updates.dentalChartEntries = body.dentalChartEntries !== undefined ? body.dentalChartEntries : prev.dentalChartEntries;
      updates.vitalSigns = body.vitalSigns !== undefined ? body.vitalSigns : prev.vitalSigns;
      updates.fileIds = body.fileIds !== undefined ? body.fileIds : prev.fileIds;
      updates.additionalNotes = body.additionalNotes !== undefined ? body.additionalNotes : prev.additionalNotes;
      updates.nextVisitDate = body.nextVisitDate !== undefined ? (body.nextVisitDate ? new Date(body.nextVisitDate) : null) : prev.nextVisitDate;
      updates.status = body.status || prev.status;
    }

    updates.treatmentCost = String(cost);
    updates.amountPaid = String(paid);
    updates.paymentStatus = finalPaymentStatus;
    updates.payments = body.payments !== undefined ? body.payments : prev.payments;

    await db
      .update(visits)
      .set(updates)
      .where(eq(visits.visitId, visitId));

    const updated = await db
      .select()
      .from(visits)
      .where(eq(visits.visitId, visitId))
      .limit(1);

    return NextResponse.json({ success: true, visit: updated[0] });
  } catch (error) {
    console.error('Update Visit Error:', error);
    return NextResponse.json({ error: 'Failed to update visit' }, { status: 500 });
  }
}