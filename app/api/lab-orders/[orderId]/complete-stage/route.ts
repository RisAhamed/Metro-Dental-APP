import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { labOrders } from '@/lib/db/schema/labOrders';
import { labBilling as labBillingTable } from '@/lib/db/schema/labBilling';
import { users } from '@/lib/db/schema/users';
import { eq } from 'drizzle-orm';
import { notifyUser } from '@/lib/notifications';
import { logActivity } from '@/lib/activity';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { sessionClaims, userId } = await auth();
  const role = sessionClaims?.role || '';

  // Only lab technicians can mark stages complete
  if (role !== 'LAB_TECHNICIAN') {
    return NextResponse.json(
      { error: 'Unauthorized - Lab technicians only' },
      { status: 403 }
    );
  }

  const { orderId } = await params;
  const body = await req.json();
  const { stageId, stageCost, notes } = body;

  if (!stageId) {
    return NextResponse.json({ error: 'Missing stageId' }, { status: 400 });
  }

  try {
    const orderSnap = await db
      .select()
      .from(labOrders)
      .where(eq(labOrders.orderId, orderId))
      .limit(1);
    if (orderSnap.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderSnap[0];
    const techSnap = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.uid, userId || ''))
      .limit(1);
    const labTechName = techSnap[0]?.name || 'Lab Technician';

    const orderStages = order.stages ?? [];
    const stage = orderStages.find((s) => s.stageId === stageId);
    if (!stage) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 400 });
    }
    if (stage.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Stage already completed' }, { status: 409 });
    }

    // Update stage status and price if provided
    const updatedStages = orderStages.map((s) => {
      if (s.stageId === stageId) {
        return {
          ...s,
          status: 'COMPLETED' as const,
          completedAt: new Date().toISOString(),
          completedBy: userId,
          completedByName: labTechName,
          notes: notes || s.notes,
          price: stageCost !== undefined && stageCost !== null ? String(stageCost) : s.price ?? null,
        };
      }
      return s;
    });

    // Compute new totalAmount from stage prices
    const newTotalAmount = updatedStages.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

    // Check if all stages are complete
    const allDone = updatedStages.every((s) => s.status === 'COMPLETED');

    await db
      .update(labOrders)
      .set({
        stages: updatedStages,
        status: allDone ? 'COMPLETED' : 'IN_PROGRESS',
        totalAmount: newTotalAmount ? String(newTotalAmount) : null,
        updatedAt: new Date(),
      })
      .where(eq(labOrders.orderId, orderId));

    // Update billing stage cost if provided
    if (stageCost !== undefined && stageCost !== null) {
      const billingSnap = await db
        .select()
        .from(labBillingTable)
        .where(eq(labBillingTable.orderId, orderId))
        .limit(1);

      if (billingSnap.length > 0) {
        const billing = billingSnap[0];
        const existing = (billing.stageCosts ?? []).filter((c) => c.stageId !== stageId);
        const costs = [...existing, { stageId, stageName: stage.stageName, cost: Number(stageCost) }];
        const totalCost = costs.reduce((sum, c) => sum + (c.cost || 0), 0);
        await db
          .update(labBillingTable)
          .set({ stageCosts: costs, totalCost: String(totalCost), updatedAt: new Date() })
          .where(eq(labBillingTable.orderId, orderId));
      }
    }

    // Notify ordering doctor
    await notifyUser({
      userId: order.orderedByDoctorId,
      type: 'LAB_STAGE_COMPLETED',
      title: `Lab stage completed: ${stage.stageName}`,
      message: `Stage for patient ${order.patientName} completed by ${order.labName}`,
      link: `/lab-orders/${orderId}`,
      clinicId: order.clinicId,
    });

    await logActivity({
      clinicId: order.clinicId,
      type: 'LAB_STAGE_COMPLETED',
      message: `Stage "${stage.stageName}" completed for lab order ${orderId} (${order.labName}, patient ${order.patientName})`,
      userId: userId || '',
      userName: labTechName,
      userRole: role,
      relatedEntityType: 'lab_order',
      relatedEntityId: orderId,
      metadata: { stageId, stageName: stage.stageName, stageCost: stageCost ?? null },
    });

    return NextResponse.json({
      success: true,
      orderStatus: allDone ? 'COMPLETED' : 'IN_PROGRESS',
    });
  } catch (error) {
    console.error('Complete Stage Error:', error);
    return NextResponse.json({ error: 'Failed to complete stage' }, { status: 500 });
  }
}