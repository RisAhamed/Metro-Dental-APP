import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { labOrders } from '@/lib/db/schema/labOrders';
import { users } from '@/lib/db/schema/users';
import { eq } from 'drizzle-orm';
import { notifyUser } from '@/lib/notifications';
import { logActivity } from '@/lib/activity';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string; issueId: string }> }
) {
  const { sessionClaims, userId } = await auth();
  if (sessionClaims?.role !== 'LAB_TECHNICIAN' || !userId) {
    return NextResponse.json(
      { error: 'Unauthorized - Lab technicians only' },
      { status: 403 }
    );
  }

  const { orderId, issueId } = await params;
  const body = await req.json();
  const resolutionNote = body.resolutionNote || '';

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
      .where(eq(users.uid, userId))
      .limit(1);
    const techName = techSnap[0]?.name || 'Lab Technician';

    const issues = (order.issues || []).map((i) =>
      i.issueId === issueId
        ? {
            ...i,
            status: 'RESOLVED' as const,
            resolvedBy: userId,
            resolvedByName: techName,
            resolvedAt: new Date().toISOString(),
            resolutionNote: resolutionNote || null,
          }
        : i
    );

    const updated = issues.find((i) => i.issueId === issueId);
    if (!updated || updated.status !== 'RESOLVED') {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    await db
      .update(labOrders)
      .set({ issues, updatedAt: new Date() })
      .where(eq(labOrders.orderId, orderId));

    await notifyUser({
      userId: order.orderedByDoctorId,
      type: 'LAB_ORDER_ISSUE_RESOLVED',
      title: `Issue resolved: ${orderId}`,
      message: `${techName} resolved the flagged issue${resolutionNote ? `: ${resolutionNote}` : ''}`,
      link: `/lab-orders/${orderId}`,
      clinicId: order.clinicId,
    });

    await logActivity({
      clinicId: order.clinicId,
      type: 'LAB_ORDER_ISSUE_RESOLVED',
      message: `${techName} resolved issue on ${orderId}${resolutionNote ? ` (${resolutionNote})` : ''}`,
      userId,
      userName: techName,
      userRole: 'LAB_TECHNICIAN',
      relatedEntityType: 'lab_order',
      relatedEntityId: orderId,
      metadata: { issueId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resolve Lab Issue Error:', error);
    return NextResponse.json({ error: 'Failed to resolve issue' }, { status: 500 });
  }
}
