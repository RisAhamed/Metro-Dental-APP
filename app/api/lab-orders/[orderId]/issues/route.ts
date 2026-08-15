import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { labOrders } from '@/lib/db/schema/labOrders';
import { users } from '@/lib/db/schema/users';
import { isDoctor } from '@/lib/auth/claims';
import { eq, and } from 'drizzle-orm';
import { notifyUser } from '@/lib/notifications';
import { logActivity } from '@/lib/activity';

const ISSUE_TYPES = ['DEFECTIVE', 'RETURNED', 'ERROR', 'OTHER'] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { sessionClaims, userId } = await auth();
  if (!isDoctor(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized - Doctors only' }, { status: 403 });
  }

  const { orderId } = await params;
  const body = await req.json();
  const { issueType, message } = body;

  if (!ISSUE_TYPES.includes(issueType)) {
    return NextResponse.json({ error: 'Invalid issue type' }, { status: 400 });
  }
  if (!message || !message.trim()) {
    return NextResponse.json({ error: 'Missing message' }, { status: 400 });
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

    const doctorSnap = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.uid, userId))
      .limit(1);
    const doctorName = doctorSnap[0]?.name || 'Doctor';

    const issueId = `ISS-${Date.now()}`;
    const issues = order.issues || [];
    issues.push({
      issueId,
      issueType,
      message: message.trim(),
      status: 'OPEN',
      reportedBy: userId,
      reportedByName: doctorName,
      reportedAt: new Date().toISOString(),
      resolvedBy: null,
      resolvedByName: null,
      resolvedAt: null,
      resolutionNote: null,
    });

    await db
      .update(labOrders)
      .set({ issues, updatedAt: new Date() })
      .where(eq(labOrders.orderId, orderId));

    // Notify lab techs of this lab
    const techSnap = await db
      .select({ uid: users.uid, name: users.name })
      .from(users)
      .where(and(eq(users.labId, order.labId), eq(users.role, 'LAB_TECHNICIAN')));

    const issueLabel = issueType === 'DEFECTIVE'
      ? 'defective'
      : issueType === 'RETURNED'
      ? 'returned'
      : issueType === 'ERROR'
      ? 'error'
      : 'issue';

    for (const tech of techSnap) {
      await notifyUser({
        userId: tech.uid,
        type: 'LAB_ORDER_ISSUE',
        title: `Lab order ${orderId} flagged: ${issueLabel}`,
        message: `${doctorName}: ${message.trim()}`,
        link: `/portal/lab/orders/${orderId}`,
        clinicId: order.clinicId,
      });
    }

    await logActivity({
      clinicId: order.clinicId,
      type: 'LAB_ORDER_ISSUE_REPORTED',
      message: `${doctorName} flagged ${orderId} (${issueLabel}): ${message.trim()}`,
      userId,
      userName: doctorName,
      userRole: (sessionClaims?.role as string) || undefined,
      relatedEntityType: 'lab_order',
      relatedEntityId: orderId,
      metadata: { issueId, issueType },
    });

    return NextResponse.json({ success: true, issueId });
  } catch (error) {
    console.error('Report Lab Issue Error:', error);
    return NextResponse.json({ error: 'Failed to report issue' }, { status: 500 });
  }
}
