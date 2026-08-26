import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { labOrders } from '@/lib/db/schema/labOrders';
import { isStaff, isSuperAdmin, isClinicAdmin } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { sessionClaims } = await auth();
  const role = sessionClaims?.role;
  if (!isStaff(sessionClaims) && role !== 'LAB_TECHNICIAN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { orderId } = await params;

  try {
    const result = await db
      .select()
      .from(labOrders)
      .where(eq(labOrders.orderId, orderId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order: result[0] });
  } catch (error) {
    console.error('Get Lab Order Error:', error);
    return NextResponse.json({ error: 'Failed to fetch lab order' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { sessionClaims, userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orderId } = await params;

  try {
    const existing = await db
      .select()
      .from(labOrders)
      .where(eq(labOrders.orderId, orderId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = existing[0];

    // Permissions: only creator doctor or SUPER_ADMIN / CLINIC_ADMIN can edit
    const isOwner = order.orderedByDoctorId === userId;
    const canEdit = isOwner || isSuperAdmin(sessionClaims) || isClinicAdmin(sessionClaims);

    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden - Only the ordering doctor or admin can edit' }, { status: 403 });
    }

    const body = await req.json();
    const {
      workDescription,
      stages,
      overallDueDate,
      visitId,
      labId,
      labName,
      workType,
      workTypeId,
      shade,
      shadeId,
      totalAmount,
      amountPaid,
    } = body;

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (workDescription !== undefined) updates.workDescription = workDescription;
    if (visitId !== undefined) updates.visitId = visitId || null;
    if (labId !== undefined) updates.labId = labId;
    if (labName !== undefined) updates.labName = labName;
    if (workType !== undefined) updates.workType = workType || null;
    if (workTypeId !== undefined) updates.workTypeId = workTypeId || null;
    if (shade !== undefined) updates.shade = shade || null;
    if (shadeId !== undefined) updates.shadeId = shadeId || null;
    if (totalAmount !== undefined) updates.totalAmount = totalAmount ? String(totalAmount) : null;
    if (amountPaid !== undefined) updates.amountPaid = amountPaid ? String(amountPaid) : null;
    if (overallDueDate !== undefined) {
      updates.overallDueDate = overallDueDate ? new Date(overallDueDate) : null;
    }

    if (stages !== undefined) {
      if (!Array.isArray(stages)) {
        return NextResponse.json({ error: 'Stages must be an array' }, { status: 400 });
      }
      const normalizedStages = stages.map((s: Record<string, unknown>, i: number) => ({
        stageId: (s.stageId as string) || `stage_${i + 1}`,
        stageName: String(s.stageName || ''),
        description: String(s.description || ''),
        deadline: (s.deadline as string) || null,
        status: (s.status as string) || 'PENDING',
        completedAt: (s.completedAt as string) || null,
        completedBy: (s.completedBy as string) || null,
        completedByName: (s.completedByName as string) || null,
        notes: (s.notes as string) || null,
        price: s.price !== undefined && s.price !== null ? String(s.price) : null,
        templateId: (s.templateId as string) || null,
      }));
      updates.stages = normalizedStages;
    }

    await db.update(labOrders).set(updates).where(eq(labOrders.orderId, orderId));

    const updated = await db
      .select()
      .from(labOrders)
      .where(eq(labOrders.orderId, orderId))
      .limit(1);

    return NextResponse.json({ success: true, order: updated[0] });
  } catch (error) {
    console.error('Update Lab Order Error:', error);
    return NextResponse.json({ error: 'Failed to update lab order' }, { status: 500 });
  }
}