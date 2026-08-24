import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { treatmentPlans } from '@/lib/db/schema/treatmentPlans';
import { patients } from '@/lib/db/schema/patients';
import { canManageClinical } from '@/lib/auth/claims';
import { nextId } from '@/lib/utils/ids';
import { eq, desc, and } from 'drizzle-orm';

const PLAN_STATUSES = ['DRAFT', 'ACTIVE', 'COMPLETED', 'PAUSED'];

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!canManageClinical(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized - Clinical staff only' }, { status: 403 });
  }

  const body = await req.json();
  const { patientId, clinicId, title, status, procedures, notes, shareEnabled } = body;

  if (!patientId || !clinicId) {
    return NextResponse.json(
      { error: 'Missing required fields: patientId, clinicId' },
      { status: 400 }
    );
  }

  if (status && !PLAN_STATUSES.includes(status)) {
    return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
  }

  try {
    const patientSnap = await db
      .select({ name: patients.name })
      .from(patients)
      .where(eq(patients.patientId, patientId))
      .limit(1);

    if (patientSnap.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const planId = await nextId('treatment_plans', 'PLAN-', 5);

    const procList = Array.isArray(procedures) ? procedures : [];
    const totalCost = procList.reduce((sum: number, p: { total?: number }) => sum + Number(p.total || 0), 0);
    const totalDiscount = procList.reduce((sum: number, p: { discount?: number }) => sum + Number(p.discount || 0), 0);
    const grandTotal = totalCost - totalDiscount;

    await db.insert(treatmentPlans).values({
      planId,
      patientId,
      clinicId,
      title: title || null,
      status: status || 'DRAFT',
      procedures: procList,
      totalCost: String(totalCost),
      totalDiscount: String(totalDiscount),
      grandTotal: String(grandTotal),
      notes: notes || null,
      shareEnabled: shareEnabled ?? false,
      createdBy: userId,
      updatedBy: userId,
    });

    return NextResponse.json(
      { success: true, planId, message: 'Treatment plan created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create Treatment Plan Error:', error);
    return NextResponse.json({ error: 'Failed to create treatment plan' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!canManageClinical(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get('patientId');
  const clinicId = searchParams.get('clinicId');

  try {
    const conditions = [];
    if (patientId) conditions.push(eq(treatmentPlans.patientId, patientId));
    if (clinicId) conditions.push(eq(treatmentPlans.clinicId, clinicId));

    const results = await db
      .select()
      .from(treatmentPlans)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(treatmentPlans.createdAt));

    return NextResponse.json({ plans: results });
  } catch (error) {
    console.error('Get Treatment Plans Error:', error);
    return NextResponse.json({ error: 'Failed to fetch treatment plans' }, { status: 500 });
  }
}