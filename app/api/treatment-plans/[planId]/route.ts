import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { treatmentPlans } from '@/lib/db/schema/treatmentPlans';
import { canViewClinical, canManageClinical } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

const PLAN_STATUSES = ['DRAFT', 'ACTIVE', 'COMPLETED', 'PAUSED'];

type PlanProcedureItem = NonNullable<
  typeof treatmentPlans.$inferSelect['procedures']
>[number];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { sessionClaims } = await auth();
  if (!canViewClinical(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { planId } = await params;

  try {
    const result = await db
      .select()
      .from(treatmentPlans)
      .where(eq(treatmentPlans.planId, planId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: 'Treatment plan not found' }, { status: 404 });
    }

    return NextResponse.json({ plan: result[0] });
  } catch (error) {
    console.error('Get Treatment Plan Error:', error);
    return NextResponse.json({ error: 'Failed to fetch treatment plan' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { sessionClaims, userId } = await auth();
  if (!canManageClinical(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized - Clinical staff only' }, { status: 403 });
  }

  const { planId } = await params;
  const body = await req.json();

  if (body.status && !PLAN_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: `Invalid status: ${body.status}` }, { status: 400 });
  }

  try {
    const existing = await db
      .select()
      .from(treatmentPlans)
      .where(eq(treatmentPlans.planId, planId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Treatment plan not found' }, { status: 404 });
    }

    const prev = existing[0];
    const procList: PlanProcedureItem[] =
      body.procedures !== undefined
        ? (body.procedures as PlanProcedureItem[]).map((p) => ({
            ...p,
            status: p.status || 'PENDING',
          }))
        : (prev.procedures || []);

    // Validate COMPLETED plan requires all procedures COMPLETED
    if (body.status === 'COMPLETED' && procList.length > 0) {
      const allCompleted = procList.every((p) => p.status === 'COMPLETED');
      if (!allCompleted) {
        return NextResponse.json(
          { error: 'Cannot mark plan as COMPLETED while procedures are still pending. Mark all procedures as COMPLETED first.' },
          { status: 400 }
        );
      }
    }

    // Auto-manage plan status: COMPLETED when every procedure is COMPLETED;
    // ACTIVE when at least one procedure has progressed.
    let planStatus = body.status || prev.status;
    if (procList.length > 0) {
      const allCompleted = procList.every((p) => p.status === 'COMPLETED');
      const anyProgressed = procList.some(
        (p) => p.status === 'COMPLETED' || p.status === 'IN_PROGRESS'
      );
      if (allCompleted && !body.status) planStatus = 'COMPLETED';
      else if (anyProgressed && !body.status && prev.status === 'DRAFT') planStatus = 'ACTIVE';
    }
    const totalCost = procList.reduce((sum, p) => sum + Number(p.total || 0), 0);
    const totalDiscount = procList.reduce((sum, p) => sum + Number(p.discount || 0), 0);
    const grandTotal = totalCost - totalDiscount;

    await db
      .update(treatmentPlans)
      .set({
        title: body.title !== undefined ? body.title : prev.title,
        status: planStatus,
        procedures: procList,
        totalCost: String(totalCost),
        totalDiscount: String(totalDiscount),
        grandTotal: String(grandTotal),
        notes: body.notes !== undefined ? body.notes : prev.notes,
        shareEnabled: body.shareEnabled !== undefined ? body.shareEnabled : prev.shareEnabled,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(treatmentPlans.planId, planId));

    const updated = await db
      .select()
      .from(treatmentPlans)
      .where(eq(treatmentPlans.planId, planId))
      .limit(1);

    return NextResponse.json({ success: true, plan: updated[0] });
  } catch (error) {
    console.error('Update Treatment Plan Error:', error);
    return NextResponse.json({ error: 'Failed to update treatment plan' }, { status: 500 });
  }
}